import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NODE_COLORS, NODE_TYPES } from '@/components/ui/legend';
import { NodeData, OntologyData } from '@/types/graph';
import { useGraph } from '@/contexts/GraphContext';

interface OntologyTableProps {
  data: OntologyData;
}

export function OntologyTable({ data }: OntologyTableProps) {
  const { 
    setSelectedNode, 
    setSelectedNodeId,
    setIsPanelOpen,
    selectedNodeId
  } = useGraph();

  // Helper function to get the label for a node type
  const getNodeTypeLabel = (type: string): string => {
    const nodeType = NODE_TYPES.find(nt => nt.type === type);
    return nodeType?.label || type;
  };

  // Helper function to format relationships
  const formatRelationships = (node: NodeData): string => {
    const relationships: string[] = [];
    
    // Add outgoing relationships
    if (node.fromRelations) {
      node.fromRelations.forEach(rel => {
        relationships.push(`→ ${rel.toNode.name} (${rel.relationType})`);
      });
    }
    
    // Add incoming relationships
    if (node.toRelations) {
      node.toRelations.forEach(rel => {
        relationships.push(`← ${rel.fromNode.name} (${rel.relationType})`);
      });
    }
    
    return relationships.join('\n');
  };

  const handleRowClick = (node: NodeData) => {
    setSelectedNode(node);
    setSelectedNodeId(node.id);
    setIsPanelOpen(true);
  };

  return (
    <div className="rounded-md border w-full">
      <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-1/5">Name</TableHead>
              <TableHead className="w-1/6">Type</TableHead>
              <TableHead className="w-1/4">Description</TableHead>
              <TableHead className="w-2/5">Relationships</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.nodes.map((node) => (
              <TableRow 
                key={node.id}
                className={`
                  cursor-pointer 
                  transition-colors
                  ${selectedNodeId === node.id 
                    ? 'bg-gray-200 hover:bg-gray-300' 
                    : 'hover:bg-gray-100'
                  }
                `}
                onClick={() => handleRowClick(node)}
              >
                <TableCell className="font-medium">{node.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm inline-block"
                      style={{ 
                        backgroundColor: NODE_COLORS[node.type] || '#cccccc',
                      }}
                    />
                    <span>{getNodeTypeLabel(node.type)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {node.description || '-'}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="whitespace-pre-line">
                    {formatRelationships(node) || '-'}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
