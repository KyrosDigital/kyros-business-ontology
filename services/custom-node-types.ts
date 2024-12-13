import { CustomNodeType, PrismaClient } from '@prisma/client';
import { prisma } from '@/prisma/prisma-client';

export const SystemNodeTypes = {
  ORGANIZATION: 'Organization',
  DEPARTMENT: 'Department',
  ROLE: 'Role',
  PROCESS: 'Process',
  TASK: 'Task',
  INTEGRATION: 'Integration',
  SOFTWARE_TOOL: 'Software Tool',
  DATA_SOURCE: 'Data Source',
  ANALYTICS: 'Analytics',
  AI_COMPONENT: 'AI Component',
  PEOPLE: 'People',
  PRODUCTS: 'Products',
  SERVICES: 'Services'
} as const;

export const DEFAULT_NODE_TYPES = [
  { name: SystemNodeTypes.ORGANIZATION, hexColor: '#000000' },
  { name: SystemNodeTypes.DEPARTMENT, hexColor: '#ffcc00' },
  { name: SystemNodeTypes.ROLE, hexColor: '#ff6600' },
  { name: SystemNodeTypes.PROCESS, hexColor: '#0066cc' },
  { name: SystemNodeTypes.TASK, hexColor: '#cc0066' },
  { name: SystemNodeTypes.INTEGRATION, hexColor: '#9900cc' },
  { name: SystemNodeTypes.SOFTWARE_TOOL, hexColor: '#00cc99' },
  { name: SystemNodeTypes.DATA_SOURCE, hexColor: '#ff3333' },
  { name: SystemNodeTypes.ANALYTICS, hexColor: '#3333ff' },
  { name: SystemNodeTypes.AI_COMPONENT, hexColor: '#ff99cc' },
  { name: SystemNodeTypes.PEOPLE, hexColor: '#33cc33' },
  { name: SystemNodeTypes.PRODUCTS, hexColor: '#cc3366' },
  { name: SystemNodeTypes.SERVICES, hexColor: '#6633cc' }
] as const;

export interface CreateCustomNodeTypeData {
  name: string;
  description?: string;
  hexColor: string;
  organizationId: string;
}

export interface UpdateCustomNodeTypeData {
  name?: string;
  description?: string;
  hexColor?: string;
  isDeprecated?: boolean;
}

export class CustomNodeTypesService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Create a new custom node type
   */
  async create(data: CreateCustomNodeTypeData): Promise<CustomNodeType> {
    // Check for existing deprecated type with same name
    const existingDeprecated = await this.prisma.customNodeType.findFirst({
      where: {
        organizationId: data.organizationId,
        name: data.name,
        isDeprecated: true
      }
    });

    // If found, reactivate it with updated data
    if (existingDeprecated) {
      return this.prisma.customNodeType.update({
        where: { id: existingDeprecated.id },
        data: {
          hexColor: data.hexColor,
          description: data.description,
          isDeprecated: false
        }
      });
    }

    // Otherwise create new
    return this.prisma.customNodeType.create({
      data: {
        ...data,
        isSystem: false
      }
    });
  }

  /**
   * Get all node types for an organization
   */
  async getByOrganization(organizationId: string) {
    return this.prisma.customNodeType.findMany({
      where: {
        organizationId,
        isDeprecated: false
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  /**
   * Update a custom node type
   */
  async update(id: string, data: UpdateCustomNodeTypeData): Promise<CustomNodeType> {
    return this.prisma.customNodeType.update({
      where: { id },
      data
    });
  }

  /**
   * Soft delete a custom node type by marking it as deprecated
   */
  async deprecate(id: string): Promise<CustomNodeType> {
    return this.prisma.customNodeType.update({
      where: { id },
      data: { isDeprecated: true }
    });
  }

  /**
   * Create default node types for an organization
   */
  async createDefaultTypes(organizationId: string): Promise<CustomNodeType[]> {
    const defaultTypes = DEFAULT_NODE_TYPES.map(type => ({
      name: type.name,
      hexColor: type.hexColor,
      isSystem: true,
      description: `System default type for ${type.name}`,
      organizationId
    }));

    return this.prisma.$transaction(
      defaultTypes.map(type => 
        this.prisma.customNodeType.create({ data: type })
      )
    );
  }
}

// Export a singleton instance
export const customNodeTypesService = new CustomNodeTypesService();
