import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Plus, Pencil } from "lucide-react";
import { NodeData, Note, NodeType } from '@/types/graph';
import * as d3 from 'd3';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NODE_TYPES } from './legend';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface NodePanelProps {
  isPanelOpen: boolean;
  selectedNode: NodeData | null;
  onClose: () => void;
  onCreateNode: (nodeData: Partial<NodeData>) => void;
  refreshNode: (nodeId: string) => Promise<void>;
  onNodeUpdate: (nodeId: string, updatedData: Partial<NodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
}

interface CreateFormData {
  name: string;
  description?: string;
  type: NodeType | '';
}

// Add this helper function at the top of the file, outside the component
const formatNodeType = (type: NodeType): string => {
  // Convert SNAKE_CASE to Title Case
  return type.split('_')
    .map(word => word.charAt(0) + word.toLowerCase().slice(1))
    .join(' ');
};

// Add this type near the top of the file
type DeletionStrategy = 'orphan' | 'cascade' | 'reconnect';

// Add this helper function to check if node has children
const hasChildren = (node: NodeData | null): boolean => {
  if (!node || !node.fromRelations) return false;
  return node.fromRelations.length > 0;
};

export function NodePanel({ isPanelOpen, selectedNode, onClose, onCreateNode, refreshNode, onNodeUpdate, onDeleteNode }: NodePanelProps) {
  const getConnectedNodes = () => {
    if (!selectedNode) return [];
    
    const connectedNodes = [];
    
    // Get nodes from outgoing relationships (fromRelations)
    if (selectedNode.fromRelations) {
      const outgoingNodes = selectedNode.fromRelations.map((rel: any) => ({
        id: rel.toNode.id,
        name: rel.toNode.name,
        type: rel.toNode.type,
        description: rel.toNode.description,
        metadata: rel.toNode.metadata,
        relationType: rel.relationType,
        direction: 'outgoing'
      }));
      connectedNodes.push(...outgoingNodes);
    }

    // Get nodes from incoming relationships (toRelations)
    if (selectedNode.toRelations) {
      const incomingNodes = selectedNode.toRelations.map((rel: any) => ({
        id: rel.fromNode.id,
        name: rel.fromNode.name,
        type: rel.fromNode.type,
        description: rel.fromNode.description,
        metadata: rel.fromNode.metadata,
        relationType: rel.relationType,
        direction: 'incoming'
      }));
      connectedNodes.push(...incomingNodes);
    }

    return connectedNodes;
  };

  const handleClose = () => {
    onClose();
    // Remove pulse effect from all nodes when panel is closed
    const svg = d3.select('svg');
    svg.selectAll('.node').classed('node-pulse', false);
    // Reset opacity for all nodes and links
    svg.selectAll('.node').transition().duration(200).style('opacity', 1);
    svg.selectAll('.link').transition().duration(200).style('opacity', 1);
  };

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateFormData>({
    name: '',
    description: '',
    type: ''
  });

  const getChildTypeForParent = (parentType: string): NodeType[] => {
    return [
      NodeType.ORGANIZATION,
      NodeType.DEPARTMENT,
      NodeType.ROLE,
      NodeType.PROCESS,
      NodeType.TASK,
      NodeType.INTEGRATION,
      NodeType.SOFTWARE_TOOL,
      NodeType.DATA_SOURCE,
      NodeType.ANALYTICS,
      NodeType.AI_COMPONENT
    ];
  };

  const handleCreateChild = async () => {
    if (!selectedNode?.id || !formData.name || !formData.type) return;

    try {
      const nodeData = {
        type: formData.type,
        name: formData.name,
        description: formData.description
      };

      const response = await fetch('/api/v1/ontology/create-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: selectedNode.id,
          nodeData: nodeData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create child node');
      }

      const newNode = await response.json();
      onCreateNode(newNode);
      
      // Reset the form and creation state
      setIsCreating(false);
      resetForm();
      
      // Remove the refreshNode call since we already have the updated data
      // await refreshNode(selectedNode.id);
    } catch (error) {
      console.error('Error creating child node:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: ''
    });
  };

  const [noteContent, setNoteContent] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  const handleAddNote = async () => {
    try {
      const response = await fetch('/api/v1/ontology/add-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: selectedNode.id,
          content: noteContent,
          author: 'User'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add note');
      }

      // Clear the input and hide the note form
      setNoteContent('');
      setIsAddingNote(false);
      
      // Refresh the node data to show the new note
      await refreshNode(selectedNode.id);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(selectedNode?.description || '');

  const handleUpdateDescription = async () => {
    try {
      const response = await fetch(`/api/v1/ontology/${selectedNode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editedDescription }),
      });

      if (!response.ok) {
        throw new Error('Failed to update description');
      }

      const updatedNode = await response.json();
      onNodeUpdate(selectedNode.id, updatedNode);
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Error updating description:', error);
    }
  };

  const [isEditingType, setIsEditingType] = useState(false);
  const [editedType, setEditedType] = useState<NodeType>(selectedNode?.type || NodeType.ORGANIZATION);

  const handleUpdateType = async () => {
    try {
      const response = await fetch(`/api/v1/ontology/${selectedNode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: editedType }),
      });

      if (!response.ok) {
        throw new Error('Failed to update type');
      }

      const updatedNode = await response.json();
      onNodeUpdate(selectedNode.id, updatedNode);
      setIsEditingType(false);
    } catch (error) {
      console.error('Error updating type:', error);
    }
  };

  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleDeleteNode = async (strategy: DeletionStrategy) => {
    try {
      const response = await fetch(`/api/v1/ontology/${selectedNode?.id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ strategy })
      });

      if (!response.ok) {
        throw new Error('Failed to delete node');
      }

      setIsAlertOpen(false);
      onDeleteNode(selectedNode!.id);
      handleClose();
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 w-96 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        isPanelOpen ? 'translate-x-0' : 'translate-x-full'
      } z-20 overflow-y-auto`}
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">
            {selectedNode?.name || selectedNode?.id || 'Node Details'}
          </h2>
          <div className="mb-6">
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete Node
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {selectedNode && hasChildren(selectedNode)
                      ? "Choose Deletion Strategy" 
                      : "Confirm Deletion"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {selectedNode && hasChildren(selectedNode) ? (
                      <div className="space-y-4">
                        <div>Please select how you want to handle the node deletion:</div>
                        
                        <div className="space-y-2">
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => handleDeleteNode('orphan')}
                          >
                            <div className="text-left">
                              <div className="font-semibold">Leave Children as Orphans</div>
                              <div className="text-sm text-gray-500">Delete only this node, leaving child nodes independent</div>
                            </div>
                          </Button>

                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => handleDeleteNode('cascade')}
                          >
                            <div className="text-left">
                              <div className="font-semibold">Delete Entire Subtree</div>
                              <div className="text-sm text-gray-500">Delete this node and all its descendants</div>
                            </div>
                          </Button>

                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => handleDeleteNode('reconnect')}
                          >
                            <div className="text-left">
                              <div className="font-semibold">Reconnect Children</div>
                              <div className="text-sm text-gray-500">Delete this node and connect its children to its parent</div>
                            </div>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>Are you sure you want to delete this node?</div>
                        <div className="flex justify-end space-x-2">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <Button 
                            variant="destructive"
                            onClick={() => handleDeleteNode('orphan')}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {selectedNode && hasChildren(selectedNode) && (
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                  </AlertDialogFooter>
                )}
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-500">Type</h3>
              {!isEditingType && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingType(true);
                    setEditedType(selectedNode.type);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
            {isEditingType ? (
              <div className="mt-2 space-y-2">
                <select 
                  className="w-full p-2 border rounded"
                  value={editedType}
                  onChange={(e) => setEditedType(e.target.value as NodeType)}
                >
                  {NODE_TYPES.map((type) => (
                    <option key={type.type} value={type.type}>
                      {formatNodeType(type.type)}
                    </option>
                  ))}
                </select>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleUpdateType}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingType(false);
                      setEditedType(selectedNode.type);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1">{selectedNode?.type && formatNodeType(selectedNode.type)}</p>
            )}
          </div>

          {selectedNode?.description !== undefined && (
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                {!isEditingDescription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingDescription(true);
                      setEditedDescription(selectedNode.description || '');
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {isEditingDescription ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={handleUpdateDescription}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingDescription(false);
                        setEditedDescription(selectedNode.description || '');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-gray-700">
                  {selectedNode.description || 'No description provided'}
                </p>
              )}
            </div>
          )}

          {selectedNode?.responsibilities && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Responsibilities</h3>
              <p className="mt-1 text-gray-700">{selectedNode.responsibilities}</p>
            </div>
          )}
          
          {selectedNode?.notes && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                <Button
                  size="sm"
                  onClick={() => setIsAddingNote(!isAddingNote)}
                >
                  {isAddingNote ? 'Cancel' : 'Add Note'}
                </Button>
              </div>

              {/* Add note form */}
              {isAddingNote && (
                <div className="mb-4 space-y-2">
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter your note..."
                    className="w-full"
                  />
                  <Button 
                    onClick={handleAddNote}
                    disabled={!noteContent.trim()}
                  >
                    Save Note
                  </Button>
                </div>
              )}

              {/* Display existing notes */}
              <div className="space-y-4">
                {selectedNode.notes.length > 0 ? (
                  selectedNode.notes.map((note: Note, index: number) => (
                    <Card key={index} className="p-3">
                      <p className="text-gray-700">{note.content}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        {note.author && <span>By: {note.author}</span>}
                        {note.createdAt && (
                          <span>
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-gray-500">No notes available</p>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-500">Connected Nodes</h3>
              {selectedNode && !isCreating && (
                <Button
                  size="sm"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Child
                </Button>
              )}
            </div>
            
            {isCreating && selectedNode && (
              <div className="mt-4 space-y-4">
                <select 
                  className="w-full p-2 border rounded"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as NodeType }))}
                  required
                >
                  <option value="">Select Type</option>
                  {getChildTypeForParent(selectedNode.type).map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <Input
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />

                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />

                <div className="flex space-x-2">
                  <Button 
                    onClick={handleCreateChild}
                    disabled={!formData.name}
                  >
                    Create
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCreating(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {getConnectedNodes().length > 0 ? (
              <div className="space-y-4 mt-3">
                {getConnectedNodes().map((node: any) => (
                  <Card key={`${node.id}-${node.direction}`} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-700">{node.name}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {formatNodeType(node.type)}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {node.direction === 'incoming' ? '← ' : '→ '}
                            {node.relationType}
                          </span>
                        </div>
                      </div>
                    </div>
                    {node.description && (
                      <p className="mt-2 text-sm text-gray-600">
                        {node.description}
                      </p>
                    )}
                    {node.metadata && Object.keys(node.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {Object.entries(node.metadata).map(([key, value]) => (
                          <p key={key}>
                            {key}: {JSON.stringify(value)}
                          </p>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-gray-700">No connected nodes.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
