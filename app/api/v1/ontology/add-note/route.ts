import { NextResponse } from 'next/server'
import * as ontologyService from '@/services/ontology'

export async function POST(req: Request) {
  const { nodeId, content, author } = await req.json()
  return NextResponse.json(
    await ontologyService.addNote({ nodeId, content, author })
  )
}
