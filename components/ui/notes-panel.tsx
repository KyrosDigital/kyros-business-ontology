import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from "lucide-react";
import { Note } from '@/types/graph';
import * as d3 from 'd3';

interface NotesPanelProps {
  isPanelOpen: boolean;
  selectedNode: any;
  onClose: () => void;
}

export function NotesPanel({ isPanelOpen, selectedNode, onClose }: NotesPanelProps) {
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
            <h3 className="text-sm font-medium text-gray-500">Child Nodes</h3>
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
