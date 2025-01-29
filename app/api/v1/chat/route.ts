import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma-client';
import { aiUsageService } from '@/services/ai-usage';
import { inngest } from '@/inngest/inngest-client';

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

    // Trigger the AI Agent init function via Inngest
    await inngest.send({
      name: "ai-agent/init",
      data: {
        prompt: message,
        organization,
        ontology
      }
    });

    // For now, return a simple acknowledgment
    // Later we'll implement proper streaming and feedback
    return NextResponse.json({
      message: "AI Agent process started",
      status: "processing"
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { message: 'Failed to start AI Agent', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 