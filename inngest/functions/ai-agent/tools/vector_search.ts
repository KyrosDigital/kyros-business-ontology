import { inngest } from "../../../inngest-client";
import { Organization, Ontology } from "@prisma/client";
import { PineconeResult } from "../queryPinecone";
import { generateEmbedding } from "../generateEmbedding";
import { queryPinecone } from "../queryPinecone";

interface VectorSearchEvent {
  data: {
    searchQuery: string;
    topK: number;
    organization: Organization;
    ontology: Ontology;
    customNodeTypeNames: string[];
  };
}

export const vectorSearch = inngest.createFunction(
  { id: "vector-search" },
  { event: "ai-agent/tools/vector-search" },
  async ({ event, step }: { event: VectorSearchEvent; step: any }) => {
    const { searchQuery, topK, organization, ontology, customNodeTypeNames } = event.data;

    // Generate embedding for the search query
    const { embedding } = await step.invoke("generate-embedding", {
      function: generateEmbedding,
      data: {
        prompt: searchQuery,
        organization,
        ontology,
        customNodeTypeNames
      },
    });

    // Query Pinecone with the specified limit
    const { results } = await step.invoke("query-pinecone", {
      function: queryPinecone,
      data: {
        embedding,
        prompt: searchQuery,
        organization,
        ontology,
        customNodeTypeNames,
        topK, // Pass through the topK parameter
      },
    });

    // Return the search results
    return { 
      results,
      searchQuery,
      topK
    };
  }
); 