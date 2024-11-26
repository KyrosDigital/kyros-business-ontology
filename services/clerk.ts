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
      // createdBy: will auto apply the user as a member and an admin
      const organization = await this.clerkClient.organizations.createOrganization({
        name,
        createdBy: userId
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
  async getUserOrganizations(clerkUserId: string) {
    return this.clerkClient.users.getOrganizationMembershipList({
      userId: clerkUserId
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
