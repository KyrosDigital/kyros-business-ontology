import { NextResponse } from 'next/server'
import { createDepartment } from '@/services/ontology'

export async function POST(req: Request) {
	try {
		const body = await req.json()
		const { parentId, parentType, name, description } = body

		if (!parentId || !name) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			)
		}

		if (parentType === 'Organization') {
			const department = await createDepartment(parentId, { name, description })
			return NextResponse.json(department, { status: 201 })
		}

		return NextResponse.json(
			{ error: `Creating children of type ${parentType} is not yet supported` },
			{ status: 400 }
		)
	} catch (error) {
		console.error('Error creating child node:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}