import Anthropic from '@anthropic-ai/sdk';
import { pineconeService } from '@/services/pinecone';
import { openAIService } from '@/services/openai';
import { VectorMetadata } from '@/services/pinecone';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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
  activeFilters?: Set<'NODE' | 'RELATIONSHIP' | 'NOTE'>
): Promise<RelevantContext[]> {
  try {
    const embedding = await openAIService.generateEmbedding(query);
    const results = await pineconeService.querySimilar(embedding, 10, activeFilters);
    
    if (!results) {
      return [];
    }

    console.log('Results:', results);

    return results
      .filter(match => match.metadata && match.score)
      .map(match => ({
        type: match.metadata!.type,
        content: match.metadata!.content,
        score: match.score!,
        metadata: match.metadata as VectorMetadata
      }))
      .filter(context => context.score > 0.5);
  } catch (error) {
    console.error('Error getting relevant context:', error);
    throw new Error('Failed to generate embedding');
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
  previousMessages: { role: string; content: string }[],
  activeFilters?: Set<'NODE' | 'RELATIONSHIP' | 'NOTE'>
) {
  try {
    const relevantContext = await getRelevantContext(message, activeFilters);
    const contextPrompt = formatContextForPrompt(relevantContext);

    console.log('Relevant context:', contextPrompt);

    const messages = [
      {
        role: 'assistant' as const,
        content: `You are an AI assistant helping users understand their business structure and processes. 
You have access to relevant information about the organization that has been retrieved based on the user's query.

${contextPrompt}

Please use this context to provide specific, accurate answers about the organization.
Format your responses using markdown:
- Use headers (##) for main sections
- Use bullet points for lists
- Use **bold** for emphasis
- Use \`code blocks\` for technical terms
- Use > for important quotes or callouts
- Break up long responses into clear sections

If you're not confident about something based on the available context, acknowledge the uncertainty and suggest what additional information might be helpful.`
      },
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
    });

    if (!response.content || response.content.length === 0) {
      throw new Error('Empty response from Claude');
    }

    return response.content[0].text;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}
