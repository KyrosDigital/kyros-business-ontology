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
    source: string;
  };
};

// sends the first event to start the AI agent
export const aiAgentInit = inngest.createFunction(
  { id: "ai-agent-init" },
  { event: "ai-agent/init" },
  async ({ event, step }: { event: AIAgentStartEvent; step: any }) => {
    const { prompt, organization, ontology, userId, source } = event.data;
    const isInAppRequest = source === 'in-app';

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
		
    // Only send UI notifications for in-app requests
    if (isInAppRequest) {
      await step.sendEvent("notify-inspection-start", {
        name: "ui/notify",
        data: {
          userId,
          channelType: "ai-chat",
          type: "progress",
          message: "Inspecting your ontology data to understand the current context..."
        }
      });
    }

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

    // Only send UI notifications for in-app requests
    if (isInAppRequest) {
      await step.sendEvent("notify-planning-start", {
        name: "ui/notify",
        data: {
          userId,
          channelType: "ai-chat",
          type: "progress",
          message: "Analyzing your request and planning necessary actions..."
        }
      });
    }

    // Generate action plan
    const { planningResponse } = await step.invoke("generate-action-plan", {
      function: generateActionPlan,
      data: {
        ...commonEventData,
        contextData: pineconeResults,
      },
    });

    // Only send UI notifications for in-app requests
    if (isInAppRequest) {
      await step.sendEvent("notify-validation-start", {
        name: "ui/notify",
        data: {
          userId,
          channelType: "ai-chat",
          type: "progress",
          message: "Validating the planned actions to ensure they're safe and appropriate..."
        }
      });
    }

    // Validate the plan
    const { validatedPlan } = await step.invoke("validate-plan", {
      function: validatePlan,
      data: {
        ...commonEventData,
        planningResponse,
        contextData: pineconeResults,
      },
    });

    // Only send UI notifications for in-app requests
    if (isInAppRequest) {
      await step.sendEvent("notify-execution-start", {
        name: "ui/notify",
        data: {
          userId,
          channelType: "ai-chat",
          type: "progress",
          message: "Starting to execute the plan..."
        }
      });
    }

    // Execute the validated plan, start AI Agent loop
    await step.sendEvent("start-execute-plan", {
      name: "ai-agent/execute-plan",
      data: {
        ...commonEventData,
        userId,
        validatedPlan,
        contextData: pineconeResults,
        source,
      },
    });
	
    return { success: true, embedding, pineconeResults, planningResponse, validatedPlan, userId };
  }
);
