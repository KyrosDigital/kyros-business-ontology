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
    userId: string;
    source: string;
  };
}

export const createRelationshipTool = inngest.createFunction(
  { id: "create-relationship" },
  { event: "ai-agent/tools/create-relationship" },
  async ({ event, step }: { event: CreateRelationshipEvent; step: any }) => {
    const { fromNodeId, toNodeId, relationType, organization, ontology, userId, source } = event.data;
    const isInAppRequest = source === 'in-app';

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

      // Only send UI notifications for in-app requests
      if (isInAppRequest) {
        await step.sendEvent("notify-relationship-creation", {
          name: "ui/notify",
          data: {
            userId,
            channelType: "ai-chat",
            type: "progress",
            message: `Creating relationship "${relationType}" from "${relationship.fromNode.name}" to "${relationship.toNode.name}"...`
          }
        });

        // Send graph update notification
        await step.sendEvent("notify-ui-update", {
          name: "ui/notify",
          data: {
            userId,
            channelType: "graph-update",
            type: "relationship",
            message: `Created new relationship: "${relationType}" between nodes`,
            data: relationship
          }
        });
      }

      return {
        success: true,
        relationship
      };
    } catch (error) {
      console.error("Error creating relationship:", error);

      // Only send UI notifications for in-app requests
      if (isInAppRequest) {
        await step.sendEvent("notify-ui-error", {
          name: "ui/notify",
          data: {
            userId,
            channelType: "ai-chat",
            type: "error",
            message: `Failed to create relationship: ${error instanceof Error ? error.message : "Unknown error"}`,
            data: null
          }
        });
      }

      throw new Error(`Failed to create relationship: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
);
