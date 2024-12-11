import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Plus, Pencil } from "lucide-react";
import { NodeData, Note, NodeType, DeletionStrategy } from '@/types/graph';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NODE_TYPES } from './legend';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatNodeType, hasChildren } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useGraph } from '@/contexts/GraphContext';

interface NodePanelProps {
  isPanelOpen: boolean;
  selectedNode: NodeData | null;
  onClose: () => void;
  onCreateNode: (nodeData: Partial<NodeData>) => void;
  refreshNode: (nodeId: string) => Promise<void>;
  onNodeUpdate: (nodeId: string, updatedData: Partial<NodeData>) => void;
  onDeleteNode: (nodeId: string, strategy: DeletionStrategy) => void;
  refreshGraph: () => Promise<void>;
}

interface CreateFormData {
  name: string;
  description?: string;
  type: NodeType | '';
  relationType: string;
}

interface ConnectedNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  metadata?: Record<string, any>;
  relationType: string;
  direction: 'incoming' | 'outgoing';
}

export function NodePanel({ isPanelOpen, selectedNode, onClose, onCreateNode, refreshNode, onNodeUpdate, onDeleteNode }: NodePanelProps) {
  const [noteContent, setNoteContent] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(selectedNode?.description || '');
  const [isEditingType, setIsEditingType] = useState(false);
  const [editedType, setEditedType] = useState<NodeType>(selectedNode?.type || NodeType.ORGANIZATION);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateFormData>({
    name: '',
    description: '',
    type: '',
    relationType: ''
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(selectedNode?.name || '');
  const { organization } = useOrganization();
  const { ontologyId } = useGraph();
  
  const getConnectedNodes = () => {
    if (!selectedNode) return [];
    
    const connectedNodes: ConnectedNode[] = [];
    
    // Get nodes from outgoing relationships (fromRelations)
    if (selectedNode.fromRelations && Array.isArray(selectedNode.fromRelations)) {
      const outgoingNodes = selectedNode.fromRelations.map((rel) => ({
        id: rel.toNode.id,
        name: rel.toNode.name,
        type: rel.toNode.type,
        description: rel.toNode.description,
        metadata: rel.toNode.metadata,
        relationType: rel.relationType,
        direction: 'outgoing' as const
      }));
      connectedNodes.push(...outgoingNodes);
    }

    // Get nodes from incoming relationships (toRelations)
    if (selectedNode.toRelations && Array.isArray(selectedNode.toRelations)) {
      const incomingNodes = selectedNode.toRelations.map((rel) => ({
        id: rel.fromNode.id,
        name: rel.fromNode.name,
        type: rel.fromNode.type,
        description: rel.fromNode.description,
        metadata: rel.fromNode.metadata,
        relationType: rel.relationType,
        direction: 'incoming' as const
      }));
      connectedNodes.push(...incomingNodes);
    }

    return connectedNodes;
  };

  // close the panel
  const handleClose = () => {
    onClose();
  };

  const handleCreateNode = async () => {
    if (!formData.name || !formData.type || !formData.relationType) return;

    onCreateNode({
      type: formData.type as NodeType,
      name: formData.name,
      description: formData.description,
      relationType: formData.relationType
    });

    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: '',
      relationType: ''
    });
  };

  const handleAddNote = async () => {
    if (!selectedNode || !organization?.id || !ontologyId) return;
    try {
      const response = await fetch('/api/v1/ontology/add-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: selectedNode.id,
          content: noteContent,
          author: 'User',
          organizationId: organization.id,
          ontologyId: ontologyId
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

  const handleUpdateDescription = async () => {
    if (!selectedNode) return;
    try {
      await onNodeUpdate(selectedNode.id, { description: editedDescription });
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Error updating description:', error);
    }
  };

  const handleUpdateType = async () => {
    if (!selectedNode) return;
    try {
      const updatedNode = await onNodeUpdate(selectedNode.id, { type: editedType });
      setIsEditingType(false);
      setEditedType(editedType);
    } catch (error) {
      console.error('Error updating type:', error);
    }
  };

  const handleDeleteNode = async (strategy: DeletionStrategy) => {
    try {
      await onDeleteNode(selectedNode!.id, strategy);
      setIsAlertOpen(false);
      handleClose();
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const handleUpdateName = async () => {
    if (!selectedNode) return;
    try {
      await onNodeUpdate(selectedNode.id, { name: editedName });
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  // When the selectedNode changes, update the editedType
  useEffect(() => {
    if (selectedNode) {
      setEditedType(selectedNode.type);
      setEditedName(selectedNode.name);
    }
  }, [selectedNode]);

  return (
    <div
      className={`fixed top-0 right-0 w-96 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        isPanelOpen ? 'translate-x-0' : 'translate-x-full'
      } z-20 overflow-y-auto`}
    >
      <div className="p-6 pt-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-2xl font-semibold h-9"
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={handleUpdateName}
                    disabled={!editedName.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(selectedNode?.name || '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {selectedNode?.name || selectedNode?.id || 'Node Details'}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingName(true);
                    setEditedName(selectedNode?.name || '');
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
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
                </AlertDialogHeader>

                {selectedNode && hasChildren(selectedNode) ? (
                  <>
                    <AlertDialogDescription className="mb-4">
                      Please select how you want to handle the node deletion:
                    </AlertDialogDescription>
                    
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

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                  </>
                ) : (
                  <>
                    <AlertDialogDescription>
                      Are you sure you want to delete this node?
                    </AlertDialogDescription>
                    
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <Button 
                        variant="destructive"
                        onClick={() => handleDeleteNode('orphan')}
                      >
                        Delete
                      </Button>
                    </AlertDialogFooter>
                  </>
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
                      setEditedType(selectedNode?.type || NodeType.ORGANIZATION);
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
          
          {selectedNode && (
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
                {selectedNode.notes && selectedNode.notes.length > 0 ? (
                  selectedNode.notes.map((note: Note) => (
                    <Card key={note.id} className="p-3">
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
                  {Object.values(NodeType).map((type) => (
                    <option key={type} value={type}>{formatNodeType(type)}</option>
                  ))}
                </select>

                <Input
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />

                <Input
                  placeholder="Relationship Type (e.g., manages, uses, depends_on)"
                  value={formData.relationType}
                  onChange={(e) => setFormData(prev => ({ ...prev, relationType: e.target.value }))}
                  required
                />

                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />

                <div className="flex space-x-2">
                  <Button 
                    onClick={handleCreateNode}
                    disabled={!formData.name || !formData.type || !formData.relationType}
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
                {getConnectedNodes().map((node: ConnectedNode) => (
                  <Card key={`${node.id}-${node.direction}`} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-700">{node.name}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {node.direction === 'outgoing' ? (
                              <>
                                {node.relationType} {' → '} {formatNodeType(node.type)}
                              </>
                            ) : (
                              <>
                                {formatNodeType(node.type)} {' ← '} {node.relationType}
                              </>
                            )}
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
