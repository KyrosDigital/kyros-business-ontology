import { NextResponse } from 'next/server';
import { createNode } from '@/services/ontology';
import { NodeType } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.type || !body.name) {
      return NextResponse.json(
        { error: 'Type and name are required fields' },
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