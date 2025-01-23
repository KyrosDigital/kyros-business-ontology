import { inngest } from "../../inngest-client";
import { PineconeService } from "../../../services/pinecone";

export const queryPinecone = inngest.createFunction(
  { id: "query-pinecone" },
  { event: "ai-agent/query-pinecone" },
  async ({ event, step }: { event: any; step: any }) => {
    const { embedding, organization, ontology } = event.data;

    const pineconeService = new PineconeService(organization, ontology);
    const results = await pineconeService.querySimilar(embedding, 25);

		await step.sendEvent("start-generate-action-plan", {
			name: "ai-agent/generate-plan",
			data: {
				pineconeResults: results,
				prompt: event.data.prompt,
				organization,
				ontology,
			},
		});

    return { success: true, results };
  }
);
