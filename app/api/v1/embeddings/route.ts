import { NextResponse } from 'next/server';
import { openAIService } from '@/services/openai';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    const embedding = await openAIService.generateEmbedding(text);
    return NextResponse.json({ embedding });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json(
      { message: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
} 