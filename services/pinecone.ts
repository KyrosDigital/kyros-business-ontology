import { Pinecone, RecordMetadata, PineconeRecord } from '@pinecone-database/pinecone';
import { NodeType, Prisma } from '@prisma/client';
import { NodeWithRelations } from './ontology';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'ontology';

// Update RecordMetadata to accept null values
interface BaseMetadata {
  id: string;
  type: 'NODE' | 'RELATIONSHIP' | 'NOTE';
  content: string;
}

interface NodeMetadata extends Omit<BaseMetadata, 'type'> {
  type: 'NODE';
  nodeType: string;
  name: string;
  description: string | null;
  metadataStr: string | null;
  relationshipIds: string[];
  fromRelationIds: string[];
  toRelationIds: string[];
}

interface RelationshipMetadata extends Omit<BaseMetadata, 'type'> {
  type: 'RELATIONSHIP';
  relationType: string;
  fromNodeId: string;
  fromNodeType: string;
  fromNodeName: string;
  toNodeId: string;
  toNodeType: string;
  toNodeName: string;
}

interface NoteMetadata extends Omit<BaseMetadata, 'type'> {
  type: 'NOTE';
  author: string;
  nodeId: string;
}

export type VectorMetadata = NodeMetadata | RelationshipMetadata | NoteMetadata;

// Add type guard to ensure metadata matches RecordMetadata constraints
function sanitizeMetadata<T extends VectorMetadata>(metadata: T): T & RecordMetadata {
  return {
    ...metadata,
  } as T & RecordMetadata;
}

export class PineconeService {
  private index;

  constructor() {
    this.index = pinecone.index(INDEX_NAME);
  }

  async upsertNodeVector(
    nodeId: string,
    vector: number[],
    node: NodeWithRelations,
    content: string
  ): Promise<string> {
    const fromRelationIds = node.fromRelations?.map(rel => rel.id) || [];
    const toRelationIds = node.toRelations?.map(rel => rel.id) || [];
    const relationshipIds = [...fromRelationIds, ...toRelationIds];

    const metadata = sanitizeMetadata({
      type: 'NODE' as const,
      id: nodeId,
      nodeType: node.type,
      name: node.name,
      description: node.description || null,
      metadataStr: node.metadata ? JSON.stringify(node.metadata) : null,
      content,
      relationshipIds,
      fromRelationIds,
      toRelationIds,
    });

    const record: PineconeRecord<RecordMetadata> = {
      id: `node_${nodeId}`,
      values: vector,
      metadata,
    };

    await this.index.upsert([record]);
    return record.id;
  }

  async upsertRelationshipVector(
    relationshipId: string,
    vector: number[],
    fromNode: { id: string; type: NodeType; name: string },
    toNode: { id: string; type: NodeType; name: string },
    relationType: string,
    content: string
  ): Promise<string> {
    const metadata = sanitizeMetadata({
      type: 'RELATIONSHIP' as const,
      id: relationshipId,
      relationType,
      fromNodeId: fromNode.id,
      fromNodeType: fromNode.type,
      fromNodeName: fromNode.name,
      toNodeId: toNode.id,
      toNodeType: toNode.type,
      toNodeName: toNode.name,
      content,
    });

    const record: PineconeRecord<RecordMetadata> = {
      id: `rel_${relationshipId}`,
      values: vector,
      metadata,
    };

    await this.index.upsert([record]);
    return record.id;
  }

  async upsertNoteVector(
    noteId: string,
    vector: number[],
    content: string,
    author: string,
    nodeId: string
  ): Promise<string> {
    const metadata = sanitizeMetadata({
      type: 'NOTE' as const,
      id: noteId,
      content,
      author,
      nodeId,
    });

    const record: PineconeRecord<RecordMetadata> = {
      id: `note_${noteId}`,
      values: vector,
      metadata,
    };

    await this.index.upsert([record]);
    return record.id;
  }

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
      metadata: match.metadata as RecordMetadata,
    }));
  }

  async deleteVector(vectorId: string) {
    await this.index.deleteOne(vectorId);
  }

  async deleteVectors(vectorIds: string[]) {
    await this.index.deleteMany(vectorIds);
  }
}

export const pineconeService = new PineconeService();
