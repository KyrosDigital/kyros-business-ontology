import { NextResponse } from 'next/server';
import { createNode } from '@/services/ontology';
import { NodeType } from '@prisma/client';

// TODO: Replace with proper auth when implemented
const TEMP_ORGANIZATION_ID = "5afa6b7d-0ca6-43bb-a6d0-9f3dd7a58056";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.type || !body.name || !body.ontologyId) {
      return NextResponse.json(
        { error: 'Type, name, organizationId, and ontologyId are required fields' },
        { status: 400 }
      );
    }

    // Validate node type
    if (!Object.values(NodeType).includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid node type' },
        { status: 400 }
      );
    }

    const node = await createNode({
      type: body.type,
      name: body.name,
      description: body.description,
      metadata: {}, // have empty metadata for now
			organizationId: TEMP_ORGANIZATION_ID,
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