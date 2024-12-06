import { PrismaClient, User } from '@prisma/client';
import { prisma } from '@/prisma/prisma-client';

export interface ClerkUser {
  clerkId: string;
  emailAddresses: { emailAddress: string }[];
  firstName?: string | null;
  lastName?: string | null;
}

export class UserService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Synchronizes a Clerk user with our database
   * Creates or updates the user record as needed
   */
  async syncUser(clerkUser: ClerkUser, organizationId: string | null = null): Promise<User> {
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const clerkId = clerkUser.clerkId;

    if (!email) {
      throw new Error('User must have an email address');
    }

    const name = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(' ') || 'Unknown Name';

    try {
      // Try to find existing user by clerkId
      const existingUser = await this.prisma.user.findUnique({
        where: { clerkId }
      });

      if (existingUser) {
        // Update existing user
        return await this.prisma.user.update({
          where: { clerkId },
          data: {
            name,
            email,
            ...(organizationId ? { organizationId } : {})
          }
        });
      } else {
        // Create new user
        return await this.prisma.user.create({
          data: {
            clerkId,
            email,
            name,
            ...(organizationId ? { organizationId } : {})
          }
        });
      }
    } catch (error) {
      console.error('Error syncing user:', error);
      throw error;
    }
  }

  /**
   * Retrieves a user by their email address
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * Retrieves a user by their ID
   */
  async getUserById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id }
    });
  }

  /**
   * Updates a user's organization
   */
  async updateUserOrganization(userId: string, organizationId: string): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { organizationId }
    });
  }

  /**
   * Gets all users in an organization
   */
  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return await this.prisma.user.findMany({
      where: { organizationId }
    });
  }

  /**
   * Safely deletes a user and their associated data
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      // First check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: true // Include organization data to check if they're the last user
        }
      });

      if (!user) {
        console.log(`User ${userId} not found, skipping delete`);
        return;
      }

      // Start a transaction to handle all cleanup
      await this.prisma.$transaction(async (tx) => {
        // Delete the user
        await tx.user.delete({
          where: { id: userId }
        });

        // If user was part of an organization, check if they were the last user
        if (user.organizationId) {
          const remainingUsers = await tx.user.count({
            where: { organizationId: user.organizationId }
          });

          // If this was the last user, delete the organization and its related data
          if (remainingUsers === 0) {
            // Delete all ontologies and related data for this organization
            const ontologies = await tx.ontology.findMany({
              where: { organizationId: user.organizationId }
            });

            for (const ontology of ontologies) {
              // Delete notes
              await tx.note.deleteMany({
                where: { ontologyId: ontology.id }
              });

              // Delete relationships
              await tx.nodeRelationship.deleteMany({
                where: { ontologyId: ontology.id }
              });

              // Delete nodes
              await tx.node.deleteMany({
                where: { ontologyId: ontology.id }
              });

              // Delete ontology links
              await tx.ontologyLink.deleteMany({
                where: {
                  OR: [
                    { fromOntologyId: ontology.id },
                    { toOntologyId: ontology.id }
                  ]
                }
              });
            }

            // Delete all ontologies
            await tx.ontology.deleteMany({
              where: { organizationId: user.organizationId }
            });

            // Finally delete the organization
            await tx.organization.delete({
              where: { id: user.organizationId }
            });
          }
        }
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Retrieves a user by their Clerk ID
   */
  async getUserByClerkId(clerkId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { clerkId },
      include: {
        organization: {
          include: {
            subscription: true
          }
        }
      }
    });
  }
}

// Export a singleton instance
export const userService = new UserService();
