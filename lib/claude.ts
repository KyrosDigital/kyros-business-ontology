import Anthropic from '@anthropic-ai/sdk';
import { PineconeService, type VectorMetadata } from '@/services/pinecone';
import { openAIService } from '@/services/openai';
import { NodeType } from '@prisma/client';
import type { Organization, Ontology } from '@prisma/client';
import { Tool } from '@anthropic-ai/sdk/resources/messages.mjs';
import { createNode, connectNodes, deleteNodeWithStrategy } from '@/services/ontology';
import type { NodeWithRelations } from '@/services/ontology';
import type { Message, MessageContentText } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Define tool schemas
const tools: Tool[] = [
  {
    name: 'create_plan',
    description: "Creates a sequential plan of operations to modify the ontology graph. Each operation in the sequence will be executed in order. When creating relationships, the fromNodeId and toNodeId must be either a uuid from context or a unique number. Return the operations array directly, not nested under properties.",
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
                enum: ["create_node", "create_relationship", "delete_node_with_strategy"],
                description: "The type of operation to perform"
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
                    enum: Object.values(NodeType),
                    description: "The type of node to create (required for create_node)"
                  },
                  name: {
                    type: "string",
                    description: "The name of the node (required for create_node)"
                  },
                  description: {
                    type: "string",
                    description: "A description of the node (optional for create_node)"
                  },
                  // For create_relationship
                  fromNodeId: {
                    type: "string",
                    description: "The ID of the source node (required for create_relationship)."
                  },
                  toNodeId: {
                    type: "string",
                    description: "The ID of the target node (required for create_relationship)."
                  },
                  relationType: {
                    type: "string",
                    description: "The type of relationship (required for create_relationship)"
                  },
                  // For delete_node_with_strategy
                  nodeId: {
                    type: "string",
                    description: "The ID of the node to delete (required for delete_node_with_strategy)."
                  },
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
  }
];

interface RelevantContext {
  type: 'NODE' | 'RELATIONSHIP' | 'NOTE';
  content: string;
  score: number;
  metadata: VectorMetadata;
}

interface ExistingRelationship {
  fromNodeId: string;
  toNodeId: string;
  relationType: string;
}

function isExistingRelationship(
  relationship: ExistingRelationship,
  existingRelationships: any[]
): boolean {
  return existingRelationships.some(existing => 
    existing.fromNodeId === relationship.fromNodeId &&
    existing.toNodeId === relationship.toNodeId &&
    existing.relationType === relationship.relationType
  );
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
      //console.log("NODE TOOL INPUT ============", normalizedInput);
      const node = await createNode({
        type: normalizedInput.type,
        name: normalizedInput.name,
        description: normalizedInput.description,
        organizationId: organization.id,
        ontologyId: ontology.id
      });
      //console.log("NODE CREATED WITH TOOL USE", node);
      return { success: true, data: node };
    }
    
    else if (tool === 'create_relationship') {
      //console.log("RELATIONSHIP TOOL INPUT ============", normalizedInput);
      const relationship = await connectNodes(
        normalizedInput.fromNodeId,
        normalizedInput.toNodeId,
        normalizedInput.relationType,
        organization.id,
        ontology.id
      );  
      //console.log("RELATIONSHIP CREATED WITH TOOL USE", relationship);
      return { success: true, data: relationship };
    }

    else if (tool === 'delete_node_with_strategy') {
      //console.log("DELETE NODE TOOL INPUT ============", normalizedInput);
      const result = await deleteNodeWithStrategy(
        normalizedInput.nodeId,
        normalizedInput.strategy
      );
      //console.log("NODE DELETED WITH TOOL USE", result);
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
  onProgress?: (update: string) => Promise<void>
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
          case 'create_relationship':
            progressMessage = `Created relationship "${operation.params.relationType}" between nodes`;
            break;
          case 'delete_node_with_strategy':
            progressMessage = `Deleted node using ${operation.params.strategy} strategy`;
            break;
        }

        if (onProgress && progressMessage) {
          await onProgress(progressMessage);
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
    tools
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
  onProgress?: (update: string) => Promise<void>
) {
  try {
    const relevantContext = await getRelevantContext(message, organization, ontology, activeFilters);
    const contextPrompt = formatContextForPrompt(relevantContext);

    const systemPrompt = `You are an AI assistant helping users understand, improve, and modify their business structure and processes. 
    Users will ask you questions pertaining to the knowledge graph they see. The knowledge graph represents an ontology the user has created.
    Ontologies are used to describe the structure of an organization, including its departments, roles, processes, and the relationships between them.
    Users in this application are able to document an ontology by adding nodes and relationships to the graph.
    Nodes represent entities like departments, roles, processes, etc. Relationships represent connections between nodes.
    
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
         * operationType: "create_node", "create_relationship", or "delete_node_with_strategy"
         * order: integer indicating execution order (1-based)
         * params: object containing parameters specific to the operation type
       - Operation-specific parameters:
         * For create_node: type (${Object.values(NodeType).join(', ')}), name, description (optional)
         * For create_relationship: fromNodeId, toNodeId, relationType
         * For delete_node_with_strategy: nodeId, strategy ("orphan", "cascade", "reconnect")
				 * fromNodeId and toNodeId must be either a uuid from context or a unique number 

    Guidelines:
    - Use clear, professional names for nodes
    - Write concise but informative descriptions
    - Choose appropriate relationship types
    - If uncertain, ask for clarification
    - If context provided lacks required information, ask for clarification before using a tool.
    - Explain your reasoning before making changes
    - Do not fabricate information

		Common Mistakes to avoid:
		- Relationships to Nodes have unique constraints, in that fromNodeId, toNodeId, and relationType must be unique. (you cannot have duplicate relationships between the same two nodes)
		- 

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


