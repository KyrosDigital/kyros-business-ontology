import { Organization, PrismaClient } from '@prisma/client';
import { prisma } from '@/prisma/prisma-client';

export interface CreateOrganizationData {
  name: string;
  description?: string;
  pineconeIndex: string;
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
    return this.prisma.organization.create({
      data: {
        name: data.name,
        description: data.description,
        pineconeIndex: data.pineconeIndex,
      },
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
   * Add a user to an organization
   */
  async addUser(organizationId: string, userData: { email: string; name: string }) {
    return this.prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        organizationId,
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
   * Get organization by user ID
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
}

// Export a singleton instance
export const organizationService = new OrganizationService();
