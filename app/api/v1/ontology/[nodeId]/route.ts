import { NextRequest, NextResponse } from 'next/server';
import { getNodeWithDetails, updateNode, deleteNode, deleteNodeWithStrategy } from '@/services/ontology';

export async function GET(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const node = await getNodeWithDetails(params.nodeId);
    if (!node) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(node);
  } catch (error) {
    console.error('Error fetching node:', error);
    return NextResponse.json(
      { error: 'Failed to fetch node' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const data = await request.json();
    const updatedNode = await updateNode(params.nodeId, data);
    return NextResponse.json(updatedNode);
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { nodeId: string } }
) {
  try {
    const nodeId = params.nodeId;
    let strategy: 'orphan' | 'cascade' | 'reconnect' = 'orphan';
    
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const body = await request.json();
      strategy = body.strategy || 'orphan';
    }
    
    const result = await deleteNodeWithStrategy(nodeId, strategy);
    
    if (result === null) {
      return new Response(JSON.stringify({ error: 'Node not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting node:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete node' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 