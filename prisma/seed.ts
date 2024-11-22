import { prisma } from "./prisma-client"
import { NodeType } from "@prisma/client"
import { openAIService } from "../services/openai"
import { PineconeService, createPineconeService } from "../services/pinecone"
import { generateNodeEmbeddingContent } from "../services/ontology"

async function main() {
	// Create the organization
	const organization = await prisma.organization.create({
		data: {
			name: "Kyros Digital LLC",
			description: "Modern software development and digital transformation company",
			pineconeIndex: "kyros-digital-index",
		}
	});

	// Create Pinecone index for the organization
	await PineconeService.createOrgIndex(organization.pineconeIndex);

	// Create a user in the organization
	const user = await prisma.user.create({
		data: {
			email: "admin@kyrosdigital.com",
			name: "Admin User",
			organizationId: organization.id
		}
	});

	// Create an ontology for the organization
	const ontology = await prisma.ontology.create({
		data: {
			name: "Kyros Digital Operations",
			description: "Core operational structure and processes",
			organizationId: organization.id,
		}
	});

	// Initialize PineconeService for this ontology
	const pineconeService = createPineconeService(organization, ontology);

	// Create departments with vectors
	const departmentData = [
		{
			type: NodeType.DEPARTMENT,
			name: "Engineering",
				description: "Core software development and technical operations",
				metadata: {
					headcount: 25,
					location: "Hybrid"
				},
				ontologyId: ontology.id
		},
		// ... other departments
	];

	const departments = await Promise.all(
		departmentData.map(async (dept) => {
			const node = await prisma.node.create({
				data: dept,
				include: {
					fromRelations: {
						include: {
							toNode: {
								select: {
									id: true,
									type: true,
									name: true
								}
							}
						}
					},
					toRelations: {
						include: {
							fromNode: {
								select: {
									id: true,
									type: true,
									name: true
								}
							}
						}
					},
					notes: true
				}
			});

			const content = generateNodeEmbeddingContent(node);
			const vector = await openAIService.generateEmbedding(content);
			const vectorId = await pineconeService.upsertNodeVector(
				node.id,
				vector,
				node,
				content
			);

			return prisma.node.update({
				where: { id: node.id },
				data: { vectorId }
			});
		})
	);

	// Create relationships with vectors
	const relationshipData = [
		{
			fromNodeId: departments[0].id,
			toNodeId: departments[1].id,
			relationType: "COLLABORATES_WITH",
			ontologyId: ontology.id,
			text: "Engineering COLLABORATES_WITH Product"
		}
		// ... other relationships
	];

	await Promise.all(
		relationshipData.map(async (rel) => {
			const relationship = await prisma.nodeRelationship.create({
				data: {
					fromNodeId: rel.fromNodeId,
					toNodeId: rel.toNodeId,
					relationType: rel.relationType,
					ontologyId: rel.ontologyId
				},
				include: {
					fromNode: true,
					toNode: true
				}
			});

			const vector = await openAIService.generateEmbedding(rel.text);
			
			const fromNodeData = {
				id: relationship.fromNode.id,
				type: relationship.fromNode.type,
				name: relationship.fromNode.name
			};

			const toNodeData = {
				id: relationship.toNode.id,
				type: relationship.toNode.type,
				name: relationship.toNode.name
			};

			const vectorId = await pineconeService.upsertRelationshipVector(
				relationship.id,
				vector,
				fromNodeData,
				toNodeData,
				relationship.relationType,
				rel.text
			);

			return prisma.nodeRelationship.update({
				where: { id: relationship.id },
				data: { vectorId }
			});
		})
	);

	// Create notes with vectors
	const noteData = [
		{
			content: "Implementing new security protocols across all engineering tools",
			author: "Security Team",
			nodeId: departments[0].id,
			ontologyId: ontology.id
		}
		// ... other notes
	];

	await Promise.all(
		noteData.map(async (note) => {
			const noteRecord = await prisma.note.create({
				data: note,
				include: {
					node: true
				}
			});

			const vector = await openAIService.generateEmbedding(note.content);
			const vectorId = await pineconeService.upsertNoteVector(
				noteRecord.id,
				vector,
				note.content,
				note.author,
				note.nodeId
			);

			return prisma.note.update({
				where: { id: noteRecord.id },
				data: { vectorId }
			});
		})
	);

	console.log(`
Seed completed successfully:
- Organization '${organization.name}' created with Pinecone index '${organization.pineconeIndex}'
- User '${user.name}' (${user.email}) created
- Ontology '${ontology.name}' created
- Sample nodes, relationships, and notes created with vectors
  `);
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
