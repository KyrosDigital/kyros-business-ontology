import { NextResponse } from 'next/server';
import { listOntologies } from '@/services/ontology';

// For now, we'll use a hardcoded organization ID
// TODO: Replace with proper auth when implemented
const TEMP_ORGANIZATION_ID = "5afa6b7d-0ca6-43bb-a6d0-9f3dd7a58056";

export async function GET() {
  try {
    // Use the ontology service to fetch ontologies
    const result = await listOntologies(TEMP_ORGANIZATION_ID);

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