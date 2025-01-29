import { inngest } from "../../inngest-client";
import { PineconeService } from "../../../services/pinecone";
import { Organization, Ontology } from "@prisma/client";

interface QueryPineconeEvent {
  data: {
    embedding: number[];
    prompt: string;
    organization: Organization;
    ontology: Ontology;
    customNodeTypeNames: string[];
  };
}

export type NodeMetadata = {
  id: string;
  name: string;
  nodeType: string;
  ontologyId: string;
  type: "NODE";
}

export type RelationshipMetadata = {
  id: string;
  content: string;
  fromNodeId: string;
  fromNodeName: string;
  fromNodeType: string;
  toNodeId: string;
  toNodeName: string;
  toNodeType: string;
  relationType: string;
  type: "RELATIONSHIP";
}

export type PineconeResult = {
  metadata: NodeMetadata | RelationshipMetadata;
  score: number;
  values: number[];
}

export const queryPinecone = inngest.createFunction(
  { id: "query-pinecone" },
  { event: "ai-agent/query-pinecone" },
  async ({ event, step }: { event: QueryPineconeEvent; step: any }) => {
    const { embedding, organization, ontology } = event.data;

    const results = await step.run("query-pinecone", async () => {
      const pineconeService = new PineconeService(organization, ontology);
      const rawResults = await pineconeService.querySimilar(embedding, 25);

      // Filter and transform metadata based on type
      return rawResults.map(result => {
        const { metadata } = result;
        
        if (metadata.type === "NODE") {
          // For nodes, exclude the content field
          const { content: _content, ...nodeMetadata } = metadata;
          return {
            metadata: nodeMetadata as NodeMetadata,
            score: result.score ?? 0,
            values: result.values ?? []
          };
        } else {
          return {
            metadata: metadata as RelationshipMetadata,
            score: result.score ?? 0,
            values: result.values ?? []
          };
        }
      });
    });

    return { results };
  }
);
