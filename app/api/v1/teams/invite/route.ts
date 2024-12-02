import { auth } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";
import { clerkService } from "@/services/clerk";

export async function POST(request: Request) {
  try {

    const { userId, orgId }: { userId: string | undefined, orgId: string | undefined } = await auth();
    
    if (!userId || !orgId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

		const { emailAddress, role = 'org:member' } = await request.json();

    if (!emailAddress) {
      return new NextResponse("Email address is required", { status: 400 });
    }

    const invitation = await clerkService.createOrganizationInvitation(
      orgId,
      userId,
      emailAddress,
      role
    );

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('Error inviting team member:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
