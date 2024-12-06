import { auth } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";
import { userService } from '@/services/user';
import { subscriptionService } from '@/services/subscription';
import { PLAN_FEATURES, PLAN_LIMITS, SubscriptionPlan } from '@/types/subscription';

export async function GET() {
  const { userId }: { userId: string | null } = await auth()

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const user = await userService.getUserByClerkId(userId);
    
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // If user has no organization, return FREE_TRIAL details
    if (!user.organizationId) {
      const freeTrialDetails = {
        isActive: true,
        plan: SubscriptionPlan.FREE_TRIAL,
        features: PLAN_FEATURES[SubscriptionPlan.FREE_TRIAL],
        limits: PLAN_LIMITS[SubscriptionPlan.FREE_TRIAL],
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      return NextResponse.json(freeTrialDetails);
    }

    // Get subscription details for the organization
    const subscription = await subscriptionService.getSubscriptionByOrganizationId(user.organizationId);

    // If no subscription found, return FREE_TRIAL
    if (!subscription) {
      const freeTrialDetails = {
        isActive: true,
        plan: SubscriptionPlan.FREE_TRIAL,
        features: PLAN_FEATURES[SubscriptionPlan.FREE_TRIAL],
        limits: PLAN_LIMITS[SubscriptionPlan.FREE_TRIAL],
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      return NextResponse.json(freeTrialDetails);
    }

    // Map the subscription to the expected format
    const subscriptionDetails = subscriptionService.mapSubscriptionToDetails(subscription);
    return NextResponse.json(subscriptionDetails);
  } catch (error) {
    console.error("[SUBSCRIPTION_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 