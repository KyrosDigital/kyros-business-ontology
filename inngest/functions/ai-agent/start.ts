import { inngest } from "../../inngest-client";
import { openAIService } from "../../../services/openai";
import { PineconeService } from "../../../services/pinecone";
import { Organization, Ontology } from "@prisma/client";

type AIAgentStartEvent = {
  data: {
    prompt: string;
    organization: Organization;
    ontology: Ontology;
  };
};

export const aiAgentStart = inngest.createFunction(
  { id: "ai-agent-start" },
  { event: "ai-agent/start" },
  async ({ event, step }: { event: AIAgentStartEvent, step: any }) => {
    const { prompt, organization, ontology } = event.data;

    // 1. Generate embedding for the prompt
    const embedding = await step.run("generate-embedding", async () => {
      return await openAIService.generateEmbedding(prompt);
    });

    // 2. Query Pinecone for similar vectors
    const pineconeResults = await step.run("query-pinecone", async () => {
      const pineconeService = new PineconeService(organization, ontology);
      const results = await pineconeService.querySimilar(embedding, 5);
      return results;
    });

    // 3. Log the results
    await step.run("log-results", async () => {
      return {
        prompt,
        similarResults: pineconeResults?.map(result => ({
          score: result.score,
          metadata: result.metadata,
        })),
      };
    });

    return { success: true };
  },
);
