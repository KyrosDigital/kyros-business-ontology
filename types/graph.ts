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
  type: NodeType;
  name: string;
  description?: string;
  metadata?: InputJsonValue;
  notes?: Note[];
  fromRelations?: NodeRelationship[];
  toRelations?: NodeRelationship[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OntologyData {
  nodes: NodeData[];
  relationships: NodeRelationship[];
}
