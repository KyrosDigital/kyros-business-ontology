import { NextResponse } from 'next/server';
import { createOntology } from '@/services/ontology';

// For now, we'll use a hardcoded organization ID
// TODO: Replace with proper auth when implemented
const TEMP_ORGANIZATION_ID = "5afa6b7d-0ca6-43bb-a6d0-9f3dd7a58056";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const result = await createOntology({
      name,
      description,
      organizationId: TEMP_ORGANIZATION_ID
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error creating ontology:', error);
    return NextResponse.json(
      { error: 'Failed to create ontology' },
      { status: 500 }
    );
  }
}
