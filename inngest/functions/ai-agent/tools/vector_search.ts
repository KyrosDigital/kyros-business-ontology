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
    userId: string;
    source: string;
  };
}

export const vectorSearch = inngest.createFunction(
  { id: "vector-search" },
  { event: "ai-agent/tools/vector-search" },
  async ({ event, step }: { event: VectorSearchEvent; step: any }) => {
    const { searchQuery, topK, organization, ontology, customNodeTypeNames, userId, source } = event.data;
    const isInAppRequest = source === 'in-app';

    try {
      // Only send UI notifications for in-app requests
      if (isInAppRequest) {
        await step.sendEvent("notify-vector-search", {
          name: "ui/notify",
          data: {
            userId,
            channelType: "ai-chat",
            type: "progress",
            message: "I'm searching for more context in your knowledge graph..."
          }
        });
      }

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

      return { 
        results,
        searchQuery,
        topK
      };
    } catch (error) {
      console.error("Error in vector search:", error);
      
      // Only send UI notifications for in-app requests
      if (isInAppRequest) {
        await step.sendEvent("notify-vector-search-error", {
          name: "ui/notify",
          data: {
            userId,
            channelType: "ai-chat",
            type: "error",
            message: `Failed to search knowledge graph: ${error instanceof Error ? error.message : "Unknown error"}`,
            data: null
          }
        });
      }

      throw error;
    }
  }
); 