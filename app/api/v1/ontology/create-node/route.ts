import { NextResponse } from 'next/server';
import { createNode } from '@/services/ontology';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.type || !body.name || !body.ontologyId || !body.organizationId) {
      return NextResponse.json(
        { error: 'Type, name, organizationId, and ontologyId are required fields' },
        { status: 400 }
      );
    }

    const node = await createNode({
      type: body.type,
      name: body.name,
      description: body.description,
      metadata: {}, // have empty metadata for now
      organizationId: body.organizationId,
      ontologyId: body.ontologyId
    });

    return NextResponse.json(node);
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: 'Failed to create node' },
      { status: 500 }
    );
  }
} 