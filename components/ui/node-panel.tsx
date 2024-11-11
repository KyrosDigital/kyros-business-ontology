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
  version?: string;
  versionDate?: string;
}

export function NodePanel({ isPanelOpen, selectedNode, onClose, onCreateNode }: NodePanelProps) {
  const getDirectChildren = () => {
    if (!selectedNode) return [];
    
    const children = [];
    
    // Handle different node types and their relationships based on schema
    switch (selectedNode.type) {
      case 'Organization':
        if (selectedNode.departments) {
          children.push(...selectedNode.departments.map((dept: any) => ({
            name: dept.name,
            type: 'Department',
            description: dept.description
          })));
        }
        break;
        
      case 'Department':
        // Departments can have roles, processes, tools, analytics, and AI components
        if (selectedNode.roles) {
          children.push(...selectedNode.roles.map((role: any) => ({
            name: role.name,
            type: 'Role',
            description: role.responsibilities
          })));
        }
        if (selectedNode.processes) {
          children.push(...selectedNode.processes.map((process: any) => ({
            name: process.name,
            type: 'Process',
            description: process.description
          })));
        }
        if (selectedNode.tools) {
          children.push(...selectedNode.tools.map((tool: any) => ({
            name: tool.name,
            type: 'Software Tool',
            description: tool.description
          })));
        }
        if (selectedNode.analytics) {
          children.push(...selectedNode.analytics.map((analytic: any) => ({
            name: analytic.name,
            type: 'Analytics',
            description: analytic.description
          })));
        }
        if (selectedNode.aiComponents) {
          children.push(...selectedNode.aiComponents.map((ai: any) => ({
            name: ai.name,
            type: 'AI Component',
            description: ai.description
          })));
        }
        break;
        
      case 'Process':
        // Processes can have tasks, integrations, and data sources
        if (selectedNode.workflow) {
          children.push(...selectedNode.workflow.map((task: any) => ({
            name: task.name,
            type: 'Task',
            description: task.description
          })));
        }
        if (selectedNode.integrations) {
          children.push(...selectedNode.integrations.map((integration: any) => ({
            name: integration.name,
            type: 'Integration',
            description: integration.description
          })));
        }
        if (selectedNode.dataSources) {
          children.push(...selectedNode.dataSources.map((ds: any) => ({
            name: ds.name,
            type: 'Data Source',
            description: ds.description
          })));
        }
        break;
        
      case 'Role':
        // Roles can have tasks
        if (selectedNode.tasks) {
          children.push(...selectedNode.tasks.map((task: any) => ({
            name: task.name,
            type: 'Task',
            description: task.description
          })));
        }
        break;
    }
    
    return children;
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
    version: '',
    versionDate: new Date().toISOString().split('T')[0]
  });

  const getChildTypeForParent = (parentType: string) => {
    switch (parentType) {
      case 'Organization':
        return 'Department';
      case 'Department':
        return ['Role', 'Process', 'Software Tool', 'Analytics', 'AI Component'];
      case 'Process':
        return ['Task', 'Integration', 'Data Source'];
      case 'Role':
        return ['Task'];
      default:
        return [];
    }
  };

  const needsVersioning = (type: string) => {
    return ['Role', 'Process', 'Task', 'Integration', 'SoftwareTool', 'DataSource', 'Analytics', 'AIComponent'].includes(type);
  };

  const handleCreateChild = async () => {
    if (!selectedNode?.id || !formData.name) return;

    try {
      // Log the request body for debugging
      const requestBody = {
        parentId: selectedNode.id,
        parentType: selectedNode.type,
        name: formData.name,
        description: formData.description,
        ...(needsVersioning(selectedNode.type) && {
          version: formData.version,
          versionDate: formData.versionDate
        })
      };
      console.log('Creating child node with:', requestBody);

      const response = await fetch('/api/v1/ontology/create-child', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create child node');
      }

      const newNode = await response.json();
      onCreateNode(newNode);
      setIsCreating(false);
      setFormData({
        name: '',
        description: '',
        version: '',
        versionDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error creating child node:', error);
      // You might want to add error handling UI here, like a toast notification
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
              <h3 className="text-sm font-medium text-gray-500">Child Nodes</h3>
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
                {selectedNode.type === 'Department' && (
                  <select 
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="">Select Type</option>
                    {getChildTypeForParent(selectedNode.type).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                )}

                <Input
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />

                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />

                {needsVersioning(selectedNode.type) && (
                  <>
                    <Input
                      placeholder="Version"
                      value={formData.version}
                      onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    />
                    <Input
                      type="date"
                      value={formData.versionDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, versionDate: e.target.value }))}
                    />
                  </>
                )}

                <div className="flex space-x-2">
                  <Button 
                    onClick={handleCreateChild}
                    disabled={!formData.name || (needsVersioning(selectedNode.type) && !formData.version)}
                  >
                    Create
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCreating(false);
                      setFormData({
                        name: '',
                        description: '',
                        version: '',
                        versionDate: new Date().toISOString().split('T')[0]
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {getDirectChildren().length > 0 ? (
              <div className="space-y-4 mt-3">
                {getDirectChildren().map((child: any, index: number) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-700">{child.name}</p>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {child.type}
                        </span>
                      </div>
                    </div>
                    {child.description && (
                      <p className="mt-2 text-sm text-gray-600">
                        {child.description}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-gray-700">No child nodes available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
