import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // TODO: Implement actual remaining limits calculation
    // This is a mock response for now
    const mockRemainingLimits = {
      ontologies: 2,
      nodes: 80,
      relationships: 85,
      aiPrompts: 150,
    };

    return NextResponse.json(mockRemainingLimits);
  } catch (error) {
    console.error("[SUBSCRIPTION_REMAINING_LIMITS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 