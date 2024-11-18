import { NextResponse } from "next/server";
import { deleteRelationship } from "@/services/ontology";

export async function POST(request: Request) {
  try {
    const { sourceId, targetId } = await request.json();
    
    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: "Source and target IDs are required" },
        { status: 400 }
      );
    }

    await deleteRelationship(sourceId, targetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting relationship:", error);
    return NextResponse.json(
      { error: "Failed to delete relationship" },
      { status: 500 }
    );
  }
} 