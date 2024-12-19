import Anthropic from '@anthropic-ai/sdk';
import { PineconeService, type VectorMetadata } from '@/services/pinecone';
import { openAIService } from '@/services/openai';
import type { Organization, Ontology, CustomNodeType } from '@prisma/client';
import { Tool } from '@anthropic-ai/sdk/resources/messages.mjs';
import { createNode, connectNodes, deleteNodeWithStrategy, updateNode, updateRelationship } from '@/services/ontology';
import type { NodeWithRelations } from '@/services/ontology';
import type { Message, MessageContentText } from '@anthropic-ai/sdk';
import { customNodeTypesService } from '@/services/custom-node-types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Get available node types from the database
async function getAvailableNodeTypes(organizationId: string): Promise<CustomNodeType[]> {
  return customNodeTypesService.getByOrganization(organizationId);
}

// Define tool schemas
const createToolSchemas = async (organizationId: string): Promise<Tool[]> => {
  const nodeTypes = await getAvailableNodeTypes(organizationId);
  
	const description = `
	Creates a sequential plan of operations to modify the ontology graph. 
	Each operation in the sequence will be executed in order.
	create_node: use this when you identify a need to create a new node. 
	update_node: use this when you identify a need to update an existing node.
	create_relationship: 
	- Use this when you identify a need to create a new relationship between two nodes.
	- In some cases, you may need to create a new node before creating a relationship.
	- When creating relationships, the fromNodeId and toNodeId must be uuid of an existing node from context data or a the uuid of the new node previously created.
	- It is not possible to create a relationship between a node that exists and has a UUID, and a node that has a placeholder number.
	update_relationship: 
	- use this when you identify a need to update an existing relationship between two nodes. 
	- A relationshipId is required and should be provided in the context data.
	- updating a relationship does not mean deleting the existing relationship and creating a new one. 
	- updating a relationship means changing the relationType or the connection from one node to another.
	delete_node_with_strategy: 
	- use this when you identify a need to delete a node.
	 
	Return the operations array directly, not nested under properties.
	`

  return [{
    name: 'create_plan',
    description, 
    input_schema: {
      type: "object",
      properties: {
        operations: {
          type: "array",
          description: "Array of sequential operations to perform. This should be a direct array, not nested under properties.",
          items: {
            type: "object",
            properties: {
              operationType: {
                type: "string",
                enum: ["create_node", "update_node", "create_relationship", "update_relationship", "delete_node_with_strategy"],
                description: "The type of operation to perform."
              },
              order: {
                type: "integer",
                description: "The order in which this operation should be executed (1-based)"
              },
              params: {
                type: "object",
                properties: {
                  // For create_node
                  type: {
                    type: "string",
                    enum: nodeTypes.map(nt => nt.name),
                    description: "The type of node to create/update (required for create_node and update_node)"
                  },
                  name: {
                    type: "string",
                    description: "The name of the node (required for create_node and update_node)"
                  },
                  description: {
                    type: "string",
                    description: "A detailed and relevant description of the node"
                  },
                  // For update_node
                  nodeId: {
                    type: "string",
                    description: "The ID of the node to update or delete (required for update_node and delete_node_with_strategy)"
                  },
                  // For create_relationship and update_relationship
                  relationshipId: {
                    type: "string",
                    description: "The ID of the relationship to update (required for update_relationship)"
                  },
                  fromNodeId: {
                    type: "string",
                    description: "The ID of the source node (required for create_relationship and update_relationship). Existing nodes from context will be a uuid (e.g. 123e4567-e89b-12d3-a456-426614174000), new nodes will be the order integer (e.g. 1)."
                  },
                  toNodeId: {
                    type: "string",
                    description: "The ID of the target node (required for create_relationship and update_relationship). Existing nodes from context will be a uuid (e.g. 123e4567-e89b-12d3-a456-426614174000), new nodes will be the order integer (e.g. 1)."
                  },
                  relationType: {
                    type: "string",
                    description: "The type of relationship (required for create_relationship and update_relationship)"
                  },
                  // For delete_node_with_strategy
                  strategy: {
                    type: "string",
                    enum: ["orphan", "cascade", "reconnect"],
                    description: "The deletion strategy (required for delete_node_with_strategy)"
                  }
                }
              }
            },
            required: ["operationType", "order", "params"]
          }
        }
      },
      required: ["operations"]
    }
  }];
};

