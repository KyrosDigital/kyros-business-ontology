import { WebhookEvent } from "@clerk/nextjs/server";
import { userService } from '@/services/user';
import { organizationService } from '@/services/organization';
import { clerkService } from '@/services/clerk';

async function handleFirstTimeUser(userData: {
  id: string;
  emailAddresses: { emailAddress: string }[];
  firstName?: string | null;
  lastName?: string | null;
}) {
  const email = userData.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error('User must have an email address');

  console.log('Processing first time user:', { email, userId: userData.id });

  try {
    // Check if user already exists in our database
    const existingUser = await userService.getUserById(userData.id);
    if (existingUser) {
      console.log('User already exists in database, skipping organization creation');
      return { user: existingUser };
    }

    // First create the user in our database without an organization
    console.log('Creating user in database...');
    const user = await userService.syncUser({
      id: userData.id,
      emailAddresses: userData.emailAddresses,
      firstName: userData.firstName,
      lastName: userData.lastName
    }, null);

    // Check if user already belongs to an organization in Clerk
    const clerkOrgs = await clerkService.getUserOrganizations(userData.id);
    if (clerkOrgs.length > 0) {
      console.log('User already has Clerk organizations, skipping creation');
      return { user };
    }

    // Extract organization name from email domain
    const domain = email.split('@')[1];
    const orgName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    
    let dbOrganization;
    try {
      // Create organization in your database
      dbOrganization = await organizationService.create({
        name: `${orgName} Organization`,
        description: "Default organization created during signup",
        pineconeIndex: `${domain.split('.')[0]}-index-${Date.now()}`
      });

      console.log('Creating organization in Clerk...', {
        name: dbOrganization.name,
        userId: userData.id
      });
      
      // Create organization in Clerk
      const clerkOrg = await clerkService.createOrganization(dbOrganization.name, userData.id);
      console.log('Clerk organization created:', clerkOrg);

      // Update user with the new organization ID
      await userService.updateUserOrganization(user.id, dbOrganization.id);

      return { user, organization: dbOrganization, clerkOrg };
    } catch (error) {
      console.error('Error creating organization:', error);
      // If there's an error, try to clean up the database organization
      if (dbOrganization) {
        try {
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
          id: payload.data.id,
          emailAddresses: payload.data.email_addresses.map(email => ({
            emailAddress: email.email_address
          })),
          firstName: payload.data.first_name,
          lastName: payload.data.last_name
        };

        await handleFirstTimeUser(userData);
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