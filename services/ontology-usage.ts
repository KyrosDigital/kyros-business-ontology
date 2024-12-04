import { OntologyUsage, PrismaClient } from '@prisma/client';
import { prisma } from '@/prisma/prisma-client';

export interface UpdateOntologyUsageData {
  nodeCount?: number;
  relationshipCount?: number;
}

export class OntologyUsageService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Create or initialize usage tracking for an ontology
   */
  async initializeUsage(organizationId: string, ontologyId: string): Promise<OntologyUsage> {
    return this.prisma.ontologyUsage.create({
      data: {
        organizationId,
        ontologyId,
        nodeCount: 0,
        relationshipCount: 0,
      },
    });
  }

  /**
   * Get usage statistics for a specific ontology
   */
  async getUsage(organizationId: string, ontologyId: string): Promise<OntologyUsage | null> {
    return this.prisma.ontologyUsage.findUnique({
      where: {
        organizationId_ontologyId: {
          organizationId,
          ontologyId,
        },
      },
    });
  }

  /**
   * Update usage statistics for an ontology
   */
  async updateUsage(
    organizationId: string,
    ontologyId: string,
    data: UpdateOntologyUsageData
  ): Promise<OntologyUsage> {
    return this.prisma.ontologyUsage.update({
      where: {
        organizationId_ontologyId: {
          organizationId,
          ontologyId,
        },
      },
      data,
    });
  }

  /**
   * Delete usage statistics for an ontology
   */
  async deleteUsage(organizationId: string, ontologyId: string): Promise<OntologyUsage> {
    return this.prisma.ontologyUsage.delete({
      where: {
        organizationId_ontologyId: {
          organizationId,
          ontologyId,
        },
      },
    });
  }

  /**
   * Get all usage statistics for an organization
   */
  async getOrganizationUsage(organizationId: string): Promise<OntologyUsage[]> {
    return this.prisma.ontologyUsage.findMany({
      where: {
        organizationId,
      },
    });
  }

  /**
   * Increment node count for an ontology
   */
  async incrementNodeCount(organizationId: string, ontologyId: string): Promise<OntologyUsage> {
    return this.prisma.ontologyUsage.update({
      where: {
        organizationId_ontologyId: {
          organizationId,
          ontologyId,
        },
      },
      data: {
        nodeCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Decrement node count for an ontology
   */
  async decrementNodeCount(organizationId: string, ontologyId: string): Promise<OntologyUsage> {
    return this.prisma.ontologyUsage.update({
      where: {
        organizationId_ontologyId: {
          organizationId,
          ontologyId,
        },
      },
      data: {
        nodeCount: {
          decrement: 1,
        },
      },
    });
  }

  /**
   * Increment relationship count for an ontology
   */
  async incrementRelationshipCount(
    organizationId: string,
    ontologyId: string
  ): Promise<OntologyUsage> {
    return this.prisma.ontologyUsage.update({
      where: {
        organizationId_ontologyId: {
          organizationId,
          ontologyId,
        },
      },
      data: {
        relationshipCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Decrement relationship count for an ontology
   */
  async decrementRelationshipCount(
    organizationId: string,
    ontologyId: string
  ): Promise<OntologyUsage> {
    return this.prisma.ontologyUsage.update({
      where: {
        organizationId_ontologyId: {
          organizationId,
          ontologyId,
        },
      },
      data: {
        relationshipCount: {
          decrement: 1,
        },
      },
    });
  }
}

// Export a singleton instance
export const ontologyUsageService = new OntologyUsageService();
