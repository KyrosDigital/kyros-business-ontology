import { auth } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";
import { organizationService } from '@/services/organization';
import { subscriptionService } from '@/services/subscription';

export async function GET() {
  const { userId }: { userId: string | null } = await auth()

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Get the organization using the Clerk user ID
    const organization = await organizationService.getOrganizationByClerkUserId(userId);
    
    if (!organization) {
      return new NextResponse("Organization not found", { status: 404 });
    }

    // Get the subscription for this organization
    const subscription = await subscriptionService.getSubscriptionByOrganizationId(organization.id);
    
    // Map the subscription to the expected format
    const subscriptionDetails = subscriptionService.mapSubscriptionToDetails(subscription);

    return NextResponse.json(subscriptionDetails);
  } catch (error) {
    console.error("[SUBSCRIPTION_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 