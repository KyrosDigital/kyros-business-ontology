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

interface NodeMetadata {
  id: string;
  name: string;
  nodeType: string;
  ontologyId: string;
  type: "NODE";
}

interface RelationshipMetadata {
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

interface PineconeResult {
  metadata: NodeMetadata | RelationshipMetadata;
  score: number;
  values: number[];
}

export const queryPinecone = inngest.createFunction(
  { id: "query-pinecone" },
  { event: "ai-agent/query-pinecone" },
  async ({ event, step }: { event: QueryPineconeEvent; step: any }) => {
    const { embedding, organization, ontology, customNodeTypeNames } = event.data;

    const pineconeService = new PineconeService(organization, ontology);
    const rawResults = await pineconeService.querySimilar(embedding, 25);

    // Filter and transform metadata based on type
    const results: PineconeResult[] = rawResults.map(result => {
      const { metadata } = result;
      
      if (metadata.type === "NODE") {
        // For nodes, exclude the content field
        const { content, ...nodeMetadata } = metadata;
        return {
          metadata: nodeMetadata as NodeMetadata,
          score: result.score,
          values: result.values || []
        };
      } else {
        return {
          metadata: metadata as RelationshipMetadata,
          score: result.score,
          values: result.values || []
        };
      }
    });

    await step.sendEvent("start-generate-action-plan", {
      name: "ai-agent/generate-plan",
      data: {
        pineconeResults: results,
        prompt: event.data.prompt,
        organization,
        ontology,
        customNodeTypeNames,
      },
    });

    return { success: true, results };
  }
);
