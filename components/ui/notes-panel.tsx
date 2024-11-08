import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from "lucide-react";
import { Note } from '@/types/graph';

interface NotesPanelProps {
  isPanelOpen: boolean;
  selectedNode: any;
  onClose: () => void;
}

export function NotesPanel({ isPanelOpen, selectedNode, onClose }: NotesPanelProps) {
  return (
    <div
      className={`fixed top-0 right-0 w-96 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        isPanelOpen ? 'translate-x-0' : 'translate-x-full'
      } z-20 overflow-y-auto`}
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">
            {selectedNode?.id || 'Node Details'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
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
        </div>
      </div>
    </div>
  );
}
