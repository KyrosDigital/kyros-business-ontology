import { Card } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch"
import { NodeType } from '@prisma/client';
import { Button } from './button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LegendProps {
  selectedType: NodeType | null;
  onLegendClick: (type: NodeType) => void;
  viewMode: 'graph' | 'table';
  onViewModeChange: (checked: boolean) => void;
  setIsCreateModalOpen: (open: boolean) => void;
}

type NodeTypeConfig = {
  type: NodeType;
  color: string;
  label: string;
}

// Export the color mapping
export const NODE_COLORS = {
  [NodeType.ORGANIZATION]: '#000000',
  [NodeType.DEPARTMENT]: '#ffcc00',
  [NodeType.ROLE]: '#ff6600',
  [NodeType.PROCESS]: '#0066cc',
  [NodeType.TASK]: '#cc0066',
  [NodeType.INTEGRATION]: '#9900cc',
  [NodeType.SOFTWARE_TOOL]: '#00cc99',
  [NodeType.DATA_SOURCE]: '#ff3333',
  [NodeType.ANALYTICS]: '#3333ff',
  [NodeType.AI_COMPONENT]: '#ff99cc',
} as const;

export const NODE_TYPES: NodeTypeConfig[] = [
  { type: NodeType.ORGANIZATION, color: NODE_COLORS[NodeType.ORGANIZATION], label: 'Organization' },
  { type: NodeType.DEPARTMENT, color: NODE_COLORS[NodeType.DEPARTMENT], label: 'Department' },
  { type: NodeType.ROLE, color: NODE_COLORS[NodeType.ROLE], label: 'Role' },
  { type: NodeType.PROCESS, color: NODE_COLORS[NodeType.PROCESS], label: 'Process' },
  { type: NodeType.TASK, color: NODE_COLORS[NodeType.TASK], label: 'Task' },
  { type: NodeType.INTEGRATION, color: NODE_COLORS[NodeType.INTEGRATION], label: 'Integration' },
  { type: NodeType.SOFTWARE_TOOL, color: NODE_COLORS[NodeType.SOFTWARE_TOOL], label: 'Software Tool' },
  { type: NodeType.DATA_SOURCE, color: NODE_COLORS[NodeType.DATA_SOURCE], label: 'Data Source' },
  { type: NodeType.ANALYTICS, color: NODE_COLORS[NodeType.ANALYTICS], label: 'Analytics' },
  { type: NodeType.AI_COMPONENT, color: NODE_COLORS[NodeType.AI_COMPONENT], label: 'AI Component' },
];

export function Legend({ 
  selectedType, 
  onLegendClick,
  viewMode,
  onViewModeChange,
  setIsCreateModalOpen
}: LegendProps) {
  const router = useRouter();

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-4">
      <Button
        variant="outline"
        className="w-full bg-background/80 backdrop-blur-sm"
        onClick={() => router.push('/')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Ontology List
      </Button>

      <Card className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border">
        <div className="space-y-2">
          {NODE_TYPES.map(({ type, color, label }) => (
            <div
              key={type}
              className={`flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer transition-colors duration-200 ${
                selectedType === type ? 'bg-gray-200 ring-2 ring-gray-400' : ''
              }`}
              onClick={() => onLegendClick(type)}
            >
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm">{label}</span>
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
    </div>
  );
}
