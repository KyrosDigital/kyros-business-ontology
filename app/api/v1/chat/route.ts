import { NextResponse } from 'next/server';
import { sendMessage } from '@/lib/claude';
import { prisma } from '@/prisma/prisma-client';

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
    
    const response = await sendMessage(
      message,
      organization,
      ontology,
      previousMessages,
      filtersSet
    );
    
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