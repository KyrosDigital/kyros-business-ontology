import { NextResponse } from 'next/server';
import * as ontologyService from '@/services/ontology';

export async function GET(
  request: Request,
  { params }: { params: { nodeId: string } }
) {
  try {
    const node = await ontologyService.getNode(params.nodeId);
    return NextResponse.json(node);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch node' },
      { status: 500 }
    );
  }
} 