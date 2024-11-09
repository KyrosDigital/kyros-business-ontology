import { Card } from '@/components/ui/card';
import { Switch } from "@/components/ui/switch"

interface LegendProps {
  selectedType: string | null;
  onLegendClick: (type: string) => void;
  viewMode: 'graph' | 'table';
  onViewModeChange: (checked: boolean) => void;
}

export function Legend({ 
  selectedType, 
  onLegendClick,
  viewMode,
  onViewModeChange
}: LegendProps) {
  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-4">
      <Card className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border">
        <div className="space-y-2">
          {[
            { color: '#69b3a2', label: 'Organization' },
            { color: '#ffcc00', label: 'Department' },
            { color: '#ff6600', label: 'Role' },
            { color: '#0066cc', label: 'Process' },
            { color: '#cc0066', label: 'Task' },
            { color: '#9900cc', label: 'Integration' },
            { color: '#00cc99', label: 'DataSource' },
            { color: '#ff3333', label: 'AIComponent' },
            { color: '#3333ff', label: 'Analytics' },
            { color: '#ff99cc', label: 'SoftwareTool' },
          ].map(({ color, label }) => (
            <div
              key={label}
              className={`flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer transition-colors duration-200 ${
                selectedType === label ? 'bg-gray-200 ring-2 ring-gray-400' : ''
              }`}
              onClick={() => onLegendClick(label)}
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
    </div>
  );
}
