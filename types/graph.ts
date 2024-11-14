import { NodeType } from '@prisma/client';

export { NodeType };

export interface Note {
  id: string;
  content: string;
  author: string;
  nodeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NodeData {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
  notes?: Note[];
  fromRelations?: Array<{
    id: string;
    relationType: string;
    toNode: NodeData;
  }>;
  toRelations?: Array<{
    id: string;
    relationType: string;
    fromNode: NodeData;
  }>;
}

export interface OntologyData {
  nodes: Array<{
    id: string;
    type: NodeType;
    name: string;
  }>;
  relationships: Array<{
    id: string;
    source: { id: string };
    target: { id: string };
    relationType: string;
  }>;
}
