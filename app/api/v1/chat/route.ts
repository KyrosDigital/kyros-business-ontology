import { NextResponse } from 'next/server';
import { sendMessage } from '@/lib/claude';

export async function POST(request: Request) {
  try {
    const { message, previousMessages } = await request.json();
    const response = await sendMessage(message, previousMessages);
    
    if (!response) {
      return NextResponse.json(
        { message: 'No response from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { message: 'Failed to get response', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 