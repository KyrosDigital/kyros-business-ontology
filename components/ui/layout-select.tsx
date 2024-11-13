import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import cytoscape from 'cytoscape';
import klay from 'cytoscape-klay';
import dagre from 'cytoscape-dagre';

// Register the extensions
cytoscape.use(klay);
cytoscape.use(dagre);

// Define available layouts and their configurations
export const LAYOUT_OPTIONS = {
  'breadthfirst': {
    name: 'breadthfirst',
    directed: true,
    padding: 50,
    spacingFactor: 1.5,
    animate: true,
    animationDuration: 500,
    fit: true,
    circle: false,
    grid: true,
    maximal: true,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true,
  },
  'cose': {
    name: 'cose',
    nodeSpacing: 250,
    idealEdgeLength: 300,
    nodeRepulsion: 15000,
    gravity: 80,
    componentSpacing: 100,
    edgeElasticity: 100,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
    randomize: false,
    padding: 80,
    animate: true,
    fit: true,
    refresh: 20,
    maxSimulationTime: 4000,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true,
  },
  'klay': {
    name: 'klay',
    nodeDimensionsIncludeLabels: true,
    fit: true,
    padding: 50,
    animate: true,
    animationDuration: 500,
    klay: {
      direction: 'DOWN',
      spacing: 100,
      nodeLayering: 'NETWORK_SIMPLEX',
      nodePlacement: 'BRANDES_KOEPF',
      edgeRouting: 'ORTHOGONAL',
      edgeSpacingFactor: 2.0,
      inLayerSpacingFactor: 2.0,
      layoutHierarchy: true,
      crossingMinimization: 'LAYER_SWEEP',
      separateConnectedComponents: true
    }
  },
  'dagre': {
    name: 'dagre',
    nodeDimensionsIncludeLabels: true,
    fit: true,
    padding: 50,
    animate: true,
    animationDuration: 500,
    rankDir: 'TB',
    ranker: 'network-simplex',
    rankSep: 100,
    nodeSep: 100,
    edgeSep: 50,
    spacingFactor: 2
  },
  'circle': {
    name: 'circle',
    padding: 50,
    animate: true,
    animationDuration: 500,
    radius: undefined,
    startAngle: 3 / 2 * Math.PI,
    sweep: undefined,
    clockwise: true,
    fit: true,
  },
  'concentric': {
    name: 'concentric',
    padding: 50,
    animate: true,
    animationDuration: 500,
    fit: true,
    minNodeSpacing: 100,
    levelWidth: () => 1,
    concentric: (node: any) => node.degree(),
  },
  'grid': {
    name: 'grid',
    padding: 50,
    animate: true,
    animationDuration: 500,
    fit: true,
    avoidOverlap: true,
    rows: undefined,
    cols: undefined,
  }
};

type LayoutSelectProps = {
  onLayoutChange: (layoutConfig: any) => void;
};

export function LayoutSelect({ onLayoutChange }: LayoutSelectProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
      <Select
        onValueChange={(value) => onLayoutChange(LAYOUT_OPTIONS[value])}
        defaultValue="breadthfirst"
      >
        <SelectTrigger className="w-[180px]">
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
    </div>
  );
}
