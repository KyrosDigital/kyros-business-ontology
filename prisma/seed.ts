import { prisma } from "./prisma-client"
// import { NodeType } from "@prisma/client"
// import { openAIService } from "../services/openai"
// import { PineconeService, createPineconeService } from "../services/pinecone"
// import { generateNodeEmbeddingContent } from "../services/ontology"
// import { Pinecone } from '@pinecone-database/pinecone';

// Add helper function to check and delete existing index
// async function cleanupExistingIndex(indexName: string): Promise<void> {
// 	const pinecone = new Pinecone({
// 		apiKey: process.env.PINECONE_API_KEY!
// 	});

// 	try {
// 		const indexes = await pinecone.listIndexes();
// 		const existingIndex = indexes.indexes?.find(idx => idx.name === indexName);
		
// 		if (existingIndex) {
// 			console.log(`Found existing index '${indexName}', deleting...`);
// 			await pinecone.deleteIndex(indexName);
// 			console.log(`Index '${indexName}' deleted successfully`);
			
// 			// Wait a bit to ensure the deletion is processed
// 			await new Promise(resolve => setTimeout(resolve, 20000));
// 		}
// 	} catch (error) {
// 		console.error('Error cleaning up existing index:', error);
// 		throw error;
// 	}
// }

// Add helper function to wait for index to be ready
// async function waitForIndex(indexName: string, maxAttempts = 10): Promise<void> {
// 	const pinecone = new Pinecone({
// 		apiKey: process.env.PINECONE_API_KEY!
// 	});

// 	for (let i = 0; i < maxAttempts; i++) {
// 		try {
// 			const indexes = await pinecone.listIndexes();
// 			const index = indexes.indexes?.find(idx => idx.name === indexName);
			
// 			if (index?.status?.ready) {
// 				console.log(`Index ${indexName} is ready`);
// 				return;
// 			}
			
// 			console.log(`Waiting for index ${indexName} to be ready (attempt ${i + 1}/${maxAttempts})...`);
// 			await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds between checks
// 		} catch (error) {
// 			console.log(`Error checking index status (attempt ${i + 1}/${maxAttempts}):`, error);
// 			await new Promise(resolve => setTimeout(resolve, 10000));
// 		}
// 	}
	
// 	throw new Error(`Index ${indexName} not ready after ${maxAttempts} attempts`);
// }

