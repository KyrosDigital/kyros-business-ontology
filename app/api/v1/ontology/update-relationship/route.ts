import { NextResponse } from 'next/server';
import { updateRelationType } from '@/services/ontology';

export async function PUT(request: Request) {
  try {
    const { sourceId, targetId, newType } = await request.json();

    if (!sourceId || !targetId || !newType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use the ontology service function which handles vector updates
    const updatedRelationship = await updateRelationType(
      sourceId,
      targetId,
      newType
    );

    return NextResponse.json(updatedRelationship);
  } catch (error) {
    console.error('Error updating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to update relationship' },
      { status: 500 }
    );
  }
} 