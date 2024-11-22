import { NextRequest, NextResponse } from 'next/server';
import { organizationService } from '@/services/organization';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    try {
      const organization = await organizationService.getOrganizationByUserId(userId);
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
