import { inngest } from "../../inngest-client";
import { Organization, Ontology } from "@prisma/client";
import { customNodeTypesService } from "../../../services/custom-node-types";

type AIAgentStartEvent = {
  data: {
    prompt: string;
    organization: Organization;
    ontology: Ontology;
  };
};

// sends the first event to start the AI agent
export const aiAgentInit = inngest.createFunction(
  { id: "ai-agent-init" },
  { event: "ai-agent/init" },
  async ({ event, step }: { event: AIAgentStartEvent; step: any }) => {
    const { prompt, organization, ontology } = event.data;

    // Get custom node types for the organization
    const customNodeTypes = await step.run("fetch-custom-node-types", async () => {
      return customNodeTypesService.getByOrganization(organization.id);
    });
		
    // Emit the first event for embedding generation
    await step.sendEvent("start-generate-embed", {
      name: "ai-agent/embedding",
      data: { 
        prompt, 
        organization, 
        ontology,
        customNodeTypeNames: customNodeTypes.map(type => type.name)
      },
    });
	
    return { success: true };
  }
);
