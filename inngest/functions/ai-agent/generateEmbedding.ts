import { inngest } from "../../inngest-client";
import { openAIService } from "../../../services/openai";
import { Organization, Ontology } from "@prisma/client";

type GenerateEmbeddingEvent = {
  data: {
    prompt: string;
    organization: Organization;
    ontology: Ontology;
    customNodeTypeNames: string[];
  };
};

// generates an embedding to be fed into Pinecone
export const generateEmbedding = inngest.createFunction(
  { id: "generate-embedding" },
  { event: "ai-agent/embedding" },
  async ({ event, step }: { event: GenerateEmbeddingEvent; step: any }) => {
    const { prompt } = event.data;

    // Run embedding generation in a step for better observability
    const embedding = await step.run("generate-openai-embedding", async () => {
      return openAIService.generateEmbedding(prompt);
    });

    return { embedding };
  }
);
