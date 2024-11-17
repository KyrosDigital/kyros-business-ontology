import { NextResponse } from 'next/server';
import { createChildNode } from '@/services/ontology';
import { NodeType } from '@prisma/client';

export async function POST(request: Request) {
	try {
		const { parentId, nodeData } = await request.json();

		if (!parentId || !nodeData || !nodeData.type || !nodeData.relationType) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Ensure the type is a valid NodeType enum value
		const validatedNodeData = {
			...nodeData,
			type: NodeType[nodeData.type as keyof typeof NodeType]
		};

		// Create the child node with the user-provided relationship type
		const newNode = await createChildNode(
			parentId, 
			validatedNodeData,
			nodeData.relationType
		);
		
		return NextResponse.json(newNode);
	} catch (error) {
		console.error('Error in create-child:', error);
		return NextResponse.json(
			{ error: 'Failed to create child node' },
			{ status: 500 }
		);
	}
}