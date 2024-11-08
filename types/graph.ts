export interface Note {
  content: string;
  author?: string;
  dateCreated?: string;
}

export interface NodeData extends Node {
  description?: string;
  notes?: Note[];
  responsibilities?: string;
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
