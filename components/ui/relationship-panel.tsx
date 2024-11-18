import { Button } from "./button";
import { NodeData } from "@/types/graph";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface RelationshipPanelProps {
  isPanelOpen: boolean;
  sourceNode: NodeData | null;
  targetNode: NodeData | null;
  relationType: string;
  onClose: () => void;
  onUpdateRelationType: (newType: string) => Promise<void>;
}

export function RelationshipPanel({
  isPanelOpen,
  sourceNode,
  targetNode,
  relationType,
  onClose,
  onUpdateRelationType
}: RelationshipPanelProps) {
  const [editedType, setEditedType] = useState(relationType);

  // Update local state when relationType prop changes
  useEffect(() => {
    setEditedType(relationType);
  }, [relationType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editedType.trim() && editedType !== relationType) {
      await onUpdateRelationType(editedType.trim().toUpperCase());
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
                    placeholder="Enter relationship type..."
                  />
                  <Button 
                    type="submit"
                    disabled={!editedType.trim() || editedType === relationType}
                  >
                    Update
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Common types: PARENT_CHILD, RELATED, DEPENDS_ON, USES
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
        </div>
      )}
    </div>
  );
} 