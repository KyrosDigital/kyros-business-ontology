import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Plus } from "lucide-react";
import { Note } from '@/types/graph';
import * as d3 from 'd3';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface NodePanelProps {
  isPanelOpen: boolean;
  selectedNode: any;
  onClose: () => void;
  onCreateNode: (nodeData: Partial<NodeData>) => void;
}

interface CreateFormData {
  name: string;
  description?: string;
  type?: string;
}

export function NodePanel({ isPanelOpen, selectedNode, onClose, onCreateNode }: NodePanelProps) {
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

  const getChildTypeForParent = (parentType: string): string[] => {
    // All nodes can potentially connect to any other node type
    return [
      'Organization',
      'Department',
      'Role',
      'Process',
      'Task',
      'Integration',
      'SoftwareTool',
      'DataSource',
      'Analytics',
      'AIComponent'
    ];
  };

  const handleCreateChild = async () => {
    if (!selectedNode?.id || !formData.name) return;

    try {
      const requestBody = {
        parentId: selectedNode.id,
        parentType: selectedNode.type,
        type: formData.type || getChildTypeForParent(selectedNode.type)[0],
        name: formData.name,
        description: formData.description
      };

      const response = await fetch('/api/v1/ontology/create-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create child node');
      }

      const newNode = await response.json();
      onCreateNode(newNode);
      setIsCreating(false);
      resetForm();
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
            <h3 className="text-sm font-medium text-gray-500">Type</h3>
            <p className="mt-1">{selectedNode?.type}</p>
          </div>

          {selectedNode?.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <p className="mt-1 text-gray-700">{selectedNode.description}</p>
            </div>
          )}

          {selectedNode?.responsibilities && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Responsibilities</h3>
              <p className="mt-1 text-gray-700">{selectedNode.responsibilities}</p>
            </div>
          )}
          
          {selectedNode?.notes && selectedNode.notes.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Notes</h3>
              <div className="space-y-4">
                {selectedNode.notes.map((note: Note, index: number) => (
                  <Card key={index} className="p-3">
                    <p className="text-gray-700">{note.content}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      {note.author && <span>By: {note.author}</span>}
                      {note.dateCreated && (
                        <span>
                          {new Date(note.dateCreated).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Notes</h3>
              <p className="mt-1 text-gray-700">No notes available for this node.</p>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
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
                            {node.type}
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
