import { NextResponse } from 'next/server';
import { listOntologies } from '@/services/ontology';

export async function GET(request: Request) {
  try {
    // Get organizationId from URL params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Use the ontology service to fetch ontologies
    const result = await listOntologies(organizationId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in ontologies route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ontologies' },
      { status: 500 }
    );
  }
} 