import Anthropic from '@anthropic-ai/sdk';
import { PineconeService, type VectorMetadata } from '@/services/pinecone';
import { openAIService } from '@/services/openai';
import { NodeType } from '@prisma/client';
import type { Organization, Ontology } from '@prisma/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Define tool schemas
const tools = [
  {
    name: 'create_node',
    description: "Create a new node in the graph. Use this when you need to add a new entity to the organizational structure.",
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
    description: "Create a relationship between two existing nodes. Use this to establish connections in the organizational structure.",
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
          description: "The type of relationship (e.g., 'PARENT_CHILD', 'USES', 'REPORTS_TO', 'MANAGES')"
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
  let prompt = "Here's the relevant information from the organizational structure:\n\n";

  // Group contexts by type
  const nodes = contexts.filter(c => c.type === 'NODE');
  const relationships = contexts.filter(c => c.type === 'RELATIONSHIP');
  const notes = contexts.filter(c => c.type === 'NOTE');

  // Format Nodes by their type
  if (nodes.length > 0) {
    // Group nodes by their nodeType
    const nodesByType = nodes.reduce((acc, node) => {
      const metadata = node.metadata as NodeMetadata;
      const nodeType = metadata.nodeType;
      if (!acc[nodeType]) {
        acc[nodeType] = [];
      }
      acc[nodeType].push({
        name: metadata.name,
        description: metadata.description,
        metadata: metadata.metadataStr ? JSON.parse(metadata.metadataStr) : {}
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Format each node type group
    Object.entries(nodesByType).forEach(([type, nodes]) => {
      prompt += `## ${type}s\n\n`;
      nodes.forEach(node => {
        prompt += `- **${node.name}**\n`;
        if (node.description) {
          prompt += `  - Description: ${node.description}\n`;
        }
        if (Object.keys(node.metadata).length > 0) {
          Object.entries(node.metadata).forEach(([key, value]) => {
            prompt += `  - ${key}: ${JSON.stringify(value)}\n`;
          });
        }
        prompt += '\n';
      });
    });
  }

  // Format Relationships if any
  if (relationships.length > 0) {
    prompt += `## Relationships\n\n`;
    relationships.forEach(rel => {
      const metadata = rel.metadata as RelationshipMetadata;
      prompt += `- ${metadata.fromNodeName} (${metadata.fromNodeType}) ${metadata.relationType} ${metadata.toNodeName} (${metadata.toNodeType})\n`;
    });
    prompt += '\n';
  }

  // Format Notes if any
  if (notes.length > 0) {
    prompt += `## Notes\n\n`;
    notes.forEach(note => {
      const metadata = note.metadata as NoteMetadata;
      prompt += `- From ${metadata.author}: ${metadata.content}\n`;
    });
    prompt += '\n';
  }

  return prompt;
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

    const systemPrompt = `You are an AI assistant helping users understand and modify their business structure and processes. 
    Users will ask you questions pertaining to the graph they see.
    Users in this application are able to document an ontology by adding nodes and relationships to the graph.
    Nodes represent entities like departments, roles, processes, etc. Relationships represent connections between nodes.
    You have access to relevant information about the organization that has been retrieved based on the user's query.

${contextPrompt}

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
   - Common relationships: PARENT_CHILD, USES, REPORTS_TO, MANAGES
   - Example: Connecting Marketing to CEO with REPORTS_TO

Guidelines:
- Use clear, professional names for nodes
- Write concise but informative descriptions
- Choose appropriate relationship types
- If uncertain, ask for clarification
- Explain your reasoning before making changes`;

    const messages = [
      { role: 'assistant' as const, content: systemPrompt },
      ...previousMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      { role: 'user' as const, content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages,
      tools
    });

    console.log(response)
    console.log(response.content[1].input)

    if (!response.content || response.content.length === 0) {
      throw new Error('Empty response from Claude');
    }

    // Extract tool calls and text separately
    const toolCalls = response.content
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        tool: block.name,
        input: block.input
      }));

    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n\n');

    return {
      text: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : null
    };

  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}
