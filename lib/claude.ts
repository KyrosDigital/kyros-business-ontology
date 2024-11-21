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
async function getRelevantContext(query: string): Promise<RelevantContext[]> {
  try {
    // Generate embedding directly using OpenAI service
    const embedding = await openAIService.generateEmbedding(query);
    
    // Search Pinecone for similar vectors
    const results = await pineconeService.querySimilar(embedding, 10);
    
    if (!results) {
      return [];
    }

    // Transform results into context with null checks
    return results
      .filter(match => match.metadata && match.score)
      .map(match => ({
        type: match.metadata!.type,
        content: match.metadata!.content,
        score: match.score!,
        metadata: match.metadata as VectorMetadata
      }))
      .filter(context => context.score > 0.1);
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

  // Create a map of nodes by ID for easy reference
  const nodeMap = new Map();
  nodes.forEach(node => {
    const metadata = node.metadata as NodeMetadata;
    nodeMap.set(metadata.id, {
      type: metadata.nodeType,
      name: metadata.name,
      description: metadata.description,
      metadata: metadata.metadataStr ? JSON.parse(metadata.metadataStr) : {},
      relationships: []
    });
  });

  // Add relationships to the node map
  relationships.forEach(rel => {
    const metadata = rel.metadata as RelationshipMetadata;
    
    // Add outgoing relationship
    if (nodeMap.has(metadata.fromNodeId)) {
      nodeMap.get(metadata.fromNodeId).relationships.push({
        type: 'outgoing',
        relationType: metadata.relationType,
        targetType: metadata.toNodeType,
        targetName: metadata.toNodeName
      });
    }

    // Add incoming relationship
    if (nodeMap.has(metadata.toNodeId)) {
      nodeMap.get(metadata.toNodeId).relationships.push({
        type: 'incoming',
        relationType: metadata.relationType,
        sourceType: metadata.fromNodeType,
        sourceName: metadata.fromNodeName
      });
    }
  });

  // Format nodes with their relationships
  if (nodeMap.size > 0) {
    prompt += "## Entities and Their Relationships\n\n";
    nodeMap.forEach((node, id) => {
      prompt += `### ${node.type}: ${node.name}\n`;
      if (node.description) {
        prompt += `Description: ${node.description}\n`;
      }
      if (Object.keys(node.metadata).length > 0) {
        prompt += `Properties: ${JSON.stringify(node.metadata)}\n`;
      }

      // Format relationships
      if (node.relationships.length > 0) {
        prompt += "\nConnections:\n";
        node.relationships.forEach(rel => {
          if (rel.type === 'outgoing') {
            prompt += `- ${rel.relationType} → ${rel.targetType} "${rel.targetName}"\n`;
          } else {
            prompt += `- ${rel.sourceType} "${rel.sourceName}" ${rel.relationType} → This Entity\n`;
          }
        });
      }
      prompt += "\n";
    });
  }

  // Add relevant notes with context
  if (notes.length > 0) {
    prompt += "## Related Notes\n\n";
    notes.forEach(note => {
      const metadata = note.metadata as NoteMetadata;
      const relatedNode = nodeMap.get(metadata.nodeId);
      const nodeContext = relatedNode ? ` (regarding ${relatedNode.type} "${relatedNode.name}")` : '';
      prompt += `- From ${metadata.author}${nodeContext}: ${metadata.content}\n`;
    });
    prompt += "\n";
  }

  return prompt;
}

export async function sendMessage(
  message: string,
  previousMessages: { role: string; content: string }[]
) {
  try {
    // Get relevant context based on the user's message
    const relevantContext = await getRelevantContext(message);
    const contextPrompt = formatContextForPrompt(relevantContext);

    console.log('Relevant context:', contextPrompt); // Debug log

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

    // Debug logs
    console.log('Claude response:', response.content);

    // Check if we have a response and it has content
    if (!response.content || response.content.length === 0) {
      throw new Error('Empty response from Claude');
    }

    // Get the text content from the response
    const text = response.content[0].text;
    
    if (!text) {
      throw new Error('No text in Claude response');
    }

    return text;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}
