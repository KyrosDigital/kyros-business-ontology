import { inngest } from "../../../inngest-client";
import { connectNodes } from "../../../../services/ontology";
import { Organization, Ontology } from "@prisma/client";

interface CreateRelationshipEvent {
  data: {
    fromNodeId: string;
    toNodeId: string;
    relationType: string;
    organization: Organization;
    ontology: Ontology;
  };
}

export const createRelationshipTool = inngest.createFunction(
  { id: "create-relationship" },
  { event: "ai-agent/tools/create-relationship" },
  async ({ event, step }: { event: CreateRelationshipEvent; step: any }) => {
    const { fromNodeId, toNodeId, relationType, organization, ontology } = event.data;

    try {
      // Create the relationship using the ontology service
      const relationship = await step.run("create-relationship", async () => {
        return connectNodes(
          fromNodeId,
          toNodeId,
          relationType,
          organization.id,
          ontology.id
        );
      });

      return {
        success: true,
        relationship
      };
    } catch (error) {
      console.error("Error creating relationship:", error);
      throw new Error(`Failed to create relationship: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
);
