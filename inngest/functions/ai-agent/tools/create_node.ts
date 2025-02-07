import { inngest } from "../../../inngest-client";
import { createNode } from "../../../../services/ontology";
import { Organization, Ontology } from "@prisma/client";

interface CreateNodeEvent {
  data: {
    type: string;
    name: string;
    description?: string;
    organization: Organization;
    ontology: Ontology;
    customNodeTypeNames: string[];
    userId: string;
    source: string;
  };
}

export const createNodeTool = inngest.createFunction(
  { id: "create-node" },
  { event: "ai-agent/tools/create-node" },
  async ({ event, step }: { event: CreateNodeEvent; step: any }) => {
    const { type, name, description, organization, ontology, customNodeTypeNames, userId, source } = event.data;
    const isInAppRequest = source === 'in-app';

    // Validate node type is allowed
    if (!customNodeTypeNames.includes(type)) {
      throw new Error(`Invalid node type "${type}". Allowed types are: ${customNodeTypeNames.join(", ")}`);
    }

    try {
      // Only send UI notifications for in-app requests
      if (isInAppRequest) {
        await step.sendEvent("notify-node-creation", {
          name: "ui/notify",
          data: {
            userId,
            channelType: "ai-chat",
            type: "progress",
            message: `Creating ${type.toLowerCase()} "${name}"...`
          }
        });
      }

      // Create the node using the ontology service
      const node = await step.run("create-node", async () => {
        const newNode = await createNode({
          type,
          name,
          description,
          organizationId: organization.id,
          ontologyId: ontology.id
        });
        return newNode;
      });

      // Only send UI notifications for in-app requests
      if (isInAppRequest) {
        await step.sendEvent("notify-ui-update", {
          name: "ui/notify",
          data: {
            userId,
            channelType: "graph-update",
            type: "node",
            message: `Created new ${type} node: "${name}"${description ? ` - ${description}` : ''}`,
            data: node
          }
        });
      }

      return {
        success: true,
        node: node
      };
    } catch (error) {
      console.error("Error creating node:", error);
      
      // Only send UI notifications for in-app requests
      if (isInAppRequest) {
        await step.sendEvent("notify-ui-error", {
          name: "ui/notify",
          data: {
            userId,
            channelType: "ai-chat",
            type: "error",
            message: `Failed to create node: ${error instanceof Error ? error.message : "Unknown error"}`,
            data: null
          }
        });
      }

      throw new Error(`Failed to create node: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
);
