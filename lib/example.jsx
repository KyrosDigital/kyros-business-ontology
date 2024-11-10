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
	"@id": "https://example.com/organization/v1",
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
			"@id": "https://example.com/department/hr/v2",
			"name": "Human Resources",
			"description": "Oversees employee recruitment, benefits, and compliance.",
			"version": "2.0.0",
			"versionDate": "2024-03-15",
			"previousVersion": "https://example.com/department/hr/v1"
		},
		{
			"@type": "Department",
			"@id": "https://example.com/department/finance/v2",
			"name": "Finance",
			"description": "Manages financial planning, accounting, and budgeting.",
			"version": "2.0.0",
			"versionDate": "2024-03-15",
			"previousVersion": "https://example.com/department/finance/v1"
		},
		{
			"@type": "Department",
			"@id": "https://example.com/department/it/v2",
			"name": "Information Technology",
			"description": "Provides technical support and manages IT infrastructure.",
			"version": "2.0.0",
			"versionDate": "2024-03-15",
			"previousVersion": "https://example.com/department/it/v1"
		},
		{
			"@type": "Department",
			"@id": "https://example.com/department/operations/v2",
			"name": "Operations",
			"description": "Ensures efficient business processes and logistics.",
			"version": "2.0.0",
			"versionDate": "2024-03-15",
			"previousVersion": "https://example.com/department/operations/v1"
		},
		{
			"@type": "Department",
			"@id": "https://example.com/department/sales/v2",
			"version": "2.0.0",
			"versionDate": "2024-03-15",
			"previousVersion": "https://example.com/department/sales/v1",
			"name": "Sales",
			"description": "Handles sales operations and customer outreach.",
			"hasRole": [
				{
					"@type": "Role",
					"@id": "https://example.com/role/sales-manager/v1",
					"version": "1.0.0",
					"versionDate": "2024-03-20",
					"name": "Sales Manager",
					"responsibilities": "Oversees sales strategy and manages the sales team."
				},
				{
					"@type": "Role",
					"@id": "https://example.com/role/sales-associate/v1",
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
								"@id": "https://example.com/role/sales-associate/v1",
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
							"@id": "https://example.com/notes/sales-restructure/v1",
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
					"@id": "https://example.com/notes/sales-restructure/v1",
					"content": "Department restructured to improve lead conversion workflow",
					"author": "Jane Smith",
					"dateCreated": "2024-03-15"
				}
			]
		},
		{
			"@type": "Department",
			"@id": "https://example.com/department/marketing/v1",
			"version": "1.0.0",
			"versionDate": "2024-03-20",
			"name": "Marketing",
			"description": "Handles marketing activities and customer engagement.",
			"hasRole": [
				{
					"@type": "Role",
					"@id": "https://example.com/role/marketing-manager/v1",
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
			"@id": "https://example.com/process/customer-support/v3",
			"version": "3.1.2",
			"versionDate": "2024-03-18",
			"previousVersion": "https://example.com/process/customer-support/v2",
			"name": "Customer Support Process",
			"description": "A process to manage customer inquiries and issues.",
			"workflow": [
				{
					"@type": "Task",
					"@id": "https://example.com/task/log-inquiry/v1",
					"version": "1.0.0",
					"versionDate": "2024-03-20",
					"name": "Log Customer Inquiry",
					"responsibleRole": {
						"@type": "Role",
						"@id": "https://example.com/role/customer-support-agent/v1",
						"version": "1.0.0",
						"versionDate": "2024-03-20",
						"name": "Customer Support Agent"
					}
				}
			],
			"hasIntegration": [
				{
					"@type": "Integration",
					"@id": "https://example.com/integration/crm/v2",
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
					"@id": "https://example.com/datasource/customer-db/v1",
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
			"@id": "https://example.com/ai/sentiment-analysis/v1",
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
				"@id": "https://example.com/datasource/customer-db/v1",
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
			"@id": "https://example.com/analytics/sales-performance/v1",
			"version": "1.0.0",
			"versionDate": "2024-03-20",
			"name": "Sales Performance Analytics",
			"description": "Analyzes sales team performance metrics and KPIs.",
			"relatedDepartment": {
				"@type": "Department",
				"@id": "https://example.com/department/sales/v2"
			},
			"dataSource": [
				{
					"@type": "DataSource",
					"@id": "https://example.com/datasource/sales-db/v1",
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
			"@id": "https://example.com/tool/salesforce/v2024.1",
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
			"@id": "https://example.com/tool/hubspot/v2024.1",
			"version": "2024.1.0",
			"versionDate": "2024-03-01",
			"name": "HubSpot",
			"description": "Marketing automation tool used by the Marketing department.",
			"relatedDepartment": {
				"@type": "Department",
				"@id": "https://example.com/department/marketing/v1"
			}
		}
	]
};