import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma-client';
import { aiUsageService } from '@/services/ai-usage';
import { inngest } from '@/inngest/inngest-client';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId }: { userId: string | null } = await auth();

    if (!userId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { 
      message, 
      previousMessages, 
      activeFilters,
      organizationId,
      ontologyId,
      attachment
    } = await request.json();

    if (!organizationId || !ontologyId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
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
        ontology,
        userId,
        attachment
      }
    });

    // For now, return a simple acknowledgment
    return NextResponse.json({
      message: "AI Agent process started",
      status: "processing",
      userId
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { message: 'Failed to start AI Agent', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 