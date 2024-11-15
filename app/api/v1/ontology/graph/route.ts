import { getGraphData } from '@/services/ontology';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await getGraphData();
    
    // Create response with cache headers
    const response = NextResponse.json(data);
    
    // Add cache control headers
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    return response;
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  }
} 