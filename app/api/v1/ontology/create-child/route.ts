import { NextResponse } from 'next/server';
import { createChildNode } from '@/services/ontology';
import { NodeType } from '@prisma/client';

export async function POST(request: Request) {
	try {
		const { parentId, nodeData } = await request.json();

		// Ensure the type is a valid NodeType enum value
		const validatedNodeData = {
			...nodeData,
			type: NodeType[nodeData.type as keyof typeof NodeType]
		};

		// Create the child node with relationship in one operation
		const newNode = await createChildNode(parentId, validatedNodeData);

		return NextResponse.json(newNode);
	} catch (error) {
		console.error('Error in create-child:', error);
		return NextResponse.json(
			{ error: 'Failed to create child node' },
			{ status: 500 }
		);
	}
}