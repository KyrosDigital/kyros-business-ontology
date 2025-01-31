import { inngest } from "../../inngest-client";
import { Organization, Ontology } from "@prisma/client";
import { customNodeTypesService } from "../../../services/custom-node-types";
import { generateEmbedding } from "./generateEmbedding";
import { queryPinecone } from "./queryPinecone";
import { generateActionPlan } from "./generateActionPlan";
import { validatePlan } from "./validatePlan";

type AIAgentStartEvent = {
  data: {
    prompt: string;
    organization: Organization;
    ontology: Ontology;
		userId: string;
  };
};

// sends the first event to start the AI agent
export const aiAgentInit = inngest.createFunction(
  { id: "ai-agent-init" },
  { event: "ai-agent/init" },
  async ({ event, step }: { event: AIAgentStartEvent; step: any }) => {
    const { prompt, organization, ontology, userId } = event.data;

    // Get custom node types for the organization
    const customNodeTypes = await step.run("fetch-custom-node-types", async () => {
      return customNodeTypesService.getByOrganization(organization.id);
    });

    const customNodeTypeNames = customNodeTypes.map((type: { name: string }) => type.name);
    
    const commonEventData = {
      prompt,
      organization,
      ontology,
      customNodeTypeNames,
    };
		
    // Generate embedding
    const { embedding } = await step.invoke("generate-embedding", {
      function: generateEmbedding,
      data: commonEventData,
    });

    // Query Pinecone with the embedding
    const { results: pineconeResults } = await step.invoke("query-pinecone", {
      function: queryPinecone,
      data: { 
        ...commonEventData,
        embedding,
      },
    });

		await step.sendEvent("notify-ui-generate-action-plan", {
      name: "ai-agent/progress",
      data: {
				userId,
        type: "progress",
        content: "Creating an action plan...",
        timestamp: Date.now()
      } as AIAgentProgressEvent['data']
    });

    // Generate action plan
    const { planningResponse } = await step.invoke("generate-action-plan", {
      function: generateActionPlan,
      data: {
        ...commonEventData,
        contextData: pineconeResults,
      },
    });

		await step.sendEvent("notify-ui-validate-action-plan", {
      name: "ai-agent/progress",
      data: {
				userId,
        type: "progress",
        content: "Validating the action plan...",
        timestamp: Date.now()
      } as AIAgentProgressEvent['data']
    });

    // Validate the plan
    const { validatedPlan } = await step.invoke("validate-plan", {
      function: validatePlan,
      data: {
        ...commonEventData,
        planningResponse,
        contextData: pineconeResults,
      },
    });

		await step.sendEvent("notify-ui-execute-plan", {
      name: "ai-agent/progress",
      data: {
				userId,
        type: "progress",
        content: "Executing the action plan...",
        timestamp: Date.now()
      } as AIAgentProgressEvent['data']
    });

    // Execute the validated plan, start AI Agent loop
    await step.sendEvent("start-execute-plan", {
      name: "ai-agent/execute-plan",
      data: {
        ...commonEventData,
        validatedPlan,
        contextData: pineconeResults,
      },
    });
	
    return { success: true, embedding, pineconeResults, planningResponse, validatedPlan };
  }
);
