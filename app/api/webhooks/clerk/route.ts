import { WebhookEvent } from "@clerk/nextjs/server";
import { userService } from '@/services/user';
import { organizationService } from '@/services/organization';
import { clerkService } from '@/services/clerk';
import { PineconeService } from '@/services/pinecone';
import { prisma } from '@/prisma/prisma-client';

async function handleFirstTimeUser(userData: {
  clerkId: string;
  emailAddresses: { emailAddress: string }[];
  firstName?: string | null;
  lastName?: string | null;
}) {
  const email = userData.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error('User must have an email address');

  console.log('Processing first time user:', { email, clerkId: userData.clerkId });

  try {
    // Check if user already exists in our database
    const existingUser = await userService.getUserByClerkId(userData.clerkId);
    if (existingUser) {
      console.log('User already exists in database, skipping organization creation');
      return { user: existingUser };
    }

    // First create the user in our database without an organization
    console.log('Creating user in database...');
    const user = await userService.syncUser({
      clerkId: userData.clerkId,
      emailAddresses: userData.emailAddresses,
      firstName: userData.firstName,
      lastName: userData.lastName
    }, null);

    // Check if user already belongs to an organization in Clerk
    const clerkOrgs = await clerkService.getUserOrganizations(userData.clerkId);
    if (clerkOrgs.data.length > 0) {
      console.log('User already has Clerk organizations, skipping creation');
      return { user };
    }

    // Extract organization name from email domain
    const domain = email.split('@')[1];
    const orgName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    const pineconeIndexName = `${domain.split('.')[0]}-index-${Date.now()}`;
    
    let dbOrganization;
    let pineconeIndexCreated = false;

    try {
      console.log('Creating organization in Clerk...', {
        name: orgName,
        userId: userData.clerkId
      });
      // Create organization in Clerk
      const clerkOrg = await clerkService.createOrganization(orgName, userData.clerkId);
      console.log('Clerk organization created:', clerkOrg);

      // Create organization in your database
      dbOrganization = await organizationService.create({
        name: orgName,
        description: "Default organization created during signup",
        pineconeIndex: pineconeIndexName,
        clerkId: clerkOrg.id
      });

      // Create Pinecone index
      console.log('Creating Pinecone index:', pineconeIndexName);
      await PineconeService.createOrgIndex(pineconeIndexName);
      pineconeIndexCreated = true;

      // Update user with the new organization ID
      await userService.updateUserOrganization(user.id, dbOrganization.id);

      return { user, organization: dbOrganization, clerkOrg };
      
    } catch (error) {
      console.error('Error creating organization:', error);
      
      // Cleanup in reverse order of creation
      if (pineconeIndexCreated) {
        try {
          console.log('Cleaning up Pinecone index:', pineconeIndexName);
          await PineconeService.deleteOrgIndex(pineconeIndexName);
        } catch (cleanupError) {
          console.error('Error cleaning up Pinecone index:', cleanupError);
        }
      }

      if (dbOrganization) {
        try {
          console.log('Cleaning up database organization');
          await organizationService.delete(dbOrganization.id);
        } catch (cleanupError) {
          console.error('Error cleaning up database organization:', cleanupError);
        }
      }

      throw error;
    }
  } catch (error) {
    console.error('Error in handleFirstTimeUser:', error);
    throw error;
  }
}

async function handleOrganizationMembershipCreated(payload: WebhookEvent) {
  if (!('public_user_data' in payload.data) || !('organization' in payload.data)) {
    throw new Error('Invalid webhook payload structure');
  }

  const data = payload.data;
  const userId = data.public_user_data.user_id;
  const organizationClerkId = data.organization.id;
  
  console.log('Processing organizationMembership.created webhook...', {
    userId,
    organizationClerkId
  });

  // First, find the organization in our database using the Clerk ID
  const organization = await prisma.organization.findUnique({
    where: { clerkId: organizationClerkId },
    include: {
      users: {
        where: { clerkId: userId }
      }
    }
  });

  if (!organization) {
    throw new Error(`Organization not found with Clerk ID: ${organizationClerkId}`);
  }

  // Check if user already exists and is properly related to the organization
  if (organization.users.length > 0) {
    console.log('User is already properly related to organization in database, skipping sync');
    return organization.users[0];
  }

  // Check if user exists in our database but isn't related to this organization
  const existingUser = await userService.getUserByClerkId(userId);
  
  if (existingUser) {
    if (existingUser.organizationId === organization.id) {
      console.log('User already exists and is properly related to organization');
      return existingUser;
    }
    
    // User exists but needs to be related to this organization
    console.log('User exists but needs to be related to organization');
    return await userService.updateUserOrganization(existingUser.id, organization.id);
  }

  // At this point, we need to create a new user
  // Fetch complete user information from Clerk
  const clerkUser = await clerkService.getUser(userId);
  
  if (!clerkUser) {
    throw new Error(`Could not fetch user information from Clerk for ID: ${userId}`);
  }

  // Create the user in our database
  const userData = {
    clerkId: userId,
    emailAddresses: clerkUser.emailAddresses.map(email => ({
      emailAddress: email.emailAddress
    })),
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName
  };

  console.log('Creating new user with data:', userData);

  try {
    const user = await userService.syncUser(userData, organization.id);
    console.log('Successfully created and synced user:', user);
    return user;
  } catch (error) {
    console.error('Error syncing user:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the body
  const payload = await req.json() as WebhookEvent;
  console.log('Received webhook:', payload.type);

  try {
    switch (payload.type) {
      case 'user.created': {
        console.log('Processing user.created webhook...');
        const userData = {
          clerkId: payload.data.id,
          emailAddresses: payload.data.email_addresses.map(email => ({
            emailAddress: email.email_address
          })),
          firstName: payload.data.first_name,
          lastName: payload.data.last_name
        };

        await handleFirstTimeUser(userData);
        break;
      }

      case 'organizationMembership.created': {
        await handleOrganizationMembershipCreated(payload);
        break;
      }

      // Handle other webhook events...
      default: {
        console.log('Unhandled webhook type:', payload.type);
      }
    }

    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error) {
    if (error instanceof Error && 'clerkError' in error && error.errors?.[0]?.code === 'already_a_member_in_organization') {
      // If the user is already a member, we can consider this successful
      console.log('User is already a member of organization, continuing...');
      return new Response('Webhook processed successfully', { status: 200 });
    }

    console.error('Error processing webhook:', error);
    return new Response(error instanceof Error ? error.message : 'Error processing webhook', { 
      status: 500 
    });
  }
} 