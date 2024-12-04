import { AIPromptUsage, PrismaClient } from '@prisma/client';
import { prisma } from '@/prisma/prisma-client';

export class AIUsageService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Initialize AI usage tracking for an organization
   */
  async initializeUsage(organizationId: string): Promise<AIPromptUsage> {
    return this.prisma.aIPromptUsage.create({
      data: {
        organizationId,
        count: 0,
      },
    });
  }

  /**
   * Get AI usage statistics for an organization
   */
  async getUsage(organizationId: string): Promise<AIPromptUsage | null> {
    return this.prisma.aIPromptUsage.findUnique({
      where: {
        organizationId,
      },
    });
  }

  /**
   * Increment the AI prompt usage count for an organization
   */
  async incrementCount(organizationId: string): Promise<AIPromptUsage> {
    // Try to update existing record
    try {
      return await this.prisma.aIPromptUsage.update({
        where: {
          organizationId,
        },
        data: {
          count: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      // If record doesn't exist, create it with count 1
      return await this.prisma.aIPromptUsage.create({
        data: {
          organizationId,
          count: 1,
        },
      });
    }
  }

  /**
   * Reset the AI prompt usage count for an organization
   */
  async resetCount(organizationId: string): Promise<AIPromptUsage> {
    return this.prisma.aIPromptUsage.update({
      where: {
        organizationId,
      },
      data: {
        count: 0,
      },
    });
  }

  /**
   * Delete usage statistics for an organization
   */
  async deleteUsage(organizationId: string): Promise<AIPromptUsage> {
    return this.prisma.aIPromptUsage.delete({
      where: {
        organizationId,
      },
    });
  }
}

// Export a singleton instance
export const aiUsageService = new AIUsageService();
