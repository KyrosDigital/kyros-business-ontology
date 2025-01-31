import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma-client';
import { aiUsageService } from '@/services/ai-usage';
import { inngest } from '@/inngest/inngest-client';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {

		const { userId }: { userId: string | null } = await auth()

    const { 
      message, 
      organizationId,
      ontologyId,
      attachment
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

    // Format the prompt including any context from previous messages
    const prompt = attachment 
      ? `Context from PDF "${attachment.name}": ${attachment.text}\n\nUser request: ${message}`
      : message;

    // Trigger the AI Agent via Inngest
    await inngest.send({
      name: "ai-agent/init",
      data: {
        prompt,
        organization,
        ontology,
				userId,
				source: 'in-app'
      },
    });

    // Increment the AI usage count
    await aiUsageService.incrementCount(organizationId);

    return NextResponse.json({ 
      success: true, 
      message: "Request is being processed. You'll see updates appear in the graph as I work on it."
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process request', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 