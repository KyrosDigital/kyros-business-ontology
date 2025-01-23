import { inngest } from "../../inngest-client";
import { Organization, Ontology } from "@prisma/client";

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

    // Emit the first event for embedding generation
		await step.sendEvent("start-generate-embed", {
			name: "ai-agent/embedding",
			data: { prompt, organization, ontology },
		});
	
    return { success: true };
  }
);
