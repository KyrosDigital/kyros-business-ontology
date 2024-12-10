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
    name: 'create_node',
    description: "Creates a new node in the graph. It should be used when the user wants to create a new node in the ontology graph. Nodes represent entities like departments, roles, processes, etc.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: Object.values(NodeType),
          description: "The type of node to create (e.g., DEPARTMENT, ROLE, PROCESS)"
        },
        name: {
          type: "string",
          description: "The name of the node (should be clear and professional)"
        },
        description: {
          type: "string",
          description: "A concise description of the node's purpose or function"
        }
      },
      required: ["type", "name"]
    }
  },
  {
    name: 'create_relationship',
    description: "Creates a relationship between two existing nodes. It should be used when the user wants to create a relationship or connection between two nodes in the ontology graph.",
    input_schema: {
      type: "object",
      properties: {
        fromNodeId: {
          type: "string",
          description: "The ID of the source node"
        },
        toNodeId: {
          type: "string",
          description: "The ID of the target node"
        },
        relationType: {
          type: "string",
          description: "The type of relationship (e.g., 'Uses', 'Reports to', 'Manages', 'Has')"
        }
      },
      required: ["fromNodeId", "toNodeId", "relationType"]
    }
  },
  {
    name: 'delete_node_with_strategy',
    description: "Deletes a node from the graph using a specified strategy. Use this when you need to remove a node while handling its relationships in a specific way.",
    input_schema: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          description: "The ID of the node to delete"
        },
        strategy: {
          type: "string",
          enum: ["orphan", "cascade", "reconnect"],
          description: `The strategy to use when deleting:
            - orphan: Simply deletes the node and its relationships
            - cascade: Deletes the node and all its descendants
            - reconnect: Deletes the node and connects its children to its parent`
        }
      },
      required: ["nodeId", "strategy"]
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
      console.log("NODE TOOL INPUT ============", normalizedInput);
      const node = await createNode({
        type: normalizedInput.type,
        name: normalizedInput.name,
        description: normalizedInput.description,
        organizationId: organization.id,
        ontologyId: ontology.id
      });
      console.log("NODE CREATED WITH TOOL USE", node);
      return { success: true, data: node };
    }
    
    else if (tool === 'create_relationship') {
      console.log("RELATIONSHIP TOOL INPUT ============", normalizedInput);
      const relationship = await connectNodes(
        normalizedInput.fromNodeId,
        normalizedInput.toNodeId,
        normalizedInput.relationType,
        organization.id,
        ontology.id
      );  
      console.log("RELATIONSHIP CREATED WITH TOOL USE", relationship);
      return { success: true, data: relationship };
    }

    else if (tool === 'delete_node_with_strategy') {
      console.log("DELETE NODE TOOL INPUT ============", normalizedInput);
      const result = await deleteNodeWithStrategy(
        normalizedInput.nodeId,
        normalizedInput.strategy
      );
      console.log("NODE DELETED WITH TOOL USE", result);
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
  let currentResponse = initialResponse;
  const allToolCalls: any[] = [];
  let finalTextContent = '';
  const createdNodes: Record<string, string> = {};
  const existingRelationships = new Set<string>();
  let toolCallCount = 0;
  const MAX_TOOL_CALLS = 10;

  // Extract existing relationships from the context
  const contextMessages = previousMessages.find(msg => 
    msg.role === 'assistant' && msg.content.includes('## Relationships')
  );

  if (contextMessages) {
    // Parse existing relationships from context
    const relationships = contextMessages.content
      .split('\n')
      .filter(line => line.includes('"type":"RELATIONSHIP"'))
      .map(line => {
        try {
          const rel = JSON.parse(line);
          return `${rel.fromNodeId}:${rel.toNodeId}:${rel.relationType}`;
        } catch (e) {
          console.error('Error parsing relationship:', e);
          return null;
        }
      })
      .filter(Boolean);

    // Add to Set for O(1) lookup
    relationships.forEach(rel => existingRelationships.add(rel));
  }

  while (currentResponse.stop_reason === 'tool_use' && toolCallCount < MAX_TOOL_CALLS) {
    toolCallCount++;
    
    const toolCalls = currentResponse.content
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        tool: block.name,
        input: block.input
      }));

    const currentTextContent = currentResponse.content
      .filter(block => block.type === 'text')
      .map(block => (block as MessageContentText).text)
      .join('\n');

    if (currentTextContent.trim()) {
      previousMessages.push({ 
        role: 'user', 
        content: `Tool execution result: ${currentTextContent}`
      });
    }

    // Execute each tool call and collect results
    for (const call of toolCalls) {
      if (call.tool === 'create_relationship') {
        const input = call.input.properties || call.input;
        const relationshipKey = `${input.fromNodeId}:${input.toNodeId}:${input.relationType}`;

        // Skip if relationship already exists
        if (existingRelationships.has(relationshipKey)) {
          console.log(`Skipping duplicate relationship: ${relationshipKey}`);
          continue;
        }

        const result = await executeToolCall(call.tool, input, organization, ontology);
        
        if (result.success) {
          existingRelationships.add(relationshipKey);
          allToolCalls.push(call);
          
          const toolMessage = `Successfully created relationship of type "${input.relationType}" between the nodes`;
          previousMessages.push({ 
            role: 'user', 
            content: `Tool result: ${toolMessage}`
          });

          if (onProgress) {
            await onProgress(toolMessage);
          }
        }
      } else {
        // Handle other tool calls (create_node, delete_node_with_strategy)
        const result = await executeToolCall(call.tool, call.input, organization, ontology);
        if (result.success) {
          allToolCalls.push(call);
          
          let toolMessage = 'Operation completed successfully';
          if (call.tool === 'create_node') {
            const node = result.data as NodeWithRelations;
            toolMessage = `Successfully created ${node.type.toLowerCase()} node "${node.name}"`;
          }
          
          previousMessages.push({ 
            role: 'user', 
            content: `Tool result: ${toolMessage}`
          });

          if (onProgress) {
            await onProgress(toolMessage);
          }
        }
      }
    }

    // Continue with next Claude call
    if (toolCallCount < MAX_TOOL_CALLS) {
      currentResponse = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: previousMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        })),
        tools
      });
    }
  }

  // Add final response
  const textBlocks = currentResponse.content
    .filter(block => block.type === 'text')
    .map(block => (block as MessageContentText).text);
  
  finalTextContent = textBlocks.join('\n');

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

    Tool Usage Guidelines:
    - If a user asks you to create a new node (organization, department, role, process, etc.), you should use the create_node tool.
    - If a user asks you to connect nodes or create a relationship, you should use the create_relationship tool.
    - If a user asks you to create a new node, then connect it to another node, you should first use the create_node tool, then use the create_relationship tool.
    - If a user asks you to create multiple nodes and relationships (example: "Create an organization with departments A, B, and C, with department A reporting to department B, and department C reporting to department B"), you should first use the create_node tool for each node, then use the create_relationship tool for each relationship.
		- If a user asks you to delete a node, ensure they provided an associated strategy. If they did not, ask for clarification and inform them what the options are, and what each option does.

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
    1. create_node: Create a new node
       - Required: type (${Object.values(NodeType).join(', ')}), name
   - Optional: description
   - Example: Creating a Marketing department node

    2. create_relationship: Connect nodes
       - Required: fromNodeId, toNodeId, relationType
       - Common relationships: "Uses", "Report to", "Manages"
       - Example: Connecting Marketing to CEO with "Reports To"

    3. delete_node_with_strategy: Delete a node
       - Required: nodeId, strategy
       - Strategies: "orphan", "cascade", "reconnect"
       - Example: Deleting Marketing department node with "cascade" strategy

    Guidelines:
    - Use clear, professional names for nodes
    - Write concise but informative descriptions
    - Choose appropriate relationship types
    - If uncertain, ask for clarification
    - If context provided lacks required information, ask for clarification before using a tool.
    - Explain your reasoning before making changes
    - Do not fabricate information
    - Do not include ID's in your final response

		Common Mistakes to avoid:
		- Relationships to Nodes have unique contraints, in that fromNodeId, toNodeId, and relationType must be unique. (you cannot have duplicate relationships between the same two nodes)

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

    console.log(messages)

    const initialResponse = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages,
      tools
    });

    console.log("INITIAL RESPONSE", initialResponse)
    initialResponse.content.forEach(block => {
      if (block.type === 'tool_use') {
        console.log("TOOL INPUT", block.input)
      }
    })

    // If the response indicates tool use, handle it sequentially
    if (initialResponse.stop_reason === 'tool_use') {
      return handleSequentialTools(initialResponse, organization, ontology, messages, onProgress);
    }

    // If no tool use, return the regular response
    const textContent = initialResponse.content
      .filter(block => block.type === 'text')
      .map(block => (block as MessageContentText).text)
      .join('\n');

    console.log("RETURNING TEXT TO FRONT END")
    return {
      text: textContent,
      toolCalls: null
    };

  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}


