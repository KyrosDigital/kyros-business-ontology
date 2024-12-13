import { Organization, PrismaClient } from '@prisma/client';
import { prisma } from '@/prisma/prisma-client';
import { PLAN_FEATURES, PLAN_LIMITS, SubscriptionPlan } from '@/types/subscription';
import { DEFAULT_NODE_TYPES } from './custom-node-types';

export interface CreateOrganizationData {
  name: string;
  description?: string;
  pineconeIndex: string;
  clerkId: string;
}

export interface UpdateOrganizationData {
  name?: string;
  description?: string;
  pineconeIndex?: string;
}

export class OrganizationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Create a new organization
   */
  async create(data: CreateOrganizationData): Promise<Organization> {
    return this.prisma.$transaction(async (tx) => {
      // Create the organization with default node types in the same transaction
      const organization = await tx.organization.create({
        data: {
          name: data.name,
          description: data.description,
          pineconeIndex: data.pineconeIndex,
          clerkId: data.clerkId,
          // Create default node types inline
          customNodeTypes: {
            create: DEFAULT_NODE_TYPES.map(type => ({
              name: type.name,
              hexColor: type.hexColor,
              isSystem: true,
              description: `System default type for ${type.name}`
            }))
          }
        },
        include: {
          customNodeTypes: true
        }
      });

      // Create subscription
      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          plan: SubscriptionPlan.FREE_TRIAL,
          status: 'ACTIVE',
          stripeCustomerId: '',
          stripeSubscriptionId: '',
          stripePriceId: '',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          features: {
            _version: 1,
            ...PLAN_FEATURES[SubscriptionPlan.FREE_TRIAL]
          },
          ontologyLimit: PLAN_LIMITS[SubscriptionPlan.FREE_TRIAL].ontologies,
          nodesPerOntologyLimit: PLAN_LIMITS[SubscriptionPlan.FREE_TRIAL].nodesPerOntology,
          relationshipsPerOntologyLimit: PLAN_LIMITS[SubscriptionPlan.FREE_TRIAL].relationshipsPerOntology,
          aiPromptsLimit: PLAN_LIMITS[SubscriptionPlan.FREE_TRIAL].aiPrompts,
        },
      });

      return organization;
    });
  }

  /**
   * Get an organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id },
    });
  }

  /**
   * Get organization with related data (users and ontologies)
   */
  async getByIdWithRelations(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: true,
        ontologies: true,
      },
    });
  }

  /**
   * Update an organization
   */
  async update(id: string, data: UpdateOrganizationData): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an organization
   */
  async delete(id: string): Promise<Organization> {
    return this.prisma.organization.delete({
      where: { id },
    });
  }

  /**
   * List all organizations
   */
  async list() {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            ontologies: true,
          },
        },
      },
    });
  }

  /**
   * Get organization users
   */
  async getUsers(organizationId: string) {
    return this.prisma.user.findMany({
      where: {
        organizationId,
      },
    });
  }

  /**
   * Get organization ontologies
   */
  async getOntologies(organizationId: string) {
    return this.prisma.ontology.findMany({
      where: {
        organizationId,
      },
      include: {
        _count: {
          select: {
            nodes: true,
            relationships: true,
          },
        },
      },
    });
  }

  /**
   * Get organization by DB user ID
   */
  async getOrganizationByUserId(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: {
            include: {
              _count: {
                select: {
                  users: true,
                  ontologies: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }

      return user.organization;
    } catch (error) {
      console.error('Error in getOrganizationByUserId:', error);
      throw error;
    }
  }

  /**
   * Get organization by DB user ID
   */
  async getOrganizationByClerkUserId(clerkUserId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        include: {
          organization: {
            include: {
              _count: {
                select: {
                  users: true,
                  ontologies: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new Error(`User not found with clerkId: ${clerkUserId}`);
      }

      return user.organization;
    } catch (error) {
      console.error('Error in getOrganizationByClerkUserId:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const organizationService = new OrganizationService();
