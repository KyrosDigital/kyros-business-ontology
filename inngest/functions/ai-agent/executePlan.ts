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

const tools = [{
	type: "function",
	function: {
			name: "create_node",
			description: "Create a new node in the ontology system",
			parameters: {
					type: "object",
					properties: {
							type: {
									type: "string",
									description: "The type of node to create (must be one of the allowed types)"
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
}];

export const executePlan = inngest.createFunction(
  { id: "execute-plan" },
  { event: "ai-agent/execute-plan" },
  async ({ event, step }: { event: ExecutePlanEvent; step: any }) => {
    const { validatedPlan: plan, contextData, prompt, organization, ontology, customNodeTypeNames } = event.data;

    const systemPrompt = `You are an AI agent responsible for executing a planned sequence of operations on an ontology system.
Your task is to analyze the provided plan and context, then execute the appropriate tools to implement the changes.

ORIGINAL USER REQUEST:
${prompt}

CONTEXT DATA ANALYSIS:
${plan.contextDataObservations}

VALIDATED PLAN ANALYSIS:
${plan.analysis}

CURRENT CAPABILITIES:
- You can currently only create new nodes using the create_node tool
- Other operations will be implemented in future versions

AVAILABLE NODE TYPES:
${customNodeTypeNames.join(", ")}

YOUR RESPONSIBILITIES:
1. For each proposed action that involves node creation:
   - Validate the node type is allowed
   - Ensure the node name and description are appropriate
   - Call the create_node function with proper parameters
2. For any proposed actions that aren't yet supported:
   - Acknowledge them but skip execution
   - Note them as "pending future implementation"

EXECUTION GUIDELINES:
1. Consider the original user request and context when creating nodes
2. Use the context data to inform node creation decisions
3. Ensure node names are clear and descriptive
4. Provide detailed descriptions that explain the node's purpose
5. Only use allowed node types
6. Skip any non-create_node operations for now

Remember: Only proceed with node creation operations. All other operations should be noted but skipped.`;

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
        let nodeCreationAttempted = false;
        let toolCallResult = null;

        // Handle tool calls if present
        if (analysisResponse.tool_calls && analysisResponse.tool_calls.length > 0) {
          for (const toolCall of analysisResponse.tool_calls) {
            if (toolCall.function.name === "create_node") {
              try {
                const params = JSON.parse(toolCall.function.arguments);
                
                // Validate node type
                if (!customNodeTypeNames.includes(params.type)) {
                  throw new Error(`Invalid node type "${params.type}". Allowed types are: ${customNodeTypeNames.join(", ")}`);
                }

                nodeCreationAttempted = true;
                toolCallResult = {
                  success: true,
                  params,
                  toolCall
                };

                // Return the parameters to be used in the next step
                return {
                  shouldCreateNode: true,
                  params,
                  action,
                  analysis: analysisResponse.analysis,
                  nodeCreationAttempted,
                  toolCallResult,
                  stepNumber: currentStep,
                  tool_calls: analysisResponse.tool_calls
                };
              } catch (error) {
                toolCallResult = {
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error",
                  toolCall
                };
                console.error("Error executing create_node tool call:", error);
              }
            }
          }
        }

        return {
          shouldCreateNode: false,
          action,
          analysis: analysisResponse.analysis,
          nodeCreationAttempted,
          toolCallResult,
          stepNumber: currentStep,
          tool_calls: analysisResponse.tool_calls
        };
      });

      // If we need to create a node, do it in a separate step
      if (executionResponse.shouldCreateNode) {
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
