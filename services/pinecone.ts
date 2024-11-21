import { Pinecone, RecordMetadata, PineconeRecord } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'ontology';

export interface VectorMetadata extends RecordMetadata {
  type: 'NODE' | 'RELATIONSHIP' | 'NOTE';
  id: string;
  content: string;
  nodeType?: string;
  relationType?: string;
  [key: string]: any; // Add index signature for RecordMetadata compatibility
}

export class PineconeService {
  private index;

  constructor() {
    this.index = pinecone.index(INDEX_NAME);
  }

  /**
   * Upsert a vector for a node
   */
  async upsertNodeVector(
    nodeId: string,
    vector: number[],
    nodeType: string,
    content: string
  ): Promise<string> {
    const record: PineconeRecord<VectorMetadata> = {
      id: `node_${nodeId}`,
      values: vector,
      metadata: {
        type: 'NODE',
        id: nodeId,
        nodeType,
        content,
      },
    };

    await this.index.upsert([record]);
    return record.id;
  }

  /**
   * Upsert a vector for a relationship
   */
  async upsertRelationshipVector(
    relationshipId: string,
    vector: number[],
    relationType: string,
    content: string
  ): Promise<string> {
    const record: PineconeRecord<VectorMetadata> = {
      id: `rel_${relationshipId}`,
      values: vector,
      metadata: {
        type: 'RELATIONSHIP',
        id: relationshipId,
        relationType,
        content,
      },
    };

    await this.index.upsert([record]);
    return record.id;
  }

  /**
   * Upsert a vector for a note
   */
  async upsertNoteVector(
    noteId: string,
    vector: number[],
    content: string
  ): Promise<string> {
    const record: PineconeRecord<VectorMetadata> = {
      id: `note_${noteId}`,
      values: vector,
      metadata: {
        type: 'NOTE',
        id: noteId,
        content,
      },
    };

    await this.index.upsert([record]);
    return record.id;
  }

  /**
   * Query similar vectors
   */
  async querySimilar(
    vector: number[],
    topK: number = 5,
    filter?: { type?: 'NODE' | 'RELATIONSHIP' | 'NOTE' }
  ) {
    const response = await this.index.query({
      vector,
      topK,
      filter: filter,
      includeMetadata: true,
    });

    return response.matches;
  }

  /**
   * Delete a vector by ID
   */
  async deleteVector(vectorId: string) {
    await this.index.deleteOne(vectorId);
  }

  /**
   * Delete multiple vectors by IDs
   */
  async deleteVectors(vectorIds: string[]) {
    await this.index.deleteMany(vectorIds);
  }
}

// Export singleton instance
export const pineconeService = new PineconeService();
