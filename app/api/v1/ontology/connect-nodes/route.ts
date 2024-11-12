import { NextResponse } from 'next/server'
import * as ontologyService from '@/services/ontology'

export async function POST(req: Request) {
  const { sourceId, sourceType, targetId, targetType } = await req.json()
  return NextResponse.json(
    await ontologyService.connectNodes(sourceId, sourceType, targetId, targetType)
  )
}
