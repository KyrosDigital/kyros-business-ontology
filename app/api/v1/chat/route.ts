import { NextResponse } from 'next/server';
import { sendMessage } from '@/lib/claude';
import { prisma } from '@/prisma/prisma-client';
import { aiUsageService } from '@/services/ai-usage';

export async function POST(request: Request) {
  try {
    const { 
      message, 
      previousMessages, 
      activeFilters,
      organizationId,
      ontologyId
    } = await request.json();

    if (!organizationId || !ontologyId) {
      return NextResponse.json(
        { message: 'Missing organization or ontology ID' },
        { status: 400 }
      );
    }

    // Fetch organization and ontology
    const [organization, ontology] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId }
      }),
      prisma.ontology.findUnique({
        where: { id: ontologyId }
      })
    ]);

    if (!organization || !ontology) {
      return NextResponse.json(
        { message: 'Organization or ontology not found' },
        { status: 404 }
      );
    }

    const filtersSet = new Set(activeFilters as ('NODE' | 'RELATIONSHIP' | 'NOTE')[]);
    
    // Create a new TransformStream for streaming updates
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Create progress callback
    const onProgress = async (update: string) => {
      const data = JSON.stringify({ type: 'progress', content: update });
      await writer.write(new TextEncoder().encode(data + '\n'));
    };

    // Handle the message in the background
    const responsePromise = sendMessage(
      message,
      organization,
      ontology,
      previousMessages,
      filtersSet,
      onProgress
    );

    // When the response is ready, increment usage count and send response
    responsePromise.then(async (response) => {
      try {
        // Increment the AI usage count
        await aiUsageService.incrementCount(organizationId);
        
        const finalData = JSON.stringify({ type: 'complete', response });
        await writer.write(new TextEncoder().encode(finalData + '\n'));
      } catch (error) {
        console.error('Error incrementing AI usage:', error);
        // Still send the response even if tracking fails
        const finalData = JSON.stringify({ type: 'complete', response });
        await writer.write(new TextEncoder().encode(finalData + '\n'));
      } finally {
        await writer.close();
      }
    }).catch(async (error) => {
      const errorData = JSON.stringify({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      await writer.write(new TextEncoder().encode(errorData + '\n'));
      await writer.close();
    });

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { message: 'Failed to get response', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 