import { prisma } from "./prisma-client"
import { NodeType } from "@prisma/client"

async function main() {
	// Create the organization
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
		})

	// Create departments
	const departments = await Promise.all([
		prisma.node.create({
			data: {
				type: NodeType.DEPARTMENT,
				name: "Engineering",
				description: "Core software development and technical operations",
				metadata: {
					headcount: 25,
					location: "Hybrid"
				}
			}
		}),
		prisma.node.create({
			data: {
				type: NodeType.DEPARTMENT,
				name: "Product",
				description: "Product management and user experience design",
				metadata: {
					headcount: 10,
					location: "Remote"
				}
			}
		}),
		prisma.node.create({
			data: {
				type: NodeType.DEPARTMENT,
				name: "People Operations",
				description: "Human resources, recruitment, and employee experience",
				metadata: {
					headcount: 5,
					location: "Hybrid"
				}
			}
		}),
		prisma.node.create({
			data: {
				type: NodeType.DEPARTMENT,
				name: "Operations",
				description: "Business operations, finance, and administrative functions",
				metadata: {
					headcount: 8,
					location: "On-site"
				}
			}
		})
	])

	// Create roles
	const roles = await Promise.all([
		prisma.node.create({
			data: {
				type: NodeType.ROLE,
				name: "Senior Software Engineer",
				description: "Lead development initiatives and mentor junior developers",
				metadata: {
					level: "Senior",
					yearsExperienceRequired: 5,
					skills: ["JavaScript", "Python", "Cloud Architecture"]
				}
			}
		}),
		prisma.node.create({
			data: {
				type: NodeType.ROLE,
				name: "DevOps Engineer",
				description: "Manage infrastructure and deployment pipelines",
				metadata: {
					level: "Mid-Senior",
					yearsExperienceRequired: 3,
					skills: ["AWS", "Kubernetes", "CI/CD"]
				}
			}
		}),
		prisma.node.create({
			data: {
				type: NodeType.ROLE,
				name: "Product Manager",
				description: "Lead product strategy and development",
				metadata: {
					level: "Senior",
					yearsExperienceRequired: 4,
					skills: ["Product Strategy", "Agile", "User Research"]
				}
			}
		})
	])

	// Create processes
	const processes = await Promise.all([
		prisma.node.create({
			data: {
				type: NodeType.PROCESS,
				name: "Agile Development",
				description: "Two-week sprint cycles with daily standups",
				metadata: {
					cycleTime: "2 weeks",
					ceremonies: ["Daily Standup", "Sprint Planning", "Retrospective"],
					tools: ["Jira", "Confluence"]
				}
			}
		}),
		prisma.node.create({
			data: {
				type: NodeType.PROCESS,
				name: "Code Review",
				description: "Peer review process for all code changes",
				metadata: {
					requiredApprovals: 2,
					automatedChecks: ["Linting", "Tests", "Security Scan"]
				}
			}
		})
	])

	// Create tools
	const tools = await Promise.all([
		prisma.node.create({
			data: {
				type: NodeType.SOFTWARE_TOOL,
				name: "GitHub",
				description: "Version control and collaboration platform",
				metadata: {
					type: "Version Control",
					license: "Enterprise",
					integrations: ["Jira", "Slack"]
				}
			}
		}),
		prisma.node.create({
			data: {
				type: NodeType.SOFTWARE_TOOL,
				name: "AWS",
				description: "Cloud infrastructure platform",
				metadata: {
					type: "Cloud Platform",
					services: ["EC2", "S3", "Lambda"],
					region: "us-east-1"
				}
			}
		})
	])

	// Create AI components
	const aiComponents = await Promise.all([
		prisma.node.create({
			data: {
				type: NodeType.AI_COMPONENT,
				name: "Code Analysis AI",
				description: "AI-powered code quality and security analysis",
				metadata: {
					model: "GPT-4",
					capabilities: ["Code Review", "Security Analysis", "Optimization Suggestions"],
					integration: "GitHub Actions"
				}
			}
		}),
		prisma.node.create({
			data: {
				type: NodeType.AI_COMPONENT,
				name: "Customer Support Bot",
				description: "AI chatbot for customer support automation",
				metadata: {
					model: "Claude",
					channels: ["Website", "Slack"],
					languages: ["English", "Spanish"]
				}
			}
		})
	])

	// Create relationships
	const relationships = await Promise.all([
		// Department to Org relationships
		...departments.map(dept => 
			prisma.nodeRelationship.create({
				data: {
					fromNodeId: org.id,
					toNodeId: dept.id,
					relationType: "CONTAINS"
				}
			})
		),
		// Roles to Engineering department
		...roles.slice(0, 2).map(role =>
			prisma.nodeRelationship.create({
				data: {
					fromNodeId: departments[0].id,
					toNodeId: role.id,
					relationType: "HAS_ROLE"
				}
			})
		),
		// Tools to Engineering
		...tools.map(tool =>
			prisma.nodeRelationship.create({
				data: {
					fromNodeId: departments[0].id,
					toNodeId: tool.id,
					relationType: "USES"
				}
			})
		),
		// Processes to Engineering
		...processes.map(process =>
			prisma.nodeRelationship.create({
				data: {
					fromNodeId: departments[0].id,
					toNodeId: process.id,
					relationType: "FOLLOWS"
				}
			})
		)
	])

	// Add some notes
	await Promise.all([
		prisma.note.create({
			data: {
				content: "Implementing new security protocols across all engineering tools",
				author: "Security Team",
				nodeId: departments[0].id
			}
		}),
		prisma.note.create({
			data: {
				content: "Updated CI/CD pipeline documentation available in confluence",
				author: "DevOps Team",
				nodeId: processes[0].id
			}
		})
	])

	console.log("Seed data created successfully!")
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
