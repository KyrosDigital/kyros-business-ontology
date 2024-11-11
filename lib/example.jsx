export const jsonld = {
	"@context": {
		"@vocab": "https://example.com/ontology/",
		"org": "https://example.com/ontology/",
		"version": "org:version",
		"versionDate": "org:dateModified",
		"previousVersion": "org:predecessorOf",
		"hasDepartment": {
			"@id": "org:Department",
			"@container": "@set"
		},
		"hasRole": {
			"@id": "org:Role",
			"@container": "@set"
		},
		"hasEmployee": {
			"@id": "schema:Employee",
			"@container": "@set"
		},
		"hasProcess": {
			"@id": "schema:Process",
			"@container": "@set"
		},
		"hasTask": {
			"@id": "schema:Task",
			"@container": "@set"
		},
		"hasIntegration": {
			"@id": "schema:Integration",
			"@container": "@set"
		},
		"hasDataSource": {
			"@id": "schema:DataSource",
			"@container": "@set"
		},
		"hasAIComponent": {
			"@id": "schema:AIComponent",
			"@container": "@set"
		},
		"hasAnalytics": {
			"@id": "schema:Analytics",
			"@container": "@set"
		},
		"hasSoftwareTool": {
			"@id": "schema:SoftwareTool",
			"@container": "@set"
		},
		"hasNote": {
			"@id": "schema:Comment",
			"@container": "@set"
		},
		"relatedNotes": {
			"@id": "schema:Comment",
			"@container": "@set"
		},
		"author": "schema:author",
		"dateCreated": "schema:dateCreated",
		"content": "schema:text"
	},
	"@type": "Organization",
	"@id": "org_550e8400-e29b-41d4-a716-446655440000",
	"version": "1.0.0",
	"versionDate": "2024-03-20",
	"previousVersion": "https://example.com/organization/v0.9",
	"name": "Example Business Inc.",
	"url": "https://example.com",
	"description": "A business demonstrating an ontology for organizational structure, roles, workflows, integrations, data sources, AI/ML, analytics, and tools.",
	"address": {
		"@type": "PostalAddress",
		"streetAddress": "123 Main St",
		"addressLocality": "Anytown",
		"addressRegion": "CA",
		"postalCode": "12345",
		"addressCountry": "US"
	},
	"contactPoint": {
		"@type": "ContactPoint",
		"telephone": "+1-123-555-0123",
		"contactType": "Customer Service"
	},
	"hasNote": [
		{
			"@type": "Comment",
			"@id": "https://example.com/notes/org-structure/v1",
			"content": "Organization structure updated to reflect new departments",
			"author": "John Doe",
			"dateCreated": "2024-03-20"
		}
	],
	"hasDepartment": [
		{
			"@type": "Department",
			"@id": "dept_7b44c642-0a1c-4c6b-b8da-c113b8aef817",
			"name": "Human Resources",
			"description": "Oversees employee recruitment, benefits, and compliance.",
			"version": "2.0.0",
			"versionDate": "2024-03-15",
			"previousVersion": "https://example.com/department/hr/v1"
		},
		{
			"@type": "Department",
			"@id": "dept_91b0f0a1-754f-4ef1-a5c7-f1c3b8e4d5c6",
			"name": "Finance",
			"description": "Manages financial planning, accounting, and budgeting.",
			"version": "2.0.0",
			"versionDate": "2024-03-15",
			"previousVersion": "https://example.com/department/finance/v1"
		},
		{
			"@type": "Department",
			"@id": "dept_2f9d8a3b-6c5e-4f7a-9b8c-d1e2f3a4b5c6",
			"name": "Information Technology",
			"description": "Provides technical support and manages IT infrastructure.",
			"version": "2.0.0",
			"versionDate": "2024-03-15",
			"previousVersion": "https://example.com/department/it/v1"
		},
		{
			"@type": "Department",
			"@id": "dept_3e8c7b6a-5d4f-4e3d-2c1b-a9f8e7d6c5b4",
			"name": "Operations",
			"description": "Ensures efficient business processes and logistics.",
			"version": "2.0.0",
			"versionDate": "2024-03-15",
			"previousVersion": "https://example.com/department/operations/v1"
		},
		{
			"@type": "Department",
			"@id": "dept_4d7c6b5a-3e2d-1f0e-9a8b-7c6d5e4f3a2b",
			"name": "Sales",
			"description": "Handles sales operations and customer outreach.",
			"version": "2.0.0",
			"versionDate": "2024-03-15",
			"previousVersion": "https://example.com/department/sales/v1",
			"hasRole": [
				{
					"@type": "Role",
					"@id": "role_8a7b6c5d-4e3f-2a1b-9c8d-7e6f5a4b3c2d",
					"version": "1.0.0",
					"versionDate": "2024-03-20",
					"name": "Sales Manager",
					"responsibilities": "Oversees sales strategy and manages the sales team."
				},
				{
					"@type": "Role",
					"@id": "role_9b8a7c6d-5e4f-3b2a-1c9d-8f7e6g5h4i3j",
					"version": "1.0.0",
					"versionDate": "2024-03-20",
					"name": "Sales Associate",
					"responsibilities": "Engages with customers and supports sales activities."
				}
			],
			"hasProcess": [
				{
					"@type": "Process",
					"name": "Lead Conversion Process",
					"description": "A process for converting leads into customers, involving sales and marketing.",
					"workflow": [
						{
							"@type": "Task",
							"name": "Initial Outreach",
							"description": "Contact the lead within 24 hours of their inquiry.",
							"responsibleRole": {
								"@type": "Role",
								"@id": "role_9b8a7c6d-5e4f-3b2a-1c9d-8f7e6g5h4i3j",
								"version": "1.0.0",
								"versionDate": "2024-03-20",
								"name": "Sales Associate"
							},
							"taskStatus": "https://schema.org/ActiveActionStatus"
						}
					],
					"relatedNotes": [
						{
							"@type": "Comment",
							"@id": "note_1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
							"content": "Department restructured to improve lead conversion workflow",
							"author": "Jane Smith",
							"dateCreated": "2024-03-15"
						}
					]
				}
			],
			"hasNote": [
				{
					"@type": "Comment",
					"@id": "note_1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
					"content": "Department restructured to improve lead conversion workflow",
					"author": "Jane Smith",
					"dateCreated": "2024-03-15"
				}
			]
		},
		{
			"@type": "Department",
			"@id": "dept_5e4d3c2b-1a9b-8c7d-6e5f-4a3b2c1d0e9f",
			"name": "Marketing",
			"description": "Handles marketing activities and customer engagement.",
			"version": "1.0.0",
			"versionDate": "2024-03-20",
			"previousVersion": "https://example.com/department/marketing/v1",
			"hasRole": [
				{
					"@type": "Role",
					"@id": "role_6f5e4d3c-2b1a-0c9d-8e7f-6g5h4i3j2k1l",
					"version": "1.0.0",
					"versionDate": "2024-03-20",
					"name": "Marketing Manager",
					"responsibilities": "Develops marketing strategies and oversees the marketing team."
				}
			]
		}
	],
	"hasProcess": [
		{
			"@type": "Process",
			"@id": "proc_7g6f5e4d-3c2b-1a0b-9d8e-7f6g5h4i3j2k",
			"version": "3.1.2",
			"versionDate": "2024-03-18",
			"previousVersion": "https://example.com/process/customer-support/v2",
			"name": "Customer Support Process",
			"description": "A process to manage customer inquiries and issues.",
			"workflow": [
				{
					"@type": "Task",
					"@id": "task_8h7g6f5e-4d3c-2b1a-0e9d-8f7g6h5i4j3k",
					"version": "1.0.0",
					"versionDate": "2024-03-20",
					"name": "Log Customer Inquiry",
					"responsibleRole": {
						"@type": "Role",
						"@id": "role_9i8h7g6f-5e4d-3c2b-1a0e-9f8g7h6i5j4k",
						"version": "1.0.0",
						"versionDate": "2024-03-20",
						"name": "Customer Support Agent"
					}
				}
			],
			"hasIntegration": [
				{
					"@type": "Integration",
					"@id": "intg_0j9i8h7g-6f5e-4d3c-2b1a-0g9h8i7j6k5l",
					"version": "2.1.0",
					"versionDate": "2024-03-10",
					"previousVersion": "https://example.com/integration/crm/v1",
					"name": "CRM System",
					"description": "Manages customer information and interactions.",
					"integratesWith": {
						"@type": "SoftwareTool",
						"name": "Salesforce"
					}
				}
			],
			"hasDataSource": [
				{
					"@type": "DataSource",
					"@id": "ds_1k0j9i8h-7g6f-5e4d-3c2b-1h0i9j8k7l6m",
					"version": "1.0.0",
					"versionDate": "2024-03-20",
					"name": "Customer Database",
					"description": "Stores customer data for support and sales use."
				}
			]
		}
	],
	"hasAIComponent": [
		{
			"@type": "AIComponent",
			"@id": "ai_2l1k0j9i-8h7g-6f5e-4d3c-2i1j0k9l8m7n",
			"version": "1.2.3",
			"versionDate": "2024-03-19",
			"modelVersion": "gpt-4-0125-preview",
			"name": "Customer Sentiment Analysis",
			"description": "Analyzes customer communications to detect sentiment and flag issues.",
			"relatedProcess": {
				"@type": "Process",
				"name": "Customer Support Process"
			},
			"usesDataSource": {
				"@type": "DataSource",
				"@id": "ds_1k0j9i8h-7g6f-5e4d-3c2b-1h0i9j8k7l6m",
				"version": "1.0.0",
				"versionDate": "2024-03-20",
				"name": "Customer Database"
			},
			"softwareTool": {
				"@type": "SoftwareTool",
				"name": "OpenAI API"
			}
		}
	],
	"hasAnalytics": [
		{
			"@type": "Analytics",
			"@id": "anly_3m2l1k0j-9i8h-7g6f-5e4d-3j2k1l0m9n8o",
			"version": "1.0.0",
			"versionDate": "2024-03-20",
			"name": "Sales Performance Analytics",
			"description": "Analyzes sales team performance metrics and KPIs.",
			"relatedDepartment": {
				"@type": "Department",
				"@id": "dept_4d7c6b5a-3e2d-1f0e-9a8b-7c6d5e4f3a2b"
			},
			"dataSource": [
				{
					"@type": "DataSource",
					"@id": "ds_4n3m2l1k-0j9i-8h7g-6f5e-4k3l2m1n0o9p",
					"version": "1.0.0",
					"versionDate": "2024-03-20",
					"name": "Sales Database"
				}
			]
		}
	],
	"hasSoftwareTool": [
		{
			"@type": "SoftwareTool",
			"@id": "tool_5o4n3m2l-1k0j-9i8h-7g6f-5l4m3n2o1p0q",
			"version": "2024.1.0",
			"versionDate": "2024-03-01",
			"previousVersion": "https://example.com/tool/salesforce/v2023.4",
			"name": "Salesforce",
			"apiVersion": "v58.0",
			"description": "CRM tool used for managing customer relationships and sales data.",
			"relatedIntegration": {
				"@type": "Integration",
				"name": "CRM System"
			}
		},
		{
			"@type": "SoftwareTool",
			"@id": "tool_6p5o4n3m-2l1k-0j9i-8h7g-6m5n4o3p2q1r",
			"version": "2024.1.0",
			"versionDate": "2024-03-01",
			"name": "HubSpot",
			"description": "Marketing automation tool used by the Marketing department.",
			"relatedDepartment": {
				"@type": "Department",
				"@id": "dept_5e4d3c2b-1a9b-8c7d-6e5f-4a3b2c1d0e9f"
			}
		}
	]
};