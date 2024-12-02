import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server'
import { userService } from '@/services/user';

export async function GET(request: NextRequest) {
  try {
		const { userId }: { userId: string | null } = await auth()

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // First get the user from our database using their Clerk ID
    const currentUser = await userService.getUserByClerkId(userId);

    if (!currentUser || !currentUser.organizationId) {
      return new NextResponse("User not found or not part of an organization", { status: 404 });
    }

    // Get all users in the organization
    const users = await userService.getUsersByOrganization(currentUser.organizationId);

    // Map the users to include only necessary information
    const teamMembers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.id === currentUser.id ? 'Admin' : 'Member',
    }));

    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
