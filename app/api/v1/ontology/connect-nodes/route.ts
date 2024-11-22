import { NextResponse } from 'next/server'
import * as ontologyService from '@/services/ontology'

export async function POST(req: Request) {
  try {
    const { fromNodeId, toNodeId, relationType, organizationId, ontologyId } = await req.json();
    
    if (!fromNodeId || !toNodeId || !organizationId || !ontologyId) {
      return NextResponse.json(
        { error: 'fromNodeId, toNodeId, organizationId, and ontologyId are required fields' },
        { status: 400 }
      )
    }

    const result = await ontologyService.connectNodes(
      fromNodeId,
      toNodeId,
      relationType || 'PARENT_CHILD',
      organizationId,
      ontologyId
    )
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error connecting nodes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect nodes' },
      { status: 500 }
    )
  }
}
