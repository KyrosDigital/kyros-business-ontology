export interface Note {
  content: string;
  author: string;
  dateCreated: string;
}

export interface NodeData {
  id: string;
  name?: string;
  type: string;
  description?: string;
  version?: string;
  versionDate?: string;
  hasNote?: Note[];
  notes?: Note[];
  responsibilities?: string;
  children: NodeData[];
  // ... any other fields you need
}

export interface Node {
  id: string;
  type: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Link {
  source: string | Node;
  target: string | Node;
  relationship: string;
}
