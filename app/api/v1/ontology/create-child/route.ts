import { NextResponse } from 'next/server';
import { createChildNode } from '@/services/ontology';

export async function POST(request: Request) {
	try {
		const { parentId, nodeData } = await request.json();

		if (!parentId || !nodeData || !nodeData.typeId || !nodeData.relationType || !nodeData.organizationId || !nodeData.ontologyId) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Create the child node with the user-provided relationship type
		const newNode = await createChildNode(
			parentId, 
			{
				...nodeData,
				type: nodeData.typeId // Pass typeId as type for the service
			},
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