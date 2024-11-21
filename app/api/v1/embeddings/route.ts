import { NextResponse } from 'next/server';
import { openAIService } from '@/services/openai';
import { generateNodeEmbeddingContent } from '@/services/ontology';
import prisma from '@/prisma/prisma-client';

export async function POST(request: Request) {
  try {
    const { nodeId } = await request.json();
    
    // Fetch the complete node data with relations and notes
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        fromRelations: {
          include: {
            toNode: {
              select: {
                type: true,
                name: true,
              },
            },
          },
        },
        toRelations: {
          include: {
            fromNode: {
              select: {
                type: true,
                name: true,
              },
            },
          },
        },
        notes: true,
      },
    });

    if (!node) {
      return NextResponse.json(
        { message: 'Node not found' },
        { status: 404 }
      );
    }

    // Generate rich content for embedding
    const content = generateNodeEmbeddingContent(node);
    
    // Generate embedding
    const embedding = await openAIService.generateEmbedding(content);
    
    return NextResponse.json({ embedding, content });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json(
      { message: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
} 