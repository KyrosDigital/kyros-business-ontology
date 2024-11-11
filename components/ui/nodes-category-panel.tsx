import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Plus, Edit, Trash2, Link as LinkIcon } from "lucide-react";
import { Note, NodeData } from '@/types/graph';

interface NodesCategoryProps {
  isPanelOpen: boolean;
  selectedNode: NodeData | null;
  selectedType: string | null;
  nodes: NodeData[];
  onClose: () => void;
  onCreateNode: (nodeData: Partial<NodeData>) => void;
  onUpdateNode: (nodeId: string, nodeData: Partial<NodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onCreateLink: (sourceId: string, targetId: string, relationship: string) => void;
}

export function NodesCategoryPanel({ 
  isPanelOpen, 
  selectedNode, 
  selectedType,
  nodes,
  onClose,
  onCreateNode,
  onUpdateNode,
  onDeleteNode,
  onCreateLink 
}: NodesCategoryProps) {
  // Filter nodes by selected type
  const categoryNodes = nodes.filter(node => node.type === selectedType);

	console.log(categoryNodes)
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
                      
                      {/* Additional node details */}
                      {node.responsibilities && (
                        <div className="text-sm">
                          <span className="font-medium">Responsibilities:</span>
                          <p className="text-gray-600">{node.responsibilities}</p>
                        </div>
                      )}
                      
                      {node.version && (
                        <div className="text-xs text-gray-500">
                          Version: {node.version}
                          {node.versionDate && ` (${new Date(node.versionDate).toLocaleDateString()})`}
                        </div>
                      )}

                      {/* Display notes if they exist */}
                      {(node.notes?.length > 0 || node.hasNote?.length > 0) && (
                        <div className="mt-2 text-sm">
                          <p className="font-medium">Notes:</p>
                          <ul className="list-disc list-inside text-gray-600">
                            {[...(node.notes || []), ...(node.hasNote || [])].map((note, index) => (
                              <li key={index} className="ml-2">
                                {note.content}
                                <span className="text-xs text-gray-500 ml-1">
                                  - {note.author}, {new Date(note.dateCreated).toLocaleDateString()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Add child nodes section */}
                      {node.children?.length > 0 && (
                        <div className="mt-2 text-sm">
                          <p className="font-medium">Child Nodes:</p>
                          <ul className="list-disc list-inside text-gray-600">
                            {node.children.map((childNode, index) => (
                              <li key={index} className="ml-2">
                                {childNode.name || childNode.id}
                                {childNode.type && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    - {childNode.type}
                                  </span>
                                )}
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
                        onClick={() => onCreateLink(node.id, '', '')}
                        title="Create Link"
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

        {/* Single Node View - kept for reference */}
        {selectedNode && (
          <div className="space-y-6">
            {/* ... existing node detail view code ... */}
          </div>
        )}
      </div>
    </div>
  );
} 