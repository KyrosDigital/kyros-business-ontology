import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { SubscriptionPlan } from "@/types/subscription";

export async function GET() {
  const { userId, orgId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // TODO: Fetch actual subscription data from your database
    // This is a mock response for now
    const mockSubscription = {
      isActive: true,
      plan: SubscriptionPlan.FREE_TRIAL,
      seats: 1,
      limits: {
        ontologies: 3,
        nodesPerOntology: 100,
        relationshipsPerOntology: 100,
        aiPrompts: 200,
      },
      features: {
        customNodeTypes: false,
        advancedAI: false,
        export: false,
        prioritySupport: false,
      },
    };

    return NextResponse.json(mockSubscription);
  } catch (error) {
    console.error("[SUBSCRIPTION_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 