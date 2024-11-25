import Anthropic from '@anthropic-ai/sdk';
import { PineconeService, type VectorMetadata } from '@/services/pinecone';
import { openAIService } from '@/services/openai';
import { NodeType } from '@prisma/client';
import type { Organization, Ontology } from '@prisma/client';
import { Tool } from '@anthropic-ai/sdk/resources/messages.mjs';
import { createNode, connectNodes } from '@/services/ontology';
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
  }
];

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
    if (tool === 'create_node') {
      const node = await createNode({
        type: input.type,
        name: input.name,
        description: input.description,
        organizationId: organization.id,
        ontologyId: ontology.id
      });
      console.log("NODE CREATED WITH TOOL USE", node)
      return { success: true, data: node };
    }
    
    else if (tool === 'create_relationship') {
      const relationship = await connectNodes(
        input.fromNodeId,
        input.toNodeId,
        input.relationType,
        organization.id,
        ontology.id
      );
      console.log("RELATIONSHIP CREATED WITH TOOL USE", relationship)
      return { success: true, data: relationship };
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
  previousMessages: { role: string; content: string }[]
): Promise<{ text: string; toolCalls: any[] | null }> {
  let currentResponse = initialResponse;
  let allToolCalls: any[] = [];
  let finalTextContent = '';
  
  // Keep processing while we get tool_use stop reasons
  while (currentResponse.stop_reason === 'tool_use') {
    const toolCalls = currentResponse.content
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        tool: block.name,
        input: block.input
      }));

    // Get any text content from the current response
    const currentTextContent = currentResponse.content
      .filter(block => block.type === 'text')
      .map(block => (block as MessageContentText).text)
      .join('\n');

    // Only add assistant message if there's actual text content
    if (currentTextContent.trim()) {
      previousMessages.push({ 
        role: 'assistant', 
        content: currentTextContent
      });
    }

    // Execute each tool call and collect results
    for (const call of toolCalls) {
      const result = await executeToolCall(call.tool, call.input, organization, ontology);
      allToolCalls.push(call);

      // Prepare the message about tool execution for Claude
      let toolMessage: string;
      if (result.success) {
        if (call.tool === 'create_node') {
          const node = result.data as NodeWithRelations;
          toolMessage = `Successfully created ${call.input.type.toLowerCase()} node "${node.name}" with ID: ${node.id}`;
        } else if (call.tool === 'create_relationship') {
          toolMessage = `Successfully created relationship of type "${call.input.relationType}" between the nodes`;
        } else {
          toolMessage = 'Tool executed successfully';
        }
      } else {
        toolMessage = `Tool execution failed: ${result.error}`;
      }

      console.log("TOOL MESSAGE", toolMessage)

      // Add the tool result to previous messages
      previousMessages.push({ role: 'user', content: toolMessage });

      // Get next response from Claude
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

    // Collect text content from the response
    const textBlocks = currentResponse.content
      .filter(block => block.type === 'text')
      .map(block => (block as MessageContentText).text);
    
    finalTextContent = textBlocks.join('\n');
  }

  // Return the final response with all tool calls
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
  activeFilters?: Set<'NODE' | 'RELATIONSHIP' | 'NOTE'>
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

    When responding:
    1. Always use markdown formatting for your responses
    - Use headers (##) for main sections
    - Use bullet points for lists
    - Use **bold** for emphasis
    - Use \`code blocks\` for technical terms
    - Use > for important quotes or callouts
    - Break up long responses into clear sections
    2. If the user is asking for information, provide clear explanations using the available context
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

    Guidelines:
    - Use clear, professional names for nodes
    - Write concise but informative descriptions
    - Choose appropriate relationship types
    - If uncertain, ask for clarification
    - If context provided lacks required information, ask for clarification before using a tool.
    - Explain your reasoning before making changes
    - Do not fabricate information
    - Do not include ID's in your final response

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

    // If the response indicates tool use, handle it sequentially
    if (initialResponse.stop_reason === 'tool_use') {
      return handleSequentialTools(initialResponse, organization, ontology, messages);
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


