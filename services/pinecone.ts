import { Pinecone, RecordMetadata, PineconeRecord } from '@pinecone-database/pinecone';
import { NodeType, Prisma, Organization, Ontology } from '@prisma/client';
import { NodeWithRelations } from './ontology';

// Define metadata types that conform to RecordMetadata constraints
type BaseMetadata = {
  id: string;
  type: 'NODE' | 'RELATIONSHIP' | 'NOTE';
  content: string;
}

type NodeMetadata = BaseMetadata & {
  type: 'NODE';
  nodeType: NodeType;
  name: string;
  relationshipIds: string[];
  fromRelationIds: string[];
  toRelationIds: string[];
}

type RelationshipMetadata = BaseMetadata & {
  type: 'RELATIONSHIP';
  relationType: string;
  fromNodeId: string;
  fromNodeType: NodeType;
  fromNodeName: string;
  toNodeId: string;
  toNodeType: NodeType;
  toNodeName: string;
}

type NoteMetadata = BaseMetadata & {
  type: 'NOTE';
  author: string;
  nodeId: string;
}

type VectorMetadata = NodeMetadata | RelationshipMetadata | NoteMetadata;

export class PineconeService {
  private pinecone: Pinecone;
  private indexName: string;
  private namespace: string;

  constructor(organization: Organization, ontology: Ontology) {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });
    this.indexName = organization.pineconeIndex;
    this.namespace = PineconeService.generateNamespace(organization.id, ontology.id);
  }

  static generateNamespace(organizationId: string, ontologyId: string): string {
    return `org_${organizationId}_ont_${ontologyId}`;
  }

  private get index() {
    return this.pinecone.index(this.indexName);
  }

  // New methods for managing namespaces
  static async createOrgIndex(indexName: string) {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    // Check if index exists
    const indexes = await pinecone.listIndexes();
    const existingIndex = indexes.find(index => index.name === indexName);
    
    if (!existingIndex) {
      // Create index with appropriate dimensions for your embeddings
      await pinecone.createIndex({
        name: indexName,
        spec: {
          dimension: 1536, // Adjust based on your embedding model
          metric: 'cosine'
        }
      });
    }
  }

  async deleteNamespace() {
    await this.index.namespace(this.namespace).deleteAll();
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

    const metadata: NodeMetadata = {
      type: 'NODE',
      id: nodeId,
      nodeType: node.type,
      name: node.name,
      content,
      relationshipIds,
      fromRelationIds,
      toRelationIds,
    };

    const record: PineconeRecord = {
      id: `node_${nodeId}`,
      values: vector,
      metadata,
    };

    await this.index.namespace(this.namespace).upsert([record]);
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
    const metadata: RelationshipMetadata = {
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
    };

    const record: PineconeRecord = {
      id: `rel_${relationshipId}`,
      values: vector,
      metadata,
    };

    await this.index.namespace(this.namespace).upsert([record]);
    return record.id;
  }

  async upsertNoteVector(
    noteId: string,
    vector: number[],
    content: string,
    author: string,
    nodeId: string
  ): Promise<string> {
    const metadata: NoteMetadata = {
      type: 'NOTE',
      id: noteId,
      content,
      author,
      nodeId,
    };

    const record: PineconeRecord = {
      id: `note_${noteId}`,
      values: vector,
      metadata,
    };

    await this.index.namespace(this.namespace).upsert([record]);
    return record.id;
  }

  async querySimilar(
    vector: number[],
    topK: number = 5,
    activeFilters?: Set<'NODE' | 'RELATIONSHIP' | 'NOTE'>
  ) {
    const filter = activeFilters && activeFilters.size > 0 ? {
      type: { $in: Array.from(activeFilters) }
    } : undefined;

    const response = await this.index.namespace(this.namespace).query({
      vector,
      topK,
      filter,
      includeMetadata: true
    });

    return response.matches?.map(match => ({
      ...match,
      metadata: match.metadata as VectorMetadata,
    }));
  }

  async deleteVector(vectorId: string) {
    await this.index.namespace(this.namespace).deleteOne(vectorId);
  }

  async deleteVectors(vectorIds: string[]) {
    await this.index.namespace(this.namespace).deleteMany(vectorIds);
  }
}

// Helper function to create a new PineconeService instance
export function createPineconeService(organization: Organization, ontology: Ontology) {
  return new PineconeService(organization, ontology);
}
