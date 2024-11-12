import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface OntologyTableProps {
  data: Record<string, any>
}

export function OntologyTable({ data }: OntologyTableProps) {
  // Extract all nodes from the nested JSON-LD structure
  const extractNodes = (data: any): any[] => {
    const nodes: any[] = [];
    
    // Add the root organization
    if (data['@type']) {
      nodes.push({
        '@id': data['@id'],
        '@type': data['@type'],
        name: data.name,
        ...data
      });
    }

    // Helper function to extract nodes from nested objects
    const extractNestedNodes = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      
      if (obj['@type']) {
        // Check if this node is already in the array
        const exists = nodes.some(node => 
          node['@id'] === obj['@id'] || 
          (node.name === obj.name && node['@type'] === obj['@type'])
        );
        if (!exists) {
          nodes.push(obj);
        }
      }

      // Recursively check all object properties
      Object.entries(obj).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(item => extractNestedNodes(item));
        } else if (typeof value === 'object' && value !== null) {
          extractNestedNodes(value);
        }
      });
    };

    // Extract all nodes from the data
    extractNestedNodes(data);

    // Sort nodes by type and name for better organization
    return nodes.sort((a, b) => {
      if (a['@type'] === b['@type']) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return (a['@type'] || '').localeCompare(b['@type'] || '');
    });
  };

  const nodes = extractNodes(data);

  const renderRelationships = (node: any): React.ReactNode => {
    const relationships: { [key: string]: any } = {};
    
    // Filter out the basic properties vs relationships
    Object.entries(node).forEach(([key, value]) => {
      if (!['@id', '@type', 'name', 'description', 'version', 'versionDate'].includes(key)) {
        relationships[key] = value;
      }
    });

    if (Object.keys(relationships).length === 0) {
      return <span className="text-gray-500 italic">No relationships</span>;
    }

    return (
      <div className="space-y-2">
        {Object.entries(relationships).map(([key, value]) => (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{key}:</span>
            {Array.isArray(value) ? (
              <ul className="list-disc list-inside pl-4">
                {value.map((item: any, index: number) => (
                  <li key={index} className="text-sm">
                    {typeof item === 'object' ? 
                      (item.name || item['@id'] || JSON.stringify(item)) : 
                      item
                    }
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm pl-4">
                {typeof value === 'object' ? 
                  (value.name || value['@id'] || JSON.stringify(value)) : 
                  value
                }
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-md border w-full">
      <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-1/5">Name</TableHead>
              <TableHead className="w-1/6">Type</TableHead>
              <TableHead className="w-3/5">Relationships</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nodes.map((node, index) => (
              <TableRow key={node['@id'] || index}>
                <TableCell className="whitespace-normal">{node.name || '-'}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-sm">
                    {node['@type']}
                  </span>
                </TableCell>
                <TableCell className="whitespace-normal">{renderRelationships(node)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
