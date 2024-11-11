import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY!,
	dangerouslyAllowBrowser: true // TODO: make this entire interaction server side only. 
});

export async function sendMessage(
  message: string, 
  previousMessages: { role: string, content: string }[], 
  jsonld: any
) {
  try {
    // Minify the JSON-LD by removing unnecessary whitespace
    const minifiedJsonld = JSON.stringify(jsonld);
    
    // Create a system message with the JSON-LD context
    const systemMessage = {
      role: 'assistant',
      content: `You are an AI assistant with access to the following JSON-LD data about this page: ${minifiedJsonld}. 
                Use this context to provide more informed answers when relevant.`
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
