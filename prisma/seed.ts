import { prisma } from "./prisma-client"
import { NodeType } from "@prisma/client"
import { openAIService } from "../services/openai"
import { pineconeService } from "../services/pinecone"

async function main() {
	// Create the organization
	const orgText = `Kyros Digital LLC Modern software development and digital transformation company`;
	const orgVector = await openAIService.generateEmbedding(orgText);
	
	const org = await prisma.node.create({
		data: {
			type: NodeType.ORGANIZATION,
			name: "Kyros Digital LLC",
			description: "Modern software development and digital transformation company",
			metadata: {
				industry: "Technology",
				size: "50-100",
				founded: "2020"
			}
		}
	});

	// Store org vector in Pinecone
	const orgVectorId = await pineconeService.upsertNodeVector(
		org.id,
		orgVector,
		NodeType.ORGANIZATION,
		orgText
	);

	// Update org with vector ID
	await prisma.node.update({
		where: { id: org.id },
		data: { vectorId: orgVectorId }
	});

	// Create departments with vectors
	const departmentData = [
		{
			type: NodeType.DEPARTMENT,
			name: "Engineering",
			description: "Core software development and technical operations",
			metadata: {
				headcount: 25,
				location: "Hybrid"
			}
		},
		{
			type: NodeType.DEPARTMENT,
			name: "Product",
			description: "Product management and user experience design",
			metadata: {
				headcount: 10,
				location: "Remote"
			}
		},
		{
			type: NodeType.DEPARTMENT,
			name: "People Operations",
			description: "Human resources, recruitment, and employee experience",
			metadata: {
				headcount: 5,
				location: "Hybrid"
			}
		},
		{
			type: NodeType.DEPARTMENT,
			name: "Operations",
			description: "Business operations, finance, and administrative functions",
			metadata: {
				headcount: 8,
				location: "On-site"
			}
		}
	];

	const departments = await Promise.all(
		departmentData.map(async (dept) => {
			const text = `${dept.name} ${dept.description}`;
			const vector = await openAIService.generateEmbedding(text);
			
			const node = await prisma.node.create({
				data: dept
			});

			const vectorId = await pineconeService.upsertNodeVector(
				node.id,
				vector,
				dept.type,
				text
			);

			return prisma.node.update({
				where: { id: node.id },
				data: { vectorId }
			});
		})
	);

	// Create roles with vectors
	const roleData = [
		{
			type: NodeType.ROLE,
			name: "Senior Software Engineer",
			description: "Lead development initiatives and mentor junior developers",
			metadata: {
				level: "Senior",
				yearsExperienceRequired: 5,
				skills: ["JavaScript", "Python", "Cloud Architecture"]
			}
		},
		{
			type: NodeType.ROLE,
			name: "DevOps Engineer",
			description: "Manage infrastructure and deployment pipelines",
			metadata: {
				level: "Mid-Senior",
				yearsExperienceRequired: 3,
				skills: ["AWS", "Kubernetes", "CI/CD"]
			}
		},
		{
			type: NodeType.ROLE,
			name: "Product Manager",
			description: "Lead product strategy and development",
			metadata: {
				level: "Senior",
				yearsExperienceRequired: 4,
				skills: ["Product Strategy", "Agile", "User Research"]
			}
		},
		{
			type: NodeType.ROLE,
			name: "UX Designer",
			description: "Design user interfaces and experiences",
			metadata: {
				level: "Mid",
				yearsExperienceRequired: 3,
				skills: ["Figma", "User Research", "Prototyping"]
			}
		}
	];

	const roles = await Promise.all(
		roleData.map(async (role) => {
			const text = `${role.name} ${role.description}`;
			const vector = await openAIService.generateEmbedding(text);
			
			const node = await prisma.node.create({
				data: role
			});

			const vectorId = await pineconeService.upsertNodeVector(
				node.id,
				vector,
				role.type,
				text
			);

			return prisma.node.update({
				where: { id: node.id },
				data: { vectorId }
			});
		})
	);

	// Create processes with vectors
	const processData = [
		{
			type: NodeType.PROCESS,
			name: "Agile Development",
			description: "Two-week sprint cycles with daily standups",
			metadata: {
				cycleTime: "2 weeks",
				ceremonies: ["Daily Standup", "Sprint Planning", "Retrospective"],
				tools: ["Jira", "Confluence"]
			}
		},
		{
			type: NodeType.PROCESS,
			name: "Code Review",
			description: "Peer review process for all code changes",
			metadata: {
				requiredApprovals: 2,
				automatedChecks: ["Linting", "Tests", "Security Scan"]
			}
		},
		{
			type: NodeType.PROCESS,
			name: "Product Discovery",
			description: "User research and product validation process",
			metadata: {
				phases: ["Research", "Ideation", "Validation"],
				deliverables: ["User Insights", "Prototypes", "Requirements"]
			}
		}
	];

	const processes = await Promise.all(
		processData.map(async (process) => {
			const text = `${process.name} ${process.description}`;
			const vector = await openAIService.generateEmbedding(text);
			
			const node = await prisma.node.create({
				data: process
			});

			const vectorId = await pineconeService.upsertNodeVector(
				node.id,
				vector,
				process.type,
				text
			);

			return prisma.node.update({
				where: { id: node.id },
				data: { vectorId }
			});
		})
	);

	// Create tools with vectors
	const toolData = [
		{
			type: NodeType.SOFTWARE_TOOL,
			name: "GitHub",
			description: "Version control and collaboration platform",
			metadata: {
				type: "Version Control",
				license: "Enterprise",
				integrations: ["Jira", "Slack"]
			}
		},
		{
			type: NodeType.SOFTWARE_TOOL,
			name: "AWS",
			description: "Cloud infrastructure platform",
			metadata: {
				type: "Cloud Platform",
				services: ["EC2", "S3", "Lambda"],
				region: "us-east-1"
			}
		},
		{
			type: NodeType.SOFTWARE_TOOL,
			name: "Jira",
			description: "Project management and issue tracking",
			metadata: {
				type: "Project Management",
				license: "Cloud Premium",
				integrations: ["Confluence", "GitHub"]
			}
		}
	];

	const tools = await Promise.all(
		toolData.map(async (tool) => {
			const text = `${tool.name} ${tool.description}`;
			const vector = await openAIService.generateEmbedding(text);
			
			const node = await prisma.node.create({
				data: tool
			});

			const vectorId = await pineconeService.upsertNodeVector(
				node.id,
				vector,
				tool.type,
				text
			);

			return prisma.node.update({
				where: { id: node.id },
				data: { vectorId }
			});
		})
	);

	// Create AI components with vectors
	const aiComponentData = [
		{
			type: NodeType.AI_COMPONENT,
			name: "Code Analysis AI",
			description: "AI-powered code quality and security analysis",
			metadata: {
				model: "GPT-4",
				capabilities: ["Code Review", "Security Analysis", "Optimization Suggestions"],
				integration: "GitHub Actions"
			}
		},
		{
			type: NodeType.AI_COMPONENT,
			name: "Customer Support Bot",
			description: "AI chatbot for customer support automation",
			metadata: {
				model: "Claude",
				channels: ["Website", "Slack"],
				languages: ["English", "Spanish"]
			}
		},
		{
			type: NodeType.AI_COMPONENT,
			name: "Requirements Assistant",
			description: "AI-powered requirements analysis and validation",
			metadata: {
				model: "GPT-4",
				capabilities: ["Requirements Analysis", "User Story Generation", "Acceptance Criteria"],
				integration: "Jira"
			}
		}
	];

	const aiComponents = await Promise.all(
		aiComponentData.map(async (ai) => {
			const text = `${ai.name} ${ai.description}`;
			const vector = await openAIService.generateEmbedding(text);
			
			const node = await prisma.node.create({
				data: ai
			});

			const vectorId = await pineconeService.upsertNodeVector(
				node.id,
				vector,
				ai.type,
				text
			);

			return prisma.node.update({
				where: { id: node.id },
				data: { vectorId }
			});
		})
	);

	// Create relationships with vectors
	const relationshipData = [
		// Department to Org relationships
		...departments.map(dept => ({
			fromNodeId: org.id,
			toNodeId: dept.id,
			relationType: "CONTAINS",
			text: `${org.name} CONTAINS ${dept.name}`
		})),
		// Roles to Departments
		{
			fromNodeId: departments[0].id, // Engineering
			toNodeId: roles[0].id, // Senior Software Engineer
			relationType: "HAS_ROLE",
			text: `Engineering HAS_ROLE Senior Software Engineer`
		},
		{
			fromNodeId: departments[0].id, // Engineering
			toNodeId: roles[1].id, // DevOps Engineer
			relationType: "HAS_ROLE",
			text: `Engineering HAS_ROLE DevOps Engineer`
		},
		// Tools relationships
		...departments.slice(0, 2).flatMap(dept => 
			tools.map(tool => ({
				fromNodeId: dept.id,
				toNodeId: tool.id,
				relationType: "USES",
				text: `${dept.name} USES ${tool.name}`
			}))
		),
		// Process relationships
		...departments.slice(0, 2).flatMap(dept => 
			processes.map(process => ({
				fromNodeId: dept.id,
				toNodeId: process.id,
				relationType: "FOLLOWS",
				text: `${dept.name} FOLLOWS ${process.name}`
			}))
		),
		// AI Component relationships
		{
			fromNodeId: departments[0].id,
			toNodeId: aiComponents[0].id,
			relationType: "USES",
			text: `Engineering USES Code Analysis AI`
		},
		{
			fromNodeId: departments[3].id,
			toNodeId: aiComponents[1].id,
			relationType: "USES",
			text: `Operations USES Customer Support Bot`
		}
	];

	await Promise.all(
		relationshipData.map(async (rel) => {
			const vector = await openAIService.generateEmbedding(rel.text);
			
			const relationship = await prisma.nodeRelationship.create({
				data: {
					fromNodeId: rel.fromNodeId,
					toNodeId: rel.toNodeId,
					relationType: rel.relationType
				}
			});

			const vectorId = await pineconeService.upsertRelationshipVector(
				relationship.id,
				vector,
				rel.relationType,
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
			nodeId: departments[0].id
		},
		{
			content: "Updated CI/CD pipeline documentation available in confluence",
			author: "DevOps Team",
			nodeId: processes[0].id
		},
		{
			content: "New AI-powered code review process showing 30% faster reviews",
			author: "Engineering Team",
			nodeId: aiComponents[0].id
		},
		{
			content: "Customer satisfaction increased by 25% after bot implementation",
			author: "Support Team",
			nodeId: aiComponents[1].id
		}
	];

	await Promise.all(
		noteData.map(async (note) => {
			const vector = await openAIService.generateEmbedding(note.content);
			
			const noteRecord = await prisma.note.create({
				data: note
			});

			const vectorId = await pineconeService.upsertNoteVector(
				noteRecord.id,
				vector,
				note.content
			);

			return prisma.note.update({
				where: { id: noteRecord.id },
				data: { vectorId }
			});
		})
	);

	console.log("Seed data created successfully with vectors!");
}

main()
	.catch((e) => {
		console.error(e)
			process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
