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

export async function createDepartment(orgId: string, departmentData: {
  name: string;
  description?: string;
}) {
  const department = await prisma.department.create({
    data: {
      name: departmentData.name,
      description: departmentData.description,
      organization: {
        connect: { id: orgId }
      }
    },
    include: {
      organization: true,
      roles: true,
      processes: true,
      tools: true,
      analytics: true,
      aiComponents: true,
      notes: true
    }
  })

  return department
}
