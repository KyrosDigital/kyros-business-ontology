import { Button } from "./button";
import { NodeData } from "@/types/graph";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./alert-dialog";

interface RelationshipPanelProps {
  isPanelOpen: boolean;
  sourceNode: NodeData | null;
  targetNode: NodeData | null;
  relationType: string;
  onClose: () => void;
  onUpdateRelationType: (newType: string) => Promise<void>;
  onDeleteRelationship: () => Promise<void>;
}

export function RelationshipPanel({
  isPanelOpen,
  sourceNode,
  targetNode,
  relationType,
  onClose,
  onUpdateRelationType,
  onDeleteRelationship
}: RelationshipPanelProps) {
  const [editedType, setEditedType] = useState(relationType);

  // Update local state when relationType prop changes
  useEffect(() => {
    setEditedType(relationType);
  }, [relationType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editedType.trim() && editedType !== relationType) {
      await onUpdateRelationType(editedType.trim());
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 w-96 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        isPanelOpen && sourceNode && targetNode ? 'translate-x-0' : 'translate-x-full'
      } z-20 overflow-y-auto`}
    >
      {sourceNode && targetNode && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Relationship Details</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Source Node</h3>
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium">{sourceNode.name}</p>
                <p className="text-sm text-gray-600">{sourceNode.type}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Relationship Type</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editedType}
                    onChange={(e) => setEditedType(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Uses, manages, completes, etc."
                  />
                  <Button 
                    type="submit"
                    disabled={!editedType.trim() || editedType === relationType}
                  >
                    Update
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Use a verb to describe how nodes relate <br/> (e.g., manages, uses, depends on, reports to)
                </p>
              </div>
            </form>

            <div>
              <h3 className="font-medium mb-2">Target Node</h3>
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium">{targetNode.name}</p>
                <p className="text-sm text-gray-600">{targetNode.type}</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Delete Relationship
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Relationship</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this relationship? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await onDeleteRelationship();
                      onClose();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
} 