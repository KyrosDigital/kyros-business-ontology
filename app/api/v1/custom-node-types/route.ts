import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { customNodeTypesService } from '@/services/custom-node-types';
import { organizationService } from '@/services/organization';

export async function GET() {
  try {
    const { userId }: { userId: string | null } = await auth()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const organization = await organizationService.getOrganizationByClerkUserId(userId);
    if (!organization) {
      return new NextResponse("Organization not found", { status: 404 });
    }

    const nodeTypes = await customNodeTypesService.getByOrganization(organization.id);
    return NextResponse.json(nodeTypes);
  } catch (error) {
    console.error('[CUSTOM_NODE_TYPES_GET]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId }: { userId: string | null } = await auth()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const organization = await organizationService.getOrganizationByClerkUserId(userId);
    if (!organization) {
      return new NextResponse("Organization not found", { status: 404 });
    }

    const body = await req.json();
    const { name, description, hexColor } = body;

    if (!name || !hexColor) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const nodeType = await customNodeTypesService.create({
      name,
      description,
      hexColor,
      organizationId: organization.id
    });

    return NextResponse.json(nodeType);
  } catch (error) {
    console.error('[CUSTOM_NODE_TYPES_POST]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 