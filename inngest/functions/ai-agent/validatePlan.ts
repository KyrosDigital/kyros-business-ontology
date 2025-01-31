import { inngest } from "../../inngest-client";
import { Organization, Ontology } from "@prisma/client";
import { PineconeResult } from "./queryPinecone";

interface PlanningEvent {
  data: {
    planningResponse: string;
    contextData: PineconeResult[];
    prompt: string;
    organization: Organization;
    ontology: Ontology;
    customNodeTypeNames: string[];
  };
}

type PlanningResponse = {
  intent: "QUERY" | "MODIFICATION";
  analysis: string;
  contextDataObservations: string;
  proposedActions: string[];
  requiredTools: string[];
};

export const validatePlan = inngest.createFunction(
  { id: "validate-plan" },
  { event: "ai-agent/validate-plan" },
  async ({ event, step }: { event: PlanningEvent; step: any }) => {

    const validatedPlan = await step.run("validate-planning-response", async () => {
      const { planningResponse } = event.data;
      
      try {
        // Extract JSON from markdown code block if present
        let jsonStr = planningResponse;
        if (planningResponse.includes("```json")) {
          jsonStr = planningResponse.replace(/```json\n|\n```/g, "");
        }

        // Parse the JSON
        const parsed = JSON.parse(jsonStr) as PlanningResponse;

        // Validate required fields
        if (!parsed.intent || !["QUERY", "MODIFICATION"].includes(parsed.intent)) {
          throw new Error("Invalid or missing intent");
        }
        if (!parsed.analysis || typeof parsed.analysis !== "string") {
          throw new Error("Invalid or missing analysis");
        }
        if (!parsed.contextDataObservations || typeof parsed.contextDataObservations !== "string") {
          throw new Error("Invalid or missing contextDataObservations");
        }
        if (!Array.isArray(parsed.proposedActions)) {
          throw new Error("Invalid or missing proposedActions");
        }
        if (!Array.isArray(parsed.requiredTools)) {
          throw new Error("Invalid or missing requiredTools");
        }

        // Validate tools against available tools list
        const availableTools = [
          "vector_search",
          "create_node",
          "update_node",
          "create_relationship",
          "update_relationship",
          "delete_node_with_strategy",
          "ask_for_more_information",
          "generate_summary",
          "provide_insights"
        ] as const;

        // First validate that all tools are strings
        const nonStringTools = parsed.requiredTools.filter(tool => typeof tool !== 'string');
        if (nonStringTools.length > 0) {
          throw new Error(`Invalid tool format. Expected strings but got: ${JSON.stringify(nonStringTools)}`);
        }

        // Then validate against available tools
        const invalidTools = parsed.requiredTools.filter(
          tool => !availableTools.includes(tool as typeof availableTools[number])
        );

        if (invalidTools.length > 0) {
          throw new Error(`Invalid tools specified: ${invalidTools.join(", ")}`);
        }

        return parsed;
      } catch (error) {
        // Log the full planning response for debugging
        console.error("Full planning response:", planningResponse);
        console.error("Validation error details:", error);
        
        // Throw a more detailed error
        if (error instanceof Error) {
          throw new Error(`Planning response validation failed: ${error.message}\nFull response: ${planningResponse}`);
        } else {
          throw new Error(`Unknown validation error occurred\nFull response: ${planningResponse}`);
        }
      }
    });

    return { validatedPlan };
  }
);
