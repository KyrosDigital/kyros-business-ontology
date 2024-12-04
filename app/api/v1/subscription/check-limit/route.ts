import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { userId } = auth();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!type) {
    return new NextResponse("Missing type parameter", { status: 400 });
  }

  try {
    // TODO: Implement actual limit checking logic
    // This is a mock response for now
    const mockLimitChecks = {
      ontologies: true,
      nodes: true,
      relationships: true,
      aiPrompts: true,
    };

    return NextResponse.json({
      withinLimit: mockLimitChecks[type as keyof typeof mockLimitChecks] ?? false,
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_CHECK_LIMIT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 