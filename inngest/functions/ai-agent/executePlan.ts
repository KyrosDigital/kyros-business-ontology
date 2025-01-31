import { inngest } from "../../inngest-client";
import { openAIService } from "../../../services/openai";
import { Organization, Ontology } from "@prisma/client";
import { analyzeActionUserPrompt, executePlanSystemPrompt, generateSummaryUserPrompt } from "@/prompts/openai";
import { PineconeResult, NodeMetadata, RelationshipMetadata } from "./queryPinecone";
import { vectorSearch } from "./tools/vector_search";
import { createNodeTool } from "./tools/create_node";
import { createRelationshipTool } from "./tools/create_relationship";

interface ExecutePlanEvent {
  data: {
    validatedPlan: PlanningResponse;
    contextData: PineconeResult[];
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

// Add new interface for relationship tracking
interface RelationshipCreationResult {
  id: string;
  fromNodeId: string;
  fromNodeName: string;
  toNodeId: string;
  toNodeName: string;
  relationType: string;
  success: boolean;
}

interface ExecutionResult {
  action?: string;
  analysis: string;
  toolCallAnalysis?: {
    operationAttempted: boolean;
    toolCallResult: {
      success: boolean;
      params: any;
      toolCall: any;
      error?: string;
    } | null;
    executionData: {
      type: "create_node" | "create_relationship" | "vector_search";
      params: any;
    } | null;
  };
  executionResult?: any;
  stepNumber: number;
  createdNodes?: Record<string, NodeCreationResult>;
  createdRelationships?: RelationshipCreationResult[];  // Add this
  summary?: {
    content: string;
    success: boolean;
    reason: string;
  };
  isFinal?: boolean;
}

export const executePlan = inngest.createFunction(
  { id: "execute-plan" },
  { event: "ai-agent/execute-plan" },
  async ({ event, step }: { event: ExecutePlanEvent; step: any }) => {
    const { validatedPlan: plan, contextData, prompt, organization, ontology, customNodeTypeNames, userId } = event.data;

    // Track created nodes for relationship creation
    const createdNodes: Record<string, NodeCreationResult> = {};
    
    // Track created relationships to avoid duplicates
    const createdRelationships: RelationshipCreationResult[] = [];
    
    // Track the most recent search results
    let searchedContextData: PineconeResult[] = [];

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
			},
			{
				type: "function",
				function: {
					name: "generate_summary",
					description: "Generate a final summary when the mission is complete. Call this when all necessary actions have been taken.",
					parameters: {
						type: "object",
						properties: {
							success: {
								type: "boolean",
								description: "Whether the mission was successful"
							},
							reason: {
								type: "string",
								description: "Explanation of why the mission is complete or why it failed"
							}
						},
						required: ["success", "reason"],
						additionalProperties: false
					},
					strict: true
				}
			},
			{
				type: "function",
				function: {
					name: "vector_search",
					description: "Search for context in the vector database. Use a larger topK for broader context, smaller for specific searches.",
					parameters: {
						type: "object",
						properties: {
							query: {
								type: "string",
								description: "Detailed description of what information you're looking for"
							},
							topK: {
								type: "number",
								description: "Number of results to return. Use 5-10 for specific searches, 50-75 for broader context",
							}
						},
						required: ["query", "topK"],
						additionalProperties: false
					},
					strict: true
				}
			}
		];

    const systemPrompt: string = executePlanSystemPrompt(prompt, plan, customNodeTypeNames)

    // Execute the plan
    let isComplete = false;
    let currentStep = 1;
    const executionResults: ExecutionResult[] = [];

    while (!isComplete && currentStep <= 100) { // Add safety limit of 10 steps
      // First analyze the next action
      const analysisResponse = await step.run(`analyze-action-${currentStep}`, async () => {
				const userFeedback = ''
				const userFeedbackContextData = []
        const actionAnalysis = await openAIService.generateChatCompletion([
          { role: "system", content: systemPrompt },
          { role: "user", content: analyzeActionUserPrompt(
            plan.proposedActions[currentStep - 1], 
            contextData, 
            executionResults, 
            createdNodes,
						createdRelationships, 
            searchedContextData,
            userFeedback, 
            userFeedbackContextData
          ) }
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

      // Check if the AI wants to generate summary (mission complete)
      if (analysisResponse.tool_calls?.some(call => call.function.name === "generate_summary")) {
        const summaryCall = analysisResponse.tool_calls.find(call => call.function.name === "generate_summary");
        const summaryParams = JSON.parse(summaryCall!.function.arguments);
        
        // Generate final summary
        const finalSummary = await step.run("generate-summary", async () => {
          const summaryResponse = await openAIService.generateChatCompletion([
            { role: "system", content: systemPrompt },
            { role: "user", content: generateSummaryUserPrompt(plan, executionResults)}
          ], { temperature: 0.2 });

          return {
            content: summaryResponse.content,
            success: summaryParams.success,
            reason: summaryParams.reason
          };
        });

        // Send the final summary to the user via ai-chat
        await step.sendEvent("notify-summary", {
          name: "ui/notify",
          data: {
            userId,
            channelType: "ai-chat",
            type: "message",
            message: summaryParams.reason
          }
        });

        executionResults.push({
          analysis: analysisResponse.analysis,
          summary: finalSummary,
          stepNumber: currentStep,
          isFinal: true
        });

        isComplete = true;
        continue;
      }

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
									userId,
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
									userId,
                  params: {
                    fromNodeId: fromNode.id,
                    toNodeId: toNode.id,
                    relationType: params.relationType
                  }
                };
              } else if (toolCall.function.name === "vector_search") {
                operationAttempted = true;
                executionData = {
                  type: "vector_search",
									userId,
                  params: {
                    searchQuery: params.query,
                    topK: params.topK,
                    organization,
                    ontology,
                    customNodeTypeNames
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
          const nodeResult = await step.invoke("execute-create-node", {
            function: createNodeTool,
            data: {
							userId,
              ...toolCallAnalysis.executionData.params,
              organization,
              ontology,
              customNodeTypeNames
            },
          });

          if (nodeResult?.success && nodeResult?.node?.id) {
            createdNodes[toolCallAnalysis.executionData.params.name] = {
              id: nodeResult.node.id,
              name: toolCallAnalysis.executionData.params.name,
              type: toolCallAnalysis.executionData.params.type,
              success: true
            };
          }

          executionResult = nodeResult;
        } else if (toolCallAnalysis.executionData.type === "create_relationship") {
          const relationshipResult = await step.invoke("execute-create-relationship", {
            function: createRelationshipTool,
            data: {
							userId,
              ...toolCallAnalysis.executionData.params,
              organization,
              ontology
            },
          });

          if (relationshipResult?.success && relationshipResult?.relationship?.id) {
            createdRelationships.push({
              id: relationshipResult.relationship.id,
              fromNodeId: relationshipResult.relationship.fromNodeId,
              fromNodeName: relationshipResult.relationship.fromNode.name,
              toNodeId: relationshipResult.relationship.toNodeId,
              toNodeName: relationshipResult.relationship.toNode.name,
              relationType: relationshipResult.relationship.relationType,
              success: true
            });
          }

          executionResult = relationshipResult;
        } else if (toolCallAnalysis.executionData.type === "vector_search") {
          const searchResult = await step.invoke("vector-search", {
            function: vectorSearch,
            data: {
              ...toolCallAnalysis.executionData.params,
							userId
            },
          });
          
          // Update the searchedContextData with the latest results
          searchedContextData = searchResult.results;
          executionResult = searchResult;
        }
      }

      executionResults.push({
        action: plan.proposedActions[currentStep - 1],
        analysis: analysisResponse.analysis,
        toolCallAnalysis,
        executionResult,
        stepNumber: currentStep,
        createdNodes: { ...createdNodes },
        createdRelationships: [...createdRelationships]
      });

      currentStep++;
    }

    // If we hit the safety limit without completion
    if (!isComplete) {
      const timeoutSummary = await step.run("generate-timeout-summary", async () => {
        const summaryResponse = await openAIService.generateChatCompletion([
          { role: "system", content: systemPrompt },
          { role: "user", content: "The execution has reached the maximum number of steps. Please provide a summary of what was accomplished and what remains to be done." }
        ], { temperature: 0.2 });

        return {
          content: summaryResponse.content,
          success: false,
          reason: "Execution reached maximum step limit"
        };
      });

      executionResults.push({
        analysis: "Execution timeout",
        summary: timeoutSummary,
        stepNumber: currentStep,
        isFinal: true
      });
    }

    return {
      success: isComplete,
      executionResults,
      summary: executionResults[executionResults.length - 1].summary
    };
  }
);

// Helper function to find node by ID or name in context or created nodes
function findNodeById(
  idOrName: string, 
  contextData: PineconeResult[], 
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
