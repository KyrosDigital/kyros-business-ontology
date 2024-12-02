import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { NodeType, Organization, Ontology } from '@prisma/client';
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
  ontologyId: string;
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
    const existingIndex = indexes.indexes?.find(index => index.name === indexName);
    
    if (!existingIndex) {
      // Create index with appropriate dimensions for your embeddings
      await pinecone.createIndex({
        name: indexName,
        metric: 'cosine',
        dimension: 1536, // Adjust based on your embedding model
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
    }
  }

  static async deleteOrgIndex(indexName: string) {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });

    try {
      await pinecone.deleteIndex(indexName);
    } catch (error) {
      console.error('Error deleting Pinecone index:', error);
      throw error;
    }
  }

  async deleteNamespace() {
    try {
      await this.index.namespace(this.namespace).deleteAll();
    } catch (error: any) {
      // If the error is a 404 (namespace not found), we can safely ignore it
      // since this means there's no data to delete anyway
      if (error?.name === 'PineconeNotFoundError') {
        console.log(`Namespace ${this.namespace} doesn't exist - nothing to delete`);
        return;
      }
      // Re-throw other types of errors
      throw error;
    }
  }

  async upsertNodeVector(
    nodeId: string,
    vector: number[],
    node: NodeWithRelations,
    content: string
  ): Promise<string> {

    const metadata: NodeMetadata = {
      type: 'NODE',
      id: nodeId,
      nodeType: node.type,
      name: node.name,
      content,
      ontologyId: node.ontologyId
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
