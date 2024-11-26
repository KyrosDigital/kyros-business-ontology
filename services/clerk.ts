import { createClerkClient } from '@clerk/backend'

export class ClerkService {
  private clerkClient: ReturnType<typeof createClerkClient>;

  constructor() {
    this.clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  }

  /**
   * Creates a new organization in Clerk and sets the user as admin
   */
  async createOrganization(name: string, userId: string) {
    try {
      // Create the organization using the correct client method
      const organization = await this.clerkClient.organizations.createOrganization({
        name,
        createdBy: userId,
        publicMetadata: {
          isFirstOrg: true
        }
      });
      
      // Add the user as admin
      await this.clerkClient.organizations.createOrganizationMembership({
        organizationId: organization.id,
        userId,
        role: "org:admin",
      });

      return organization;
    } catch (error) {
      console.error('Error creating Clerk organization:', error);
      throw error;
    }
  }

  /**
   * Gets an organization by ID
   */
  async getOrganization(organizationId: string) {
    return this.clerkClient.organizations.getOrganization({
      organizationId
    });
  }

  /**
   * Gets all organizations for a user
   */
  async getUserOrganizations(userId: string) {
    return this.clerkClient.users.getOrganizationMembershipList({
      userId
    });
  }

  /**
   * Deletes an organization
   */
  async deleteOrganization(organizationId: string) {
    return this.clerkClient.organizations.deleteOrganization({
      organizationId
    });
  }
}

// Export a singleton instance
export const clerkService = new ClerkService();
