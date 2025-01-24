import { inngest } from "../../inngest-client";
import { openAIService } from "../../../services/openai";
import { Organization, Ontology } from "@prisma/client";

interface ExecutePlanEvent {
  data: {
    validatedPlan: PlanningResponse;
    contextData: Array<{
      type: string;
      content: string;
      score: number;
    }>;
    prompt: string;
    organization: Organization;
    ontology: Ontology;
    customNodeTypeNames: string[];
  };
}

interface PlanningResponse {
  intent: "QUERY" | "MODIFICATION";
  analysis: string;
  contextDataObservations: string;
  proposedActions: string[];
  requiredTools: string[];
}

interface NodeCreationResult {
  id: string;
  name: string;
  type: string;
  success: boolean;
}

export const executePlan = inngest.createFunction(
  { id: "execute-plan" },
  { event: "ai-agent/execute-plan" },
  async ({ event, step }: { event: ExecutePlanEvent; step: any }) => {
    const { validatedPlan: plan, contextData, prompt, organization, ontology, customNodeTypeNames } = event.data;

    // Track created nodes for relationship creation
    const createdNodes: Record<string, NodeCreationResult> = {};

		const tools = [
			{
				type: "function",
				function: {
					name: "create_node",
					description: "Create a new node in the ontology.",
					parameters: {
						type: "object",
						properties: {
							type: {
								type: "string",
								description: `The type of node to create (must be one of the allowed types: ${customNodeTypeNames.join(", ")})`
							},
							name: {
								type: "string",
								description: "A clear, descriptive name for the node"
							},
							description: {
								type: "string",
								description: "Detailed explanation of the node's purpose and context"
							}
						},
						required: ["type", "name", "description"],
						additionalProperties: false
					},
					strict: true
				}
			},
			{
				type: "function",
				function: {
					name: "create_relationship",
					description: "Create a relationship between two existing nodes. Relationships must have a uuid for fromNodeId and toNodeId",
					parameters: {
						type: "object",
						properties: {
							fromNodeId: {
								type: "string",
								description: "uuid of the source node"
							},
							toNodeId: {
								type: "string",
								description: "uuid of the target node"
							},
							relationType: {
								type: "string",
								description: "Type of relationship between the nodes (e.g., 'owns', 'manages', 'implements')"
							}
						},
						required: ["fromNodeId", "toNodeId", "relationType"],
						additionalProperties: false
					},
					strict: true
				}
			}
		];

    const systemPrompt = `You are an AI agent responsible for executing a planned sequence of operations on an ontology system.
Your task is to analyze the provided plan and context, then execute the appropriate tools to implement the changes.

ORIGINAL USER REQUEST:
${prompt}

CONTEXT DATA ANALYSIS:
${plan.contextDataObservations}

VALIDATED PLAN ANALYSIS:
${plan.analysis}

CURRENT CAPABILITIES:
- You can create new nodes using the create_node tool
- You can create relationships between nodes using the create_relationship tool

AVAILABLE NODE TYPES:
${customNodeTypeNames.join(", ")}

CONTEXT DATA STRUCTURE:
Each context item has one of two possible metadata structures:

For NODE type:
{
  "metadata": {
    "id": "uuid",  // Use this uuid for identifying nodes in relationships
    "name": "Node Name",
    "nodeType": "Node Type",  // Type of the node (e.g., "People", "Organization")
    "ontologyId": "uuid",
    "type": "NODE"
  },
  "score": 0.95  // Relevance score
}

For RELATIONSHIP type:
{
  "metadata": {
    "id": "uuid",
    "fromNodeId": "uuid",  // ID of the source node
    "fromNodeName": "Source Node Name",
    "fromNodeType": "Source Node Type",
    "toNodeId": "uuid",  // ID of the target node
    "toNodeName": "Target Node Name",
    "toNodeType": "Target Node Type",
    "relationType": "Type of Relationship",  // e.g., "owns", "manages"
    "content": "Relationship Description",
    "type": "RELATIONSHIP"
  },
  "score": 0.95  // Relevance score
}

RELATIONSHIP CREATION GUIDELINES:
1. When creating relationships:
   - Use the 'id' field from NODE type metadata for fromNodeId and toNodeId
   - Do NOT use ontologyId or any other ID field
   - Only create relationships between nodes that exist in the contextData
   - Verify both node IDs exist before calling create_relationship
   - If a needed node doesn't exist yet, create it first with create_node

2. Example relationship creation:
   - Find source node in contextData (type: "NODE")
   - Use its metadata.id as fromNodeId
   - Find target node in contextData (type: "NODE")
   - Use its metadata.id as toNodeId
   - Specify an appropriate relationType

3. Existing relationships:
   - Check RELATIONSHIP type records in contextData
   - Use them to understand existing connections
   - Avoid creating duplicate relationships
   - Reference their structure for creating similar relationships

YOUR RESPONSIBILITIES:
1. For each proposed action:
   - For node creation:
     * Validate the node type is allowed
     * Ensure the node name and description are appropriate
     * Call the create_node function with proper parameters
   - For relationship creation:
     * Find the correct node IDs in the contextData
     * Verify both nodes exist by checking their metadata.id fields
     * Use appropriate relationship types
     * Call the create_relationship function with the correct node IDs
     * If a node is missing, create it first before creating the relationship
2. For any proposed actions that aren't yet supported:
   - Acknowledge them but skip execution
   - Note them as "pending future implementation"

EXECUTION GUIDELINES:
1. Consider the original user request and context when creating nodes and relationships
2. Use the context data to inform decisions and find correct node IDs
3. Ensure node names are clear and descriptive
4. Provide detailed descriptions that explain the node's purpose
5. Only use allowed node types
6. Use meaningful relationship types
7. Double-check node IDs before creating relationships
8. Skip any operations that aren't create_node or create_relationship

Remember: Only proceed with node and relationship creation operations. All other operations should be noted but skipped.`;

    // Execute the plan
    const executionResults = [];
    let currentStep = 1;

    for (const action of plan.proposedActions) {
      // First analyze the action
      const analysisResponse = await step.run(`analyze-action-${currentStep}`, async () => {
        const actionAnalysis = await openAIService.generateChatCompletion([
          { role: "system", content: systemPrompt },
          { role: "user", content: `
Current Action: ${action}

Available Context:
${JSON.stringify(contextData, null, 2)}

Previous Results: ${JSON.stringify(executionResults, null, 2)}

Created Nodes (Use these IDs for relationships):
${JSON.stringify(createdNodes, null, 2)}

If this is a create_node operation, use the create_node function.
If this is a create_relationship operation, ensure you use the correct node IDs from either:
1. Existing nodes in contextData
2. Recently created nodes listed above

Otherwise, explain why the action cannot be executed.
` }
        ], { 
          temperature: 0.2,
          model: "gpt-4o-2024-08-06",
          tools,
          tool_choice: "auto"
        });

        return {
          analysis: actionAnalysis.content,
          tool_calls: actionAnalysis.tool_calls
        };
      });

      // Analyze tool calls and prepare execution data
      const toolCallAnalysis = await step.run(`prepare-action-${currentStep}`, async () => {
        let operationAttempted = false;
        let toolCallResult = null;
        let executionData = null;

        if (analysisResponse.tool_calls?.length > 0) {
          for (const toolCall of analysisResponse.tool_calls) {
            try {
              const params = JSON.parse(toolCall.function.arguments);

              if (toolCall.function.name === "create_node") {
                if (!customNodeTypeNames.includes(params.type)) {
                  throw new Error(`Invalid node type "${params.type}". Allowed types are: ${customNodeTypeNames.join(", ")}`);
                }

                operationAttempted = true;
                executionData = {
                  type: "create_node",
                  params: {
                    type: params.type,
                    name: params.name,
                    description: params.description,
                  }
                };
              } else if (toolCall.function.name === "create_relationship") {
                const fromNode = findNodeById(params.fromNodeId, contextData, createdNodes);
                const toNode = findNodeById(params.toNodeId, contextData, createdNodes);

                if (!fromNode || !toNode) {
                  throw new Error(
                    `Unable to find nodes for relationship. ` +
                    `From Node (${params.fromNodeId}): ${fromNode ? 'Found' : 'Not Found'}. ` +
                    `To Node (${params.toNodeId}): ${toNode ? 'Found' : 'Not Found'}`
                  );
                }

                operationAttempted = true;
                executionData = {
                  type: "create_relationship",
                  params: {
                    fromNodeId: fromNode.id,
                    toNodeId: toNode.id,
                    relationType: params.relationType
                  }
                };
              }

              toolCallResult = {
                success: true,
                params,
                toolCall
              };
            } catch (error) {
              toolCallResult = {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                toolCall
              };
              console.error("Error analyzing tool call:", error);
            }
          }
        }

        return {
          operationAttempted,
          toolCallResult,
          executionData
        };
      });

      // Execute the prepared action
      let executionResult;
      if (toolCallAnalysis.executionData) {
        if (toolCallAnalysis.executionData.type === "create_node") {
          const nodeResult = await step.sendEvent("execute-create-node", {
            name: "ai-agent/tools/create-node",
            data: {
              ...toolCallAnalysis.executionData.params,
              organization,
              ontology,
              customNodeTypeNames
            },
          });

          if (nodeResult?.data?.success && nodeResult?.data?.data?.id) {
            createdNodes[toolCallAnalysis.executionData.params.name] = {
              id: nodeResult.data.data.id,
              name: toolCallAnalysis.executionData.params.name,
              type: toolCallAnalysis.executionData.params.type,
              success: true
            };
          }

          executionResult = nodeResult;
        } else if (toolCallAnalysis.executionData.type === "create_relationship") {
          executionResult = await step.sendEvent("execute-create-relationship", {
            name: "ai-agent/tools/create-relationship",
            data: {
              ...toolCallAnalysis.executionData.params,
              organization,
              ontology
            },
          });
        }
      }

      executionResults.push({
        action,
        analysis: analysisResponse.analysis,
        toolCallAnalysis,
        executionResult,
        stepNumber: currentStep,
        createdNodes: { ...createdNodes }
      });

      currentStep++;
    }

    // Get final summary from AI
    const finalSummary = await step.run("generate-summary", async () => {
      const summaryResponse = await openAIService.generateChatCompletion([
        { role: "system", content: systemPrompt },
        { role: "user", content: `
Please provide a final summary of the execution:

Original Plan:
${JSON.stringify(plan, null, 2)}

Execution Results:
${JSON.stringify(executionResults, null, 2)}

Summarize what was completed and what remains to be implemented in future versions.
` }
      ], { temperature: 0.2 });

      return summaryResponse.content;
    });

    return {
      success: true,
      executionResults,
      summary: finalSummary
    };
  }
);

// Helper function to find node by ID or name in context or created nodes
function findNodeById(
  idOrName: string, 
  contextData: any[], 
  createdNodes: Record<string, NodeCreationResult>
): { id: string; name: string } | null {
  // First check if it's a name in createdNodes (prioritize newly created nodes)
  const createdNode = Object.values(createdNodes).find(node => 
    node.name.toLowerCase() === idOrName.toLowerCase()
  );
  if (createdNode) {
    return { id: createdNode.id, name: createdNode.name };
  }

  // Then check contextData for existing nodes
  const contextNode = contextData.find(item => 
    item.metadata.type === "NODE" && (
      item.metadata.id === idOrName || 
      item.metadata.name.toLowerCase() === idOrName.toLowerCase()
    )
  );
  if (contextNode) {
    return { id: contextNode.metadata.id, name: contextNode.metadata.name };
  }

  // Finally check if it's an ID in createdNodes
  const createdNodeById = Object.values(createdNodes).find(node => 
    node.id === idOrName
  );
  if (createdNodeById) {
    return { id: createdNodeById.id, name: createdNodeById.name };
  }

  return null;
}
