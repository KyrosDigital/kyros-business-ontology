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
