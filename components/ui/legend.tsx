import { Card } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch"
import { Button } from './button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LAYOUT_OPTIONS } from './layout-select'
import { useCustomNodeTypes } from '@/contexts/CustomNodeTypeContext';

interface LegendProps {
  selectedType: string | null;
  onLegendClick: (typeId: string) => void;
  viewMode: 'graph' | 'table';
  onViewModeChange: (checked: boolean) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  onOpenChat: () => void;
  onLayoutChange: (layoutConfig: Record<string, unknown>) => void;
}

export function Legend({ 
  selectedType, 
  onLegendClick,
  viewMode,
  onViewModeChange,
  setIsCreateModalOpen,
  onOpenChat,
  onLayoutChange
}: LegendProps) {
  const router = useRouter();
  const { nodeTypes, isLoading } = useCustomNodeTypes();

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-4">
      <Button
        variant="outline"
        className="w-full bg-background/80 backdrop-blur-sm"
        onClick={() => router.push('/dashboard')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Ontology List
      </Button>

      <Card className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border">
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading node types...</div>
          ) : nodeTypes.map((nodeType) => (
            <div
              key={nodeType.id}
              className={`flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer transition-colors duration-200 ${
                selectedType === nodeType.id ? 'bg-gray-200 ring-2 ring-gray-400' : ''
              }`}
              onClick={() => onLegendClick(nodeType.id)}
            >
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: nodeType.hexColor }}
              />
              <span className="text-sm">{nodeType.name}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-background/80 backdrop-blur-sm p-4 rounded-lg border flex items-center gap-2">
        <span className="text-sm font-medium">Graph</span>
        <Switch
          checked={viewMode === 'table'}
          onCheckedChange={onViewModeChange}
        />
        <span className="text-sm font-medium">Table</span>
      </div>

      <Button
        className="w-full bg-green-500 hover:bg-green-600 text-white"
        onClick={() => setIsCreateModalOpen(true)}
      >
        New Node
      </Button>

      <Button
        variant="outline"
        className="w-full bg-background/80 backdrop-blur-sm"
        onClick={onOpenChat}
      >
        Open Chat
      </Button>

      {viewMode === 'graph' && (
        <Select
          onValueChange={(value) => onLayoutChange(LAYOUT_OPTIONS[value as keyof typeof LAYOUT_OPTIONS])}
          defaultValue="breadthfirst"
        >
          <SelectTrigger className="w-full bg-background/80 backdrop-blur-sm">
            <SelectValue placeholder="Select layout" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="breadthfirst">Hierarchical</SelectItem>
            <SelectItem value="cose">Force-Directed</SelectItem>
            <SelectItem value="klay">KLay</SelectItem>
            <SelectItem value="dagre">Dagre</SelectItem>
            <SelectItem value="circle">Circular</SelectItem>
            <SelectItem value="concentric">Concentric</SelectItem>
            <SelectItem value="grid">Grid</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