interface RelevantContext {
  type: 'NODE' | 'RELATIONSHIP' | 'NOTE';
  content: string;
  score: number;
  metadata: VectorMetadata;
}

/**
 * Get relevant context from Pinecone based on query embedding
 */
async function getRelevantContext(
  query: string,
  organization: Organization,
  ontology: Ontology,
  activeFilters?: Set<'NODE' | 'RELATIONSHIP' | 'NOTE'>
): Promise<RelevantContext[]> {
  try {
    const pineconeService = new PineconeService(organization, ontology);
    const embedding = await openAIService.generateEmbedding(query);
    const results = await pineconeService.querySimilar(embedding, 20, activeFilters);
    
    if (!results) {
      return [];
    }

    return results
      .filter(match => match.metadata && match.score)
      .map(match => ({
        type: match.metadata.type,
        content: match.metadata.content,
        score: match.score,
        metadata: match.metadata
      }))
      .filter(context => context.score > 0.5);
  } catch (error) {
    console.error('Error getting relevant context:', error);
    throw new Error('Failed to get relevant context');
  }
}

/**
 * Format context into a structured prompt
 */
function formatContextForPrompt(contexts: RelevantContext[]): string {
  let prompt = "Relevant ontology context data based on the user's prompt:\n\n";

  // Group contexts by type
  const nodes = contexts.filter(c => c.type === 'NODE');
  const relationships = contexts.filter(c => c.type === 'RELATIONSHIP');
  const notes = contexts.filter(c => c.type === 'NOTE');

  // Format Nodes
  if (nodes.length > 0) {
    prompt += `## Nodes\n\n`;
    nodes.forEach(node => {
      delete node.metadata.content; // Don't include the embedded content in the prompt
      const json = JSON.stringify(node.metadata).replace(/\\n/g, ' ').trim();
      prompt += `${json}\n\n`;
    });
  }

  // Format Relationships
  if (relationships.length > 0) {
    prompt += `## Relationships\n\n`;
    relationships.forEach(rel => {
      const json = JSON.stringify(rel.metadata).replace(/\\n/g, ' ').trim();
      prompt += `${json}\n\n`;
    });
  }

  // Format Notes
  if (notes.length > 0) {
    prompt += `## Notes\n\n`;
    notes.forEach(note => {
      const json = JSON.stringify(note.metadata).replace(/\\n/g, ' ').trim();
      prompt += `${json}\n\n`;
    });
  }

	console.log("PROMPT", prompt)

  return prompt;
}

interface ToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

async function executeToolCall(
  tool: string,
  input: any,
  organization: Organization,
  ontology: Ontology
): Promise<ToolCallResult> {
  try {
    // Normalize the input structure
    const normalizedInput = input.properties || input;
    
    if (tool === 'create_node') {
      const node = await createNode({
        type: normalizedInput.type,
        name: normalizedInput.name,
        description: normalizedInput.description,
        organizationId: organization.id,
        ontologyId: ontology.id
      });
      return { success: true, data: node };
    }
    
    else if (tool === 'update_node') {
      const node = await updateNode(normalizedInput.nodeId, {
        type: normalizedInput.type,
        name: normalizedInput.name,
        description: normalizedInput.description,
        organizationId: organization.id,
        ontologyId: ontology.id
      });
      return { success: true, data: node };
    }
    
    else if (tool === 'create_relationship') {
      const relationship = await connectNodes(
        normalizedInput.fromNodeId,
        normalizedInput.toNodeId,
        normalizedInput.relationType,
        organization.id,
        ontology.id
      );  
      return { success: true, data: relationship };
    }

    else if (tool === 'update_relationship') {
      const relationship = await updateRelationship(
        normalizedInput.relationshipId,
        {
          fromNodeId: normalizedInput.fromNodeId,
          toNodeId: normalizedInput.toNodeId,
          relationType: normalizedInput.relationType,
          organizationId: organization.id,
          ontologyId: ontology.id
        }
      );
			console.log("tool is update_relationship")
			console.log("relationship", relationship)
      return { success: true, data: relationship };
    }

    else if (tool === 'delete_node_with_strategy') {
      const result = await deleteNodeWithStrategy(
        normalizedInput.nodeId,
        normalizedInput.strategy
      );
      return { success: true, data: result };
    }
    
    return { 
      success: false, 
      error: `Unknown tool: ${tool}` 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Tool execution failed' 
    };
  }
}

async function handleSequentialTools(
  initialResponse: Message,
  organization: Organization,
  ontology: Ontology,
  previousMessages: { role: string; content: string }[],
  onProgress?: (update: string, operationResult?: { type: string; data: any }) => Promise<void>
): Promise<{ text: string; toolCalls: any[] | null }> {
  const allToolCalls: any[] = [];
  let finalTextContent = '';
  const createdNodes: Record<string, string> = {};

  // Extract text content from initial response
  const textBlocks = initialResponse.content
    .filter(block => block.type === 'text')
    .map(block => (block as MessageContentText).text);
  
  finalTextContent = textBlocks.join('\n');

  // Get the plan from the tool use block
  const planBlock = initialResponse.content.find(block => 
    block.type === 'tool_use' && block.name === 'create_plan'
  );

  if (!planBlock) {
    return {
      text: finalTextContent,
      toolCalls: null
    };
  }

  // Normalize the input structure
  const operations = (() => {
    // Handle direct operations array
    if (planBlock.input?.operations) {
      return [...planBlock.input.operations];
    }
    // Handle nested properties structure
    if (planBlock.input?.properties?.operations) {
      return [...planBlock.input.properties.operations];
    }
    console.warn('Invalid plan structure:', planBlock.input);
    return null;
  })();

  if (!operations) {
    return {
      text: finalTextContent,
      toolCalls: null
    };
  }

  // Sort operations by order
  const sortedOperations = operations.sort((a, b) => a.order - b.order);

  // Log the normalized plan for debugging
  console.log("\nNORMALIZED PLAN OPERATIONS:");
  sortedOperations.forEach((operation: any, index: number) => {
    console.log(`\nOperation ${index + 1}:`);
    console.log(`Type: ${operation.operationType}`);
    console.log(`Order: ${operation.order}`);
    console.log("Parameters:", operation.params);
  });

  // Function to store node ID
  const storeNodeId = (nodeName: string, nodeId: string, order: number) => {
    // Store using the order number as the placeholder key
    createdNodes[order.toString()] = nodeId;
    // Also store by node name as fallback
    createdNodes[nodeName.toLowerCase().replace(/\s+/g, '')] = nodeId;
  };

  // Function to replace placeholder IDs with actual IDs
  const replaceNodeId = (placeholder: string): string => {
    // If it's a valid UUID, assume it's an existing node from context
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(placeholder)) {
      return placeholder;
    }

    // If it's a number, treat it as a placeholder for a newly created node
    if (/^\d+$/.test(placeholder)) {
      if (createdNodes[placeholder]) {
        return createdNodes[placeholder];
      }
      console.warn(`No node found for placeholder number: ${placeholder}`);
      return placeholder;
    }

    // As fallback, try normalized name lookup
    const normalizedPlaceholder = placeholder.toLowerCase().replace(/\s+/g, '');
    if (createdNodes[normalizedPlaceholder]) {
      return createdNodes[normalizedPlaceholder];
    }

    console.warn(`Could not find matching ID for placeholder: ${placeholder}`);
    return placeholder;
  };

  // Execute each operation in sequence
  for (const operation of sortedOperations) {
    try {
      // For relationship operations, replace placeholder IDs before execution
      if (operation.operationType === 'create_relationship') {
        operation.params.fromNodeId = replaceNodeId(operation.params.fromNodeId);
        operation.params.toNodeId = replaceNodeId(operation.params.toNodeId);
      }

      const result = await executeToolCall(
        operation.operationType,
        operation.params,
        organization,
        ontology
      );

      if (result.success) {
        allToolCalls.push({
          tool: operation.operationType,
          input: operation.params
        });

        // Store created node IDs with their operation order
        if (operation.operationType === 'create_node' && result.data) {
          const node = result.data as NodeWithRelations;
          storeNodeId(node.name, node.id, operation.order);
        }

        let progressMessage = '';
        switch (operation.operationType) {
          case 'create_node':
            progressMessage = `Created ${operation.params.type.toLowerCase()} "${operation.params.name}"`;
            break;
          case 'update_node':
            progressMessage = `Updated node "${operation.params.name}"`;
            break;
          case 'create_relationship':
            progressMessage = `Created relationship "${operation.params.relationType}" between nodes`;
            break;
          case 'update_relationship':
            progressMessage = `Updated relationship to "${operation.params.relationType}" between nodes`;
            break;
          case 'delete_node_with_strategy':
            progressMessage = `Deleted node using ${operation.params.strategy} strategy`;
            break;
        }

        if (onProgress && progressMessage) {
          await onProgress(progressMessage, {
            type: operation.operationType,
            data: result.data
          });
        }

        previousMessages.push({
          role: 'user',
          content: `Tool result: ${progressMessage}`
        });
      }
    } catch (error) {
      console.error(`Error executing operation:`, operation, error);
      throw error;
    }
  }

  // Get final response from Claude if needed
  const finalResponse = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 4000,
    messages: previousMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content
    })),
    tools: await createToolSchemas(organization.id)
  });

  // Add any additional text content from final response
  const finalTextBlocks = finalResponse.content
    .filter(block => block.type === 'text')
    .map(block => (block as MessageContentText).text);
  
  finalTextContent += '\n' + finalTextBlocks.join('\n');

  return {
    text: finalTextContent || "Changes have been applied successfully.",
    toolCalls: allToolCalls.length > 0 ? allToolCalls : null
  };
}

export async function sendMessage(
  message: string,
  organization: Organization,
  ontology: Ontology,
  previousMessages: { role: string; content: string }[],
  activeFilters?: Set<'NODE' | 'RELATIONSHIP' | 'NOTE'>,
  onProgress?: (update: string, operationResult?: { type: string; data: unknown }) => Promise<void>
) {
  try {
    const tools = await createToolSchemas(organization.id);
    const relevantContext = await getRelevantContext(message, organization, ontology, activeFilters);
    const contextPrompt = formatContextForPrompt(relevantContext);
    const nodeTypes = await getAvailableNodeTypes(organization.id);

    const systemPrompt = `You are an AI assistant helping users understand, improve, and modify their business structure and processes. 
    Users will ask you questions pertaining to the knowledge graph they see. The knowledge graph represents an ontology the user has created.
    Ontologies are used to describe the structure of an organization, including its departments, roles, processes, and the relationships between them.
    Users in this application are able to document an ontology by adding nodes and relationships to the graph.
    Nodes represent entities like departments, roles, processes, etc. Relationships represent connections between nodes.
    
    Available Node Types:
    ${nodeTypes.map(nt => `- ${nt.name} (${nt.description || 'No description'})`).join('\n')}
    
    Your Purpose: 
    - (Insights): To help the user better understand the ontology and the relationships between the nodes.
    - (Modification): To help the user modify their ontology by adding or removing nodes and relationships.
    - (Recommendations): To provide recommendations based on the ontology and the relationships between the nodes.

    Your Expertise: 
    - You are an expert Business Analyst with deep knowledge of business processes and organizational structures.
    - You have a strong understanding of the domain of the ontology and the terminology used in the ontology.
    - You are able to understand the user's prompt and the context of the ontology to provide insightful and actionable responses.

    When responding:
    1. Always use markdown formatting for your responses
    - Use headers (##) for main sections
    - Use bullet points for lists
    - Use **bold** for emphasis
    - Use \`code blocks\` for technical terms
    - Use > for important quotes or callouts
    - Break up long responses into clear sections
    2. If the user is asking for insights or recommendations, provide clear responses using the available context
    3. If the user wants to modify the graph:
      - First explain your reasoning in markdown
      - Then use the appropriate tool(s)
      - Finally, summarize the proposed changes

    Available Tools:
    1. create_plan: Create a sequential plan of operations
       - Required: operations (array of operations)
       - Each operation requires:
         * operationType: "create_node", "update_node", "create_relationship", "update_relationship", or "delete_node_with_strategy"
         * order: integer indicating execution order (1-based)
         * params: object containing parameters specific to the operation type
       - Operation-specific parameters:
         * For create_node: type (${nodeTypes.map(nt => nt.name).join(', ')}), name, description
         * For update_node: nodeId, type (${nodeTypes.map(nt => nt.name).join(', ')}), name, description
         * For create_relationship: fromNodeId, toNodeId, relationType
         * For update_relationship: fromNodeId, toNodeId, relationType
         * For delete_node_with_strategy: nodeId, strategy ("orphan", "cascade", "reconnect")
				 * fromNodeId and toNodeId must be either a uuid from context or a unique number 

    Guidelines:
    - Use clear, professional names for nodes
    - Write concise but informative descriptions
    - Choose appropriate and relevant relationship types (Has, Implements, Manages, Proceeds, etc.)
    - If uncertain, ask for clarification
    - If context provided lacks required information, ask for clarification before using a tool.
    - Explain your reasoning before making changes
    - Do not fabricate information

		Common Mistakes to avoid:
		- Relationships to Nodes have unique constraints, in that fromNodeId, toNodeId, and relationType must be unique. (you cannot have duplicate relationships between the same two nodes)
		- Deleting and then creating relationships is not allowed. Instead, use update_relationship to change the relationType or the connection from one node to another.

${contextPrompt}

`;

    const messages = [
      { role: 'assistant' as const, content: systemPrompt },
      ...previousMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      { role: 'user' as const, content: message }
    ];

    //console.log(messages)

    const initialResponse = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      messages,
      tools
    });

    console.log("INITIAL RESPONSE", initialResponse)
    initialResponse.content.forEach(block => {
      if (block.type === 'tool_use') {
        console.log("TOOL INPUT", block.input);
        // Handle both direct and nested operations structure
        const operations = block.input?.operations || block.input?.properties?.operations;
        if (operations) {
          console.log("\nPLAN OPERATIONS:");
          operations.forEach((operation: any, index: number) => {
            console.log(`\nOperation ${index + 1}:`);
            console.log(`Type: ${operation.operationType}`);
            console.log(`Order: ${operation.order}`);
            console.log("Parameters:", operation.params);
          });
        } else {
          console.warn("Unexpected tool input structure:", block.input);
        }
      }
    });

    // If the response indicates tool use, handle it sequentially
    if (initialResponse.stop_reason === 'tool_use') {
      return handleSequentialTools(initialResponse, organization, ontology, messages, onProgress);
    }

    // If no tool use, return the regular response
    const textContent = initialResponse.content
      .filter(block => block.type === 'text')
      .map(block => (block as MessageContentText).text)
      .join('\n');

    //console.log("RETURNING TEXT TO FRONT END")
    return {
      text: textContent,
      toolCalls: null
    };

  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}


