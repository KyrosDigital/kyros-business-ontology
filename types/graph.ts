import { NodeType } from '@prisma/client';

export { NodeType };

export interface Note {
  id: string;
  content: string;
  author: string;
  dateCreated: Date;
}

export interface NodeData {
  id: string;
  name: string;
  type: NodeType;
  description?: string;
  metadata?: Record<string, unknown>;
  fromRelations?: NodeRelationship[];
  toRelations?: NodeRelationship[];
  notes?: Note[];
}

export interface NodeRelationship {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: string;
  fromNode: NodeData;
  toNode: NodeData;
  createdAt: Date;
  updatedAt: Date;
}

export interface Relationship {
  id: string;
  source: NodeData;
  target: NodeData;
  relationType: string;
}

export interface OntologyData {
  nodes: NodeData[];
  relationships: Relationship[];
}

export interface ApiNodeResponse extends Omit<NodeData, 'fromRelations' | 'toRelations'> {
  fromRelations: {
    id: string;
    relationType: string;
    toNode: NodeData;
  }[];
  toRelations: {
    id: string;
    relationType: string;
    fromNode: NodeData;
  }[];
}
