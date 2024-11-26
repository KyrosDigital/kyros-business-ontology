import { NextRequest, NextResponse } from 'next/server';
import { organizationService } from '@/services/organization';

export async function GET(request: NextRequest) {
  try {
    const clerkUserId = request.nextUrl.searchParams.get('clerkUserId');

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'clerkUserId is required' },
        { status: 400 }
      );
    }

    try {
      const organization = await organizationService.getOrganizationByClerkUserId(clerkUserId);
      return NextResponse.json(organization);
    } catch (error) {
      if (error instanceof Error && error.message.includes('User not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}