async function main() {
// 	console.log('Starting seed process...');

// 	// Create the organization
// 	const organization = await prisma.organization.create({
// 		data: {
// 			name: "Kyros Digital LLC",
// 			description: "Modern software development and digital transformation company",
// 			pineconeIndex: "kyros-digital-index",
// 		}
// 	});

// 	console.log('Organization created:', organization.name);

// 	// Clean up existing index if it exists
// 	console.log('Checking for existing Pinecone index...');
// 	await cleanupExistingIndex(organization.pineconeIndex);

// 	// Create new Pinecone index for the organization
// 	console.log('Creating new Pinecone index...');
// 	await PineconeService.createOrgIndex(organization.pineconeIndex);

// 	// Wait for index to be ready before proceeding
// 	console.log('Waiting for index to be ready...');
// 	await waitForIndex(organization.pineconeIndex);

// 	// Create a user in the organization
// 	const user = await prisma.user.create({
// 		data: {
// 			email: "admin@kyrosdigital.com",
// 			name: "Admin User",
// 			organizationId: organization.id
// 		}
// 	});

// 	// Create an ontology for the organization
// 	const ontology = await prisma.ontology.create({
// 		data: {
// 			name: "Kyros Digital Operations",
// 			description: "Core operational structure and processes",
// 			organizationId: organization.id,
// 		}
// 	});

// 	// Initialize PineconeService for this ontology
// 	const pineconeService = createPineconeService(organization, ontology);

// 	// Create departments with vectors
// 	const departmentData = [
// 		{
// 			type: NodeType.DEPARTMENT,
// 			name: "Engineering",
// 			description: "Core software development and technical operations",
// 			metadata: {
// 				headcount: 25,
// 				location: "Hybrid"
// 			},
// 			ontologyId: ontology.id
// 		},
// 		{
// 			type: NodeType.DEPARTMENT,
// 			name: "Product",
// 			description: "Product management and design",
// 			metadata: {
// 				headcount: 15,
// 				location: "Remote"
// 			},
// 			ontologyId: ontology.id
// 		},
// 		{
// 			type: NodeType.DEPARTMENT,
// 			name: "Operations",
// 			description: "Business operations and administration",
// 			metadata: {
// 				headcount: 10,
// 				location: "Office"
// 			},
// 			ontologyId: ontology.id
// 		}
// 	];

// 	const departments = await Promise.all(
// 		departmentData.map(async (dept) => {
// 			const node = await prisma.node.create({
// 				data: dept,
// 				include: {
// 					fromRelations: {
// 						include: {
// 							toNode: {
// 								select: {
// 									id: true,
// 									type: true,
// 									name: true
// 								}
// 							}
// 						}
// 					},
// 					toRelations: {
// 						include: {
// 							fromNode: {
// 								select: {
// 									id: true,
// 									type: true,
// 									name: true
// 								}
// 							}
// 						}
// 					},
// 					notes: true
// 				}
// 			});

// 			const content = generateNodeEmbeddingContent(node);
// 			const vector = await openAIService.generateEmbedding(content);
// 			const vectorId = await pineconeService.upsertNodeVector(
// 				node.id,
// 				vector,
// 				node,
// 				content
// 			);

// 			return prisma.node.update({
// 				where: { id: node.id },
// 				data: { vectorId }
// 			});
// 		})
// 	);

// 	// Create relationships with vectors
// 	const relationshipData = [
// 		{
// 			fromNodeId: departments[0].id,
// 			toNodeId: departments[1].id,
// 			relationType: "COLLABORATES_WITH",
// 			ontologyId: ontology.id,
// 			text: "Engineering COLLABORATES_WITH Product"
// 		},
// 		{
// 			fromNodeId: departments[1].id,
// 			toNodeId: departments[2].id,
// 			relationType: "REPORTS_TO",
// 			ontologyId: ontology.id,
// 			text: "Product REPORTS_TO Operations"
// 		}
// 	];

// 	await Promise.all(
// 		relationshipData.map(async (rel) => {
// 			const relationship = await prisma.nodeRelationship.create({
// 				data: {
// 					fromNodeId: rel.fromNodeId,
// 					toNodeId: rel.toNodeId,
// 					relationType: rel.relationType,
// 					ontologyId: rel.ontologyId
// 				},
// 				include: {
// 					fromNode: true,
// 					toNode: true
// 				}
// 			});

// 			const vector = await openAIService.generateEmbedding(rel.text);
			
// 			const fromNodeData = {
// 				id: relationship.fromNode.id,
// 				type: relationship.fromNode.type,
// 				name: relationship.fromNode.name
// 			};

// 			const toNodeData = {
// 				id: relationship.toNode.id,
// 				type: relationship.toNode.type,
// 				name: relationship.toNode.name
// 			};

// 			const vectorId = await pineconeService.upsertRelationshipVector(
// 				relationship.id,
// 				vector,
// 				fromNodeData,
// 				toNodeData,
// 				relationship.relationType,
// 				rel.text
// 			);

// 			return prisma.nodeRelationship.update({
// 				where: { id: relationship.id },
// 				data: { vectorId }
// 			});
// 		})
// 	);

// 	// Create notes with vectors
// 	const noteData = [
// 		{
// 			content: "Implementing new security protocols across all engineering tools",
// 			author: "Security Team",
// 			nodeId: departments[0].id,
// 			ontologyId: ontology.id
// 		}
// 		// ... other notes
// 	];

// 	await Promise.all(
// 		noteData.map(async (note) => {
// 			const noteRecord = await prisma.note.create({
// 				data: note,
// 				include: {
// 					node: true
// 				}
// 			});

// 			const vector = await openAIService.generateEmbedding(note.content);
// 			const vectorId = await pineconeService.upsertNoteVector(
// 				noteRecord.id,
// 				vector,
// 				note.content,
// 				note.author,
// 				note.nodeId
// 			);

// 			return prisma.note.update({
// 				where: { id: noteRecord.id },
// 				data: { vectorId }
// 			});
// 		})
// 	);

// 	console.log(`
// Seed completed successfully:
// - Organization '${organization.name}' created with Pinecone index '${organization.pineconeIndex}'
// - Pinecone index cleaned up and recreated
// - All sample data created with vectors
//   `);
}

main()
	.catch((e) => {
		console.error('Seed process failed:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
