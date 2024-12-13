import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NodeData, OntologyData } from '@/types/graph';
import { useGraph } from '@/contexts/GraphContext';
import { useCustomNodeTypes } from '@/contexts/CustomNodeTypeContext';
import { Node } from "@prisma/client";

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
  const { nodeTypes } = useCustomNodeTypes();

  // Helper function to get node type details
  const getNodeType = (typeId: string) => {
    return nodeTypes.find(nt => nt.id === typeId);
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

  const handleRowClick = (node: Node) => {
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
            {data.nodes.map((node) => {
              const nodeType = getNodeType(node.typeId);
              return (
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
                          backgroundColor: nodeType?.hexColor || '#cccccc',
                        }}
                      />
                      <span>{nodeType?.name || 'Unknown Type'}</span>
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
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
