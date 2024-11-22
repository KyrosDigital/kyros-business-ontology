import { getGraphData } from '@/services/ontology';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ontologyId = searchParams.get('ontologyId');

    if (!ontologyId) {
      return NextResponse.json(
        { error: 'ontologyId is required' },
        { status: 400 }
      );
    }

    const data = await getGraphData(ontologyId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  }
} 