import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY!,
	dangerouslyAllowBrowser: true // TODO: make this entire interaction server side only. 
});

function cleanJsonLd(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => cleanJsonLd(item));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip these fields
      if (['version', 'versionDate', 'previousVersion', 'author', 'dateCreated', '@id'].includes(key)) {
        continue;
      }
      cleaned[key] = cleanJsonLd(value);
    }
    return cleaned;
  }
  
  return obj;
}

export async function sendMessage(
  message: string, 
  previousMessages: { role: string, content: string }[], 
  jsonld: any
) {
  try {
    const cleanedJsonld = cleanJsonLd(jsonld);
    const minifiedJsonld = JSON.stringify(cleanedJsonld);
    
    const systemMessage = {
      role: 'assistant',
      content: `You are an AI assistant helping users understand their business structure and processes. You have access to a detailed business ontology that describes:
- Organizational structure and departments
- Roles and responsibilities
- Business processes and workflows
- Integrations and software tools
- Data sources and analytics
- AI components and their uses

The full ontology data is here: ${minifiedJsonld}

Please format your responses using markdown:
- Use headers (##) for main sections
- Use bullet points for lists
- Use **bold** for emphasis
- Use \`code blocks\` for technical terms
- Use > for important quotes or callouts
- Break up long responses into clear sections

Use this information to provide specific, contextual answers about the organization's structure, processes, and systems.`
    };

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [
        systemMessage,
        ...previousMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: message }
      ],
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}
