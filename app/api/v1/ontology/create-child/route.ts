import { NextResponse } from 'next/server'
import * as ontologyService from '@/services/ontology'

export async function POST(req: Request) {
	try {
		const body = await req.json()
		const { parentId, parentType, type, name, description, apiVersion, responsibilities, taskStatus } = body

		if (!name || !type) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			)
		}

		const newNode = await ontologyService.createNode(type, {
			name,
			description,
			parentId,
			parentType,
			apiVersion,
			responsibilities,
			taskStatus
		})

		return NextResponse.json(newNode, { status: 201 })
	} catch (error) {
		console.error('Error creating node:', error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		)
	}
}