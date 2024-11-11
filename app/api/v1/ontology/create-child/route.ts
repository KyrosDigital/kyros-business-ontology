import { NextResponse } from 'next/server'
import * as ontologyService from '@/services/ontology'

export async function POST(req: Request) {
	try {
		const body = await req.json()
		const { parentId, parentType, type, name, description } = body

		if (!parentId || !name) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			)
		}

		let newNode;

		switch (parentType) {
			case 'Organization':
				newNode = await ontologyService.createDepartment(parentId, { name, description });
				break;

			case 'Department':
				switch (type) {
					case 'Role':
						newNode = await ontologyService.createRole(parentId, {
							name,
							responsibilities: description
						});
						break;
					case 'Process':
						newNode = await ontologyService.createProcess(parentId, {
							name,
							description
						});
						break;
					// Add cases for other department children
					default:
						throw new Error(`Invalid child type ${type} for Department`);
				}
				break;

			case 'Process':
				switch (type) {
					case 'Task':
						newNode = await ontologyService.createTask(parentId, {
							name,
							description
						});
						break;
					// Add cases for Integration and DataSource
					default:
						throw new Error(`Invalid child type ${type} for Process`);
				}
				break;

			default:
				return NextResponse.json(
					{ error: `Creating children for ${parentType} is not supported` },
					{ status: 400 }
				)
		}

		return NextResponse.json(newNode, { status: 201 })
	} catch (error) {
		console.error('Error creating child node:', error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		)
	}
}