import { NextResponse } from 'next/server'
import { getOntologyData } from '@/services/ontology'

export async function GET() {
  try {
    const ontologyData = await getOntologyData()
    
    if (!ontologyData) {
      return NextResponse.json(
        { error: 'No organization data found' },
        { status: 404 }
      )
    }

    return NextResponse.json(ontologyData)
  } catch (error) {
    console.error('Error fetching ontology data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
