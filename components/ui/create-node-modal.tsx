import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { useGraph } from '@/contexts/GraphContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCustomNodeTypes } from '@/contexts/CustomNodeTypeContext';

interface CreateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateNodeModal({ isOpen, onClose }: CreateNodeModalProps) {
  const { refreshGraph, ontologyId } = useGraph();
  const { organization } = useOrganization();
  const { nodeTypes, isLoading: isLoadingNodeTypes } = useCustomNodeTypes();
  const [selectedNodeTypeName, setSelectedNodeTypeName] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeTypeName || !name || !ontologyId || !organization?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/ontology/create-node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedNodeTypeName,
          name,
          description: description || undefined,
          ontologyId,
          organizationId: organization.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create node');
      }

      await refreshGraph();
      onClose();
      // Reset form
      setSelectedNodeTypeName('');
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Error creating node:', error);
      // You might want to show an error toast here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Node</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new node in the graph.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Node Type</Label>
            <Select 
              value={selectedNodeTypeName} 
              onValueChange={setSelectedNodeTypeName}
              disabled={isLoadingNodeTypes}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingNodeTypes ? "Loading..." : "Select node type"} />
              </SelectTrigger>
              <SelectContent>
                {nodeTypes.map((nodeType) => (
                  <SelectItem 
                    key={nodeType.id} 
                    value={nodeType.name}
                    className="flex items-center gap-2"
                  >
                    <span 
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: nodeType.hexColor }}
                    />
                    {nodeType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter node name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter node description"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-green-500 hover:bg-green-600"
              disabled={isLoading || !selectedNodeTypeName || !name || !ontologyId || !organization?.id}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 