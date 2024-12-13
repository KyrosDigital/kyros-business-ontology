import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { customNodeTypesService } from '@/services/custom-node-types';
import { organizationService } from '@/services/organization';

export async function PATCH(
  req: Request,
  { params }: { params: { nodeTypeId: string } }
) {
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

    const nodeType = await customNodeTypesService.update(params.nodeTypeId, {
      name,
      description,
      hexColor
    });

    return NextResponse.json(nodeType);
  } catch (error) {
    console.error('[CUSTOM_NODE_TYPE_PATCH]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { nodeTypeId: string } }
) {
  try {
    const { userId }: { userId: string | null } = await auth()
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const organization = await organizationService.getOrganizationByClerkUserId(userId);
    if (!organization) {
      return new NextResponse("Organization not found", { status: 404 });
    }

    const nodeType = await customNodeTypesService.deprecate(params.nodeTypeId);
    return NextResponse.json(nodeType);
  } catch (error) {
    console.error('[CUSTOM_NODE_TYPE_DELETE]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 