import { prisma } from "./prisma-client"

async function main() {
	// Create the organization
	const org = await prisma.organization.upsert({
		where: { id: "550e8400-e29b-41d4-a716-446655440000" },
		update: {},
		create: {
			id: "550e8400-e29b-41d4-a716-446655440000",
			name: "Kyros Digital LLC",
			url: "https://example.com",
			description: "A business demonstrating an ontology for organizational structure, roles, workflows, integrations, data sources, AI/ML, analytics, and tools.",
			streetAddress: "123 Main St",
			city: "Anytown",
			state: "CA",
			postalCode: "12345",
			country: "US",
			phone: "+1-123-555-0123",
			contactType: "Customer Service",
		}
	})

	// Create departments
	const departments = await Promise.all([
		prisma.department.create({
			data: {
				id: "dept_7b44c642-0a1c-4c6b-b8da-c113b8aef817",
				name: "Human Resources",
				description: "Oversees employee recruitment, benefits, and compliance.",
				orgId: org.id,
			}
		}),
		prisma.department.create({
			data: {
				id: "dept_91b0f0a1-754f-4ef1-a5c7-f1c3b8e4d5c6",
				name: "Finance",
				description: "Manages financial planning, accounting, and budgeting.",
				orgId: org.id,
			}
		}),
		// ... similar pattern for IT and Operations departments ...
		prisma.department.create({
			data: {
				id: "dept_4d7c6b5a-3e2d-1f0e-9a8b-7c6d5e4f3a2b",
				name: "Sales",
				description: "Handles sales operations and customer outreach.",
				orgId: org.id,
				roles: {
					create: [
						{
							id: "role_8a7b6c5d-4e3f-2a1b-9c8d-7e6f5a4b3c2d",
							name: "Sales Manager",
							responsibilities: "Oversees sales strategy and manages the sales team."
						},
						{
							id: "role_9b8a7c6d-5e4f-3b2a-1c9d-8f7e6g5h4i3j",
							name: "Sales Associate",
							responsibilities: "Engages with customers and supports sales activities."
						}
					]
				},
				processes: {
					create: {
						id: "proc_7g6f5e4d-3c2b-1a0b-9d8e-7f6g5h4i3j2k",
						name: "Customer Support Process",
						description: "A process to manage customer inquiries and issues.",
					}
				},
				aiComponents: {
					create: {
						id: "ai_2l1k0j9i-8h7g-6f5e-4d3c-2i1j0k9l8m7n",
						name: "Customer Sentiment Analysis",
						description: "Analyzes customer communications to detect sentiment and flag issues."
					}
				}
			}
		})
	])

	// Create notes
	await prisma.note.create({
		data: {
			id: "note_1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
			content: "Organization structure updated to reflect new departments",
			author: "John Doe",
			dateCreated: new Date("2024-03-20"),
			orgId: org.id
		}
	})
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
