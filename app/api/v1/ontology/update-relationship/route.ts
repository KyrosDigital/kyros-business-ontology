import { prisma } from '@/prisma/prisma-client';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const { sourceId, targetId, newType } = await request.json();

    if (!sourceId || !targetId || !newType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the existing relationship
    const existingRelationship = await prisma.nodeRelationship.findFirst({
      where: {
        fromNodeId: sourceId,
        toNodeId: targetId,
      },
    });

    if (!existingRelationship) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      );
    }

    // Update the relationship
    const updatedRelationship = await prisma.nodeRelationship.update({
      where: {
        id: existingRelationship.id,
      },
      data: {
        relationType: newType,
      },
      include: {
        fromNode: true,
        toNode: true,
      },
    });

    return NextResponse.json(updatedRelationship);
  } catch (error) {
    console.error('Error updating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to update relationship' },
      { status: 500 }
    );
  }
} 