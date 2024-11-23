import { NextResponse } from 'next/server';
import { deleteOntology } from '@/services/ontology';

export async function DELETE(
  request: Request,
  { params }: { params: { ontologyId: string } }
) {
  const result = await deleteOntology(params.ontologyId);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === 'Ontology not found' ? 404 : 500 }
    );
  }

  return NextResponse.json({
    message: result.message,
    updatedOntologies: result.data
  });
} 