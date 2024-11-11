export interface Note {
  content: string;
  author: string;
  dateCreated: string;
}

export interface NodeData {
  id: string;
  name: string;
  type: string;
  description?: string;
  version?: string;
  versionDate?: Date;
  notes?: Note[];
  children: NodeData[];
}

export interface Link {
  source: string;
  target: string;
  relationship: string;
}
