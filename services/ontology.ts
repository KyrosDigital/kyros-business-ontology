import { prisma } from '@/prisma/prisma-client'

export async function getOntologyData() {
  const organization = await prisma.organization.findFirst({
    include: {
      departments: {
        include: {
          roles: true,
          processes: {
            include: {
              workflow: true,
              integrations: true,
              dataSources: true,
              aiComponents: true
            }
          },
          tools: true,
          analytics: true,
          aiComponents: true
        }
      },
      notes: true
    }
  })

  return organization
}

export async function createDepartment(orgId: string, data: {
  name: string;
  description?: string;
}) {
  return prisma.department.create({
    data: {
      name: data.name,
      description: data.description,
      organization: { connect: { id: orgId } }
    },
    include: defaultIncludes.department
  });
}

export async function createRole(deptId: string, data: {
  name: string;
  responsibilities?: string;
}) {
  return prisma.role.create({
    data: {
      name: data.name,
      responsibilities: data.description,
      department: { connect: { id: deptId } }
    },
    include: defaultIncludes.role
  });
}

export async function createProcess(deptId: string, data: {
  name: string;
  description?: string;
}) {
  return prisma.process.create({
    data: {
      name: data.name,
      description: data.description,
      department: { connect: { id: deptId } }
    },
    include: defaultIncludes.process
  });
}

export async function createTask(processId: string, data: {
  name: string;
  description?: string;
  roleId?: string;
}) {
  return prisma.task.create({
    data: {
      name: data.name,
      description: data.description,
      process: { connect: { id: processId } },
      ...(data.roleId && {
        responsibleRole: { connect: { id: data.roleId } }
      })
    },
    include: defaultIncludes.task
  });
}

// Add similar functions for other types:
// createSoftwareTool, createAnalytics, createAIComponent, 
// createIntegration, createDataSource

// Helper object for consistent includes
const defaultIncludes = {
  department: {
    organization: true,
    roles: true,
    processes: true,
    tools: true,
    analytics: true,
    aiComponents: true,
    notes: true
  },
  role: {
    department: true,
    tasks: true,
    notes: true
  },
  process: {
    department: true,
    workflow: true,
    roles: true,
    integrations: true,
    dataSources: true,
    aiComponents: true,
    notes: true
  },
  task: {
    process: true,
    responsibleRole: true,
    notes: true
  }
  // Add other includes as needed
};
