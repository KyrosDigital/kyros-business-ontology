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

interface PineconeResult {
  id: string;
  metadata: {
    id: string;
    name: string;
    nodeType?: string;
    ontologyId: string;
    type: string;
  };
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

    // Filter out content from metadata
    const results: PineconeResult[] = rawResults.map(result => ({
      id: result.id,
      metadata: {
        id: result.metadata.id,
        name: result.metadata.name,
        nodeType: result.metadata.nodeType,
        ontologyId: result.metadata.ontologyId,
        type: result.metadata.type
      },
      score: result.score,
      values: result.values || []
    }));

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
