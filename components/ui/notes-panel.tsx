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

          {selectedNode?.children && selectedNode.children.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Child Nodes</h3>
              <div className="space-y-4">
                {selectedNode.children.map((child: any, index: number) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-700">{child.name || child.id}</p>
                        {child.type && (
                          <span className="text-xs text-gray-500">
                            {child.type}
                          </span>
                        )}
                      </div>
                    </div>
                    {child.description && (
                      <p className="mt-2 text-sm text-gray-600">
                        {child.description}
                      </p>
                    )}
                    {child.version && (
                      <div className="mt-2 text-xs text-gray-500">
                        Version: {child.version}
                        {child.versionDate && 
                          ` (${new Date(child.versionDate).toLocaleDateString()})`
                        }
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Child Nodes</h3>
              <p className="mt-1 text-gray-700">No child nodes available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
