import { inngest } from "../../inngest-client";

interface PlanningEvent {
  data: {
    planningResponse: string;
    contextData: Array<{
      type: string;
      content: string;
      score: number;
    }>;
    prompt: string;
    organization: string;
    ontology: string;
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
  async ({ event, step }: { event: PlanningEvent; step: StepTypes }) => {

    const validatedPlan = await step.run("validate-planning-response", async () => {
      const { planningResponse, contextData, prompt, organization, ontology, customNodeTypeNames } = event.data;
      
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
          "search_vector_db",
          "create_node",
          "update_node",
          "create_relationship",
          "update_relationship",
          "delete_node_with_strategy"
        ] as const;

        const invalidTools = parsed.requiredTools.filter(
          tool => !availableTools.includes(tool as typeof availableTools[number])
        );

        if (invalidTools.length > 0) {
          throw new Error(`Invalid tools specified: ${invalidTools.join(", ")}`);
        }

        return parsed;
      } catch (error) {
        console.error("Planning response validation failed:", error);
        throw new Error(`Invalid planning response format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Send event to execute the validated plan
    await step.sendEvent("start-execute-plan", {
      name: "ai-agent/execute-plan",
      data: {
        validatedPlan,
        contextData: event.data.contextData,
        prompt: event.data.prompt,
        organization: event.data.organization,
        ontology: event.data.ontology,
        customNodeTypeNames: event.data.customNodeTypeNames
      },
    });

    return { success: true, validatedPlan };
  }
);