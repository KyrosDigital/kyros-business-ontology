import { Pinecone, RecordMetadata, PineconeRecord } from '@pinecone-database/pinecone';
import { NodeType, Prisma } from '@prisma/client';
import { NodeWithRelations } from './ontology';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'ontology';

export interface VectorMetadata extends RecordMetadata {
  type: 'NODE' | 'RELATIONSHIP' | 'NOTE';
  id: string;
  content: string;
  nodeType?: NodeType;
  nodeName?: string;
  nodeDescription?: string;
  nodeMetadataStr?: string;
  relationType?: string;
  fromNodeId?: string;
  fromNodeType?: NodeType;
  fromNodeName?: string;
  toNodeId?: string;
  toNodeType?: NodeType;
  toNodeName?: string;
  noteAuthor?: string;
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
    node: NodeWithRelations,
    content: string
  ): Promise<string> {
    const record: PineconeRecord<VectorMetadata> = {
      id: `node_${nodeId}`,
      values: vector,
      metadata: {
        type: 'NODE',
        id: nodeId,
        nodeType: node.type,
        nodeName: node.name,
        nodeDescription: node.description || '',
        nodeMetadataStr: node.metadata ? JSON.stringify(node.metadata) : '',
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
    fromNode: { id: string; type: NodeType; name: string },
    toNode: { id: string; type: NodeType; name: string },
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
        fromNodeId: fromNode.id,
        fromNodeType: fromNode.type,
        fromNodeName: fromNode.name,
        toNodeId: toNode.id,
        toNodeType: toNode.type,
        toNodeName: toNode.name,
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

    return response.matches?.map(match => ({
      ...match,
      metadata: {
        ...match.metadata,
        nodeMetadata: match.metadata?.nodeMetadataStr 
          ? JSON.parse(match.metadata.nodeMetadataStr)
          : undefined
      }
    }));
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
