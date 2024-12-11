import { NodeType } from '@prisma/client';

export { NodeType };

export interface NodeRelationship {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: string;
  fromNode: Node;
  toNode: Node;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Note {
  id: string;
  content: string;
  author: string;
  nodeId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface NodeData {
  id: string;
  name: string;
  type: NodeType;
  description?: string;
  metadata?: Record<string, unknown>;
  notes?: Note[];
  fromRelations?: {
    toNode: {
      id: string;
      name: string;
      type: NodeType;
      description?: string;
      metadata?: Record<string, unknown>;
    };
    relationType: string;
  }[];
  toRelations?: {
    fromNode: {
      id: string;
      name: string;
      type: NodeType;
      description?: string;
      metadata?: Record<string, unknown>;
    };
    relationType: string;
  }[];
	relationType?: string;
  responsibilities?: string;
}

export interface OntologyData {
  nodes: NodeData[];
  relationships: NodeRelationship[];
}

export type DeletionStrategy = 'orphan' | 'cascade' | 'reconnect';
