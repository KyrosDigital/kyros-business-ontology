import { inngest } from "../../inngest-client";
import { openAIService } from "../../../services/openai";

// generates an embedding to be fed into Pinecone
export const generateEmbedding = inngest.createFunction(
  { id: "generate-embedding" },
  { event: "ai-agent/embedding" },
  async ({ event, step }: { event: any; step: any }) => {
    const { prompt, organization, ontology, customNodeTypeNames, } = event.data;

    const embedding = await openAIService.generateEmbedding(prompt);

		await step.sendEvent("start-query-pinecone", {
			name: "ai-agent/query-pinecone",
			data: { prompt,
				embedding,
				organization,
				ontology,
				customNodeTypeNames,
			},
		});

    return { success: true, embedding };
  }
);
