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
  };
}

export const createNodeTool = inngest.createFunction(
  { id: "create-node" },
  { event: "ai-agent/tools/create-node" },
  async ({ event, step }: { event: CreateNodeEvent; step: any }) => {
    const { type, name, description, organization, ontology, customNodeTypeNames } = event.data;

    // Validate node type is allowed
    if (!customNodeTypeNames.includes(type)) {
      throw new Error(`Invalid node type "${type}". Allowed types are: ${customNodeTypeNames.join(", ")}`);
    }

    try {
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

      // Send notification about the node creation after step.run
      await step.sendEvent("notify-ui-update", {
        name: "ui/notify",
        data: {
          type: "node-created",
          content: `Created new ${type} node: "${name}"${description ? ` - ${description}` : ''}`,
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        node: node
      };
    } catch (error) {
      console.error("Error creating node:", error);
      
      // Send error notification
      await step.sendEvent("notify-ui-error", {
        name: "ui/notify",
        data: {
          type: "error",
          content: `Failed to create node: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date().toISOString()
        }
      });

      throw new Error(`Failed to create node: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
);
