import { NextResponse } from 'next/server'
import * as ontologyService from '@/services/ontology'

export async function POST(req: Request) {
  try {
    const { nodeId, content, author, organizationId, ontologyId } = await req.json()

    // Validate required fields
    if (!nodeId || !content || !author || !organizationId || !ontologyId) {
      return NextResponse.json(
        { error: 'nodeId, content, author, organizationId, and ontologyId are required fields' },
        { status: 400 }
      );
    }

    const note = await ontologyService.addNote({ 
      nodeId, 
      content, 
      author,
      organizationId,
      ontologyId
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Error adding note:', error);
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    );
  }
}
