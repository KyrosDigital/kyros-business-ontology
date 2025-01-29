import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the expected vector dimensions for the ada-002 model
const EMBEDDING_DIMENSIONS = 1536;

interface ChatCompletionOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  tools?: any[];
  tool_choice?: "none" | "auto" | { type: "function"; function: { name: string } };
}

interface ChatCompletionResponse {
  content: string | null;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export class OpenAIService {
  /**
   * Generate chat completion using GPT-4
   */
  async generateChatCompletion(
    messages: ChatCompletionMessageParam[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await openai.chat.completions.create({
        model: options.model || 'gpt-4-turbo-preview',
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens,
        tools: options.tools,
        tool_choice: options.tool_choice
      });

      const message = response.choices[0].message;

      return {
        content: message.content,
        usage: response.usage,
        finish_reason: response.choices[0].finish_reason,
        tool_calls: message.tool_calls
      };
    } catch (error) {
      console.error('Error generating chat completion:', error);
      throw new Error('Failed to generate chat completion');
    }
  }

  /**
   * Generate embeddings for text content
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        input: text,
        model: "text-embedding-ada-002"
      });

      const embedding = response.data[0].embedding;

      // Validate embedding dimensions
      if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Invalid embedding dimensions. Expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`);
      }

      // Validate that all values are numbers
      if (!embedding.every(value => typeof value === 'number' && !isNaN(value))) {
        throw new Error('Invalid embedding values: all values must be numbers');
      }

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await openai.embeddings.create({
        input: texts,
        model: "text-embedding-ada-002"
      });

      const embeddings = response.data.map(item => item.embedding);

      // Validate all embeddings
      embeddings.forEach((embedding, index) => {
        if (embedding.length !== EMBEDDING_DIMENSIONS) {
          throw new Error(`Invalid embedding dimensions for text ${index}. Expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`);
        }
        if (!embedding.every(value => typeof value === 'number' && !isNaN(value))) {
          throw new Error(`Invalid embedding values for text ${index}: all values must be numbers`);
        }
      });

      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }
}

export const openAIService = new OpenAIService();
