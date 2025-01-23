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

export const executePlan = inngest.createFunction(
  { id: "execute-plan" },
  { event: "ai-agent/execute-plan" },
  async ({ event, step }: { event: ExecutePlanEvent; step: any }) => {
    const { validatedPlan: plan, contextData, prompt, organization, ontology, customNodeTypeNames } = event.data;

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

NODE ID MAPPING:
The contextData contains information about existing nodes, including their IDs. When creating relationships:
- Use the 'id' field from the node's metadata for fromNodeId and toNodeId
- Do NOT use ontologyId or any other ID field
- Only create relationships between nodes that exist in the contextData
- Verify both node IDs exist before calling create_relationship
- If a needed node doesn't exist yet, create it first with create_node

Example contextData node structure:
{
  "id": "node_uuid",
  "metadata": {
    "id": "actual_node_id",  // Use this ID for relationships
    "name": "Node Name",
    "nodeType": "Node Type",
    "type": "NODE" | "RELATIONSHIP"
  }
}

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

RELATIONSHIP CREATION CHECKLIST:
1. Identify the source node (from) and target node (to) in the contextData
2. Extract the correct 'id' from their metadata
3. Verify both IDs exist
4. Use these IDs as fromNodeId and toNodeId
5. Specify a clear relationType

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

If this is a create_node operation, please use the create_node function to execute it.
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

      // Then handle any tool calls in a separate step
      const executionResponse = await step.run(`execute-action-${currentStep}`, async () => {
        let operationAttempted = false;
        let toolCallResult = null;

        // Handle tool calls if present
        if (analysisResponse.tool_calls && analysisResponse.tool_calls.length > 0) {
          for (const toolCall of analysisResponse.tool_calls) {
            try {
              const params = JSON.parse(toolCall.function.arguments);

              if (toolCall.function.name === "create_node") {
                // Validate node type
                if (!customNodeTypeNames.includes(params.type)) {
                  throw new Error(`Invalid node type "${params.type}". Allowed types are: ${customNodeTypeNames.join(", ")}`);
                }

                operationAttempted = true;
                toolCallResult = {
                  success: true,
                  params,
                  toolCall,
                  operationType: "create_node"
                };

                return {
                  shouldExecute: true,
                  operationType: "create_node",
                  params,
                  action,
                  analysis: analysisResponse.analysis,
                  operationAttempted,
                  toolCallResult,
                  stepNumber: currentStep,
                  tool_calls: analysisResponse.tool_calls
                };
              } else if (toolCall.function.name === "create_relationship") {
                operationAttempted = true;
                toolCallResult = {
                  success: true,
                  params,
                  toolCall,
                  operationType: "create_relationship"
                };

                return {
                  shouldExecute: true,
                  operationType: "create_relationship",
                  params,
                  action,
                  analysis: analysisResponse.analysis,
                  operationAttempted,
                  toolCallResult,
                  stepNumber: currentStep,
                  tool_calls: analysisResponse.tool_calls
                };
              }
            } catch (error) {
              toolCallResult = {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                toolCall
              };
              console.error("Error executing tool call:", error);
            }
          }
        }

        return {
          shouldExecute: false,
          action,
          analysis: analysisResponse.analysis,
          operationAttempted,
          toolCallResult,
          stepNumber: currentStep,
          tool_calls: analysisResponse.tool_calls
        };
      });

      // Execute the appropriate tool based on the operation type
      if (executionResponse.shouldExecute) {
        if (executionResponse.operationType === "create_node") {
          await step.sendEvent("execute-create-node", {
            name: "ai-agent/tools/create-node",
            data: {
              type: executionResponse.params.type,
              name: executionResponse.params.name,
              description: executionResponse.params.description,
              organization,
              ontology,
              customNodeTypeNames
            },
          });
        } else if (executionResponse.operationType === "create_relationship") {
          await step.sendEvent("execute-create-relationship", {
            name: "ai-agent/tools/create-relationship",
            data: {
              fromNodeId: executionResponse.params.fromNodeId,
              toNodeId: executionResponse.params.toNodeId,
              relationType: executionResponse.params.relationType,
              organization,
              ontology
            },
          });
        }
      }

      executionResults.push(executionResponse);
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
