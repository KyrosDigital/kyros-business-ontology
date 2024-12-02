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
    return this.clerkClient.organizations.deleteOrganization(organizationId);
  }

  /**
   * Sends an invitation to join an organization
   * @param organizationId - The ID of the organization to invite to
   * @param emailAddress - The email address to send the invitation to
   * @param role - The role to assign to the invited user (optional)
   */
  async createOrganizationInvitation(
    organizationId: string,
    clerkUserId: string,
    emailAddress: string,
    role: 'admin' | 'basic_member' = 'basic_member'
  ) {
    try {
      const invitation = await this.clerkClient.organizations.createOrganizationInvitation({
        organizationId,
        inviterUserId: clerkUserId,
        emailAddress,
        role,
        redirectUrl: '/dashboard'
      });

      return invitation;
    } catch (error) {
      console.error('Error creating organization invitation:', error);
      throw error;
    }
  }

  /**
   * Gets a user by their Clerk ID
   */
  async getUser(userId: string) {
    try {
      return await this.clerkClient.users.getUser(userId);
    } catch (error) {
      console.error('Error fetching Clerk user:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const clerkService = new ClerkService();
