import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Plus, Edit, Trash2, Link as LinkIcon } from "lucide-react";
import { NodeType } from '@prisma/client';

interface Node {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  notes?: Array<{
    id: string;
    content: string;
    author: string;
    dateCreated: Date;
  }>;
}

interface NodesCategoryProps {
  isPanelOpen: boolean;
  selectedNode: Node | null;
  selectedType: NodeType | null;
  nodes: Node[];
  onClose: () => void;
  onUpdateNode: (nodeId: string, nodeData: Partial<Node>) => void;
  onDeleteNode: (nodeId: string) => void;
  onCreateRelationship: (sourceId: string, targetId: string, relationType: string) => void;
}

export function NodesCategoryPanel({ 
  isPanelOpen, 
  selectedNode, 
  selectedType,
  nodes,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onCreateRelationship 
}: NodesCategoryProps) {
  // Filter nodes by selected type
  const categoryNodes = nodes.filter(node => node.type === selectedType);

  // Helper function to render metadata
  const renderMetadata = (metadata: Record<string, any>) => {
    return Object.entries(metadata).map(([key, value]) => (
      <div key={key} className="text-sm">
        <span className="font-medium">{key}: </span>
        <span className="text-gray-600">
          {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
        </span>
      </div>
    ));
  };

  return (
    <div
      className={`fixed top-0 right-0 w-96 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        isPanelOpen ? 'translate-x-0' : 'translate-x-full'
      } z-20 overflow-y-auto`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">
            {selectedType || 'Node Details'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Category View */}
        {selectedType && !selectedNode && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">{selectedType} Nodes</h3>
              <Button
                size="sm"
                onClick={() => onCreateNode({ type: selectedType })}
              >
                <Plus className="h-4 w-4 mr-2" />
                New {selectedType}
              </Button>
            </div>
            
            <div className="space-y-3">
              {categoryNodes.map((node) => (
                <Card key={node.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-medium text-lg">{node.name || node.id}</h4>
                        {node.description && (
                          <p className="text-sm text-gray-600">{node.description}</p>
                        )}
                      </div>
                      
                      {/* Metadata section */}
                      {node.metadata && (
                        <div className="space-y-1">
                          {renderMetadata(node.metadata)}
                        </div>
                      )}

                      {/* Notes section */}
                      {node.notes && node.notes.length > 0 && (
                        <div className="mt-2 text-sm">
                          <p className="font-medium">Notes:</p>
                          <ul className="list-disc list-inside text-gray-600">
                            {node.notes.map((note) => (
                              <li key={note.id} className="ml-2">
                                {note.content}
                                <span className="text-xs text-gray-500 ml-1">
                                  - {note.author}, {new Date(note.dateCreated).toLocaleDateString()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Relationships section */}
                      {(node.fromRelations?.length > 0 || node.toRelations?.length > 0) && (
                        <div className="mt-2 text-sm">
                          <p className="font-medium">Relationships:</p>
                          <ul className="list-disc list-inside text-gray-600">
                            {node.fromRelations?.map((rel) => (
                              <li key={rel.id} className="ml-2">
                                {rel.relationType} → {rel.toNode.name}
                              </li>
                            ))}
                            {node.toRelations?.map((rel) => (
                              <li key={rel.id} className="ml-2">
                                {rel.fromNode.name} → {rel.relationType}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onUpdateNode(node.id, {})}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onCreateRelationship(node.id, '', '')}
                        title="Create Relationship"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteNode(node.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {categoryNodes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No {selectedType} nodes found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Single Node View */}
        {selectedNode && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{selectedNode.name}</h3>
              {selectedNode.description && (
                <p className="text-gray-600">{selectedNode.description}</p>
              )}
              
              {/* Metadata display */}
              {selectedNode.metadata && (
                <div className="space-y-2">
                  <h4 className="font-medium">Metadata</h4>
                  {renderMetadata(selectedNode.metadata)}
                </div>
              )}
              
              {/* Notes display */}
              {selectedNode.notes && selectedNode.notes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Notes</h4>
                  <div className="space-y-2">
                    {selectedNode.notes.map((note) => (
                      <div key={note.id} className="text-sm">
                        <p>{note.content}</p>
                        <p className="text-xs text-gray-500">
                          - {note.author}, {new Date(note.dateCreated).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 