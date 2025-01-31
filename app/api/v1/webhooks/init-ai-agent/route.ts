import { NextRequest, NextResponse } from 'next/server';
import { apiKeyService } from '@/services/api-keys';
import { organizationService } from '@/services/organization';
import { inngest } from '@/inngest/inngest-client';
import { z } from 'zod';

// Input validation schema
const requestSchema = z.object({
  ontologyId: z.string().uuid(),
  prompt: z.string().min(1, "Prompt cannot be empty"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Extract and validate API key from headers
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    // 2. Validate API key and get associated data
    const validatedKey = await apiKeyService.validate(apiKey);
    if (!validatedKey) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    // 3. Parse and validate request body
    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { ontologyId, prompt } = validationResult.data;

    // 4. Get organization data
    const organization = await organizationService.getById(validatedKey.organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // 5. Get ontology and verify it belongs to the organization
    const ontologies = await organizationService.getOntologies(organization.id);
    const ontology = ontologies.find(o => o.id === ontologyId);
    
    if (!ontology) {
      return NextResponse.json(
        { error: 'Ontology not found or does not belong to the organization' },
        { status: 404 }
      );
    }

    // 6. No longer need to fetch user since we have clerkId in the API key
    if (!validatedKey.clerkId) {
      return NextResponse.json(
        { error: 'API key has no associated clerk ID' },
        { status: 404 }
      );
    }

    // 7. Trigger the AI agent initialization using clerkId from API key
    await inngest.send({
      name: "ai-agent/init",
      data: {
        prompt,
        organization,
        ontology,
        userId: validatedKey.clerkId, // Use clerkId directly from API key
        source: "webhook"
      }
    });

    return NextResponse.json({
      success: true,
      message: 'AI agent initialization triggered successfully'
    });

  } catch (error) {
    console.error('Error in init-ai-agent webhook:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
