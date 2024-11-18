import { NextResponse } from 'next/server'
import * as ontologyService from '@/services/ontology'

export async function POST(req: Request) {
  try {
    const { fromNodeId, toNodeId, relationType } = await req.json();
    
    if (!fromNodeId || !toNodeId) {
      return NextResponse.json(
        { error: 'Missing required node IDs' },
        { status: 400 }
      )
    }

    const result = await ontologyService.connectNodes(
      fromNodeId,
      toNodeId,
      relationType || 'PARENT_CHILD'
    )
    
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect nodes' },
      { status: 500 }
    )
  }
}
