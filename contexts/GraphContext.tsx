import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import type { LayoutOptions } from 'cytoscape';
import type { NodeData, OntologyData, NodeType } from '@/types/graph';
import { LAYOUT_OPTIONS } from '@/components/ui/layout-select';

interface GraphContextType {
  // Graph Data
  ontologyData: OntologyData | null;
  isDataReady: boolean;
  selectedNode: NodeData | null;
  selectedType: NodeType | null;
  selectedNodeId: string | null;
  selectedRelationship: {
    sourceNode: NodeData | null;
    targetNode: NodeData | null;
    relationType: string;
  } | null;
  currentLayout: LayoutOptions;
  viewMode: 'graph' | 'table';
  isPanelOpen: boolean;

  // Graph Actions
  setSelectedNode: (node: NodeData | null) => void;
  setSelectedType: (type: NodeType | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedRelationship: (rel: {
    sourceNode: NodeData | null;
    targetNode: NodeData | null;
    relationType: string;
  } | null) => void;
  setCurrentLayout: (layout: LayoutOptions) => void;
  setViewMode: (mode: 'graph' | 'table') => void;
  setIsPanelOpen: (isOpen: boolean) => void;
  setOntologyData: (data: OntologyData | null) => void;
  setIsDataReady: (isReady: boolean) => void;

  // Graph Operations
  handleCreateNode: (nodeData: Partial<Omit<NodeData, 'id'>>) => Promise<void>;
  handleUpdateNode: (nodeId: string, nodeData: Partial<Omit<NodeData, 'id'>>) => Promise<void>;
  handleDeleteNode: (nodeId: string, strategy?: 'orphan' | 'cascade' | 'reconnect') => Promise<void>;
  handleCreateRelationship: (sourceId: string, targetId: string, relationType: string) => Promise<void>;
  handleUpdateRelationType: (newType: string) => Promise<void>;
  handleDeleteRelationship: () => Promise<void>;
  refreshNode: (nodeId: string) => Promise<void>;
  refreshGraph: () => Promise<void>;
  handleClosePanel: () => void;
  handleLegendClick: (type: NodeType) => void;
  handleDownloadOntology: () => void;
  loadOntologyData: () => Promise<void>;
}

// Create the context with a default undefined value
export const GraphContext = createContext<GraphContextType | undefined>(undefined);

interface GraphProviderProps {
  children: ReactNode;
}

export function GraphProvider({ children }: GraphProviderProps) {
  // Graph Data State
  const [ontologyData, setOntologyData] = useState<OntologyData | null>(null);
  const [isDataReady, setIsDataReady] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [selectedType, setSelectedType] = useState<NodeType | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<{
    sourceNode: NodeData | null;
    targetNode: NodeData | null;
    relationType: string;
  } | null>(null);
  const [currentLayout, setCurrentLayout] = useState<LayoutOptions>(LAYOUT_OPTIONS.breadthfirst);
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Graph Operations
  const handleCreateNode = async (nodeData: Partial<Omit<NodeData, 'id'>>) => {
    try {
      if (!selectedNode?.id) return;

      const response = await fetch('/api/v1/ontology/create-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: selectedNode.id,
          nodeData: nodeData,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create node');
      
      const newNode = await response.json();
      
      if (ontologyData) {
        setOntologyData(prevData => {
          if (!prevData) return prevData;
          
          const relationship = newNode.toRelations?.[0];
          if (!relationship) {
            console.error('No relationship found in new node data');
            return prevData;
          }

          return {
            nodes: [...prevData.nodes, newNode],
            relationships: [
              ...prevData.relationships,
              {
                id: `${selectedNode.id}-${newNode.id}`,
                fromNodeId: selectedNode.id,
                toNodeId: newNode.id,
                relationType: relationship.relationType,
                fromNode: selectedNode,
                toNode: newNode
              }
            ]
          };
        });
      }

      await refreshNode(selectedNode.id);
    } catch (error) {
      console.error('Error creating node:', error);
    }
  };

  const handleUpdateNode = async (nodeId: string, nodeData: Partial<Omit<NodeData, 'id'>>) => {
    try {
      const response = await fetch(`/api/v1/ontology/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nodeData),
      });
      
      if (!response.ok) throw new Error('Failed to update node');
      
      await refreshGraph();
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  const handleDeleteNode = async (nodeId: string, strategy: 'orphan' | 'cascade' | 'reconnect' = 'orphan') => {
    try {
      const response = await fetch(`/api/v1/ontology/${nodeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ strategy })
      });
      
      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete node');
      }
      
      await refreshGraph();
    } catch (error) {
      console.error('Error deleting node:', error);
      throw error;
    }
  };

  const handleCreateRelationship = async (sourceId: string, targetId: string, relationType: string) => {
    try {
      const response = await fetch('/api/v1/ontology/connect-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromNodeId: sourceId,
          toNodeId: targetId,
          relationType
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create relationship');
      }

      await refreshGraph();
    } catch (error) {
      console.error('Error creating relationship:', error);
      throw error;
    }
  };

  const handleUpdateRelationType = async (newType: string) => {
    if (!selectedRelationship) return;
    
    try {
      const response = await fetch('/api/v1/ontology/update-relationship', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: selectedRelationship.sourceNode?.id,
          targetId: selectedRelationship.targetNode?.id,
          newType
        }),
      });

      if (!response.ok) throw new Error('Failed to update relationship');
      
      setSelectedRelationship(prev => prev ? {
        ...prev,
        relationType: newType
      } : null);

      await refreshGraph();
    } catch (error) {
      console.error('Error updating relationship:', error);
    }
  };

  const handleDeleteRelationship = async () => {
    if (!selectedRelationship?.sourceNode || !selectedRelationship?.targetNode) return;
    
    try {
      const response = await fetch('/api/v1/ontology/delete-relationship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId: selectedRelationship.sourceNode.id,
          targetId: selectedRelationship.targetNode.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete relationship');
      }

      await refreshGraph();
      setSelectedRelationship(null);
    } catch (error) {
      console.error('Error deleting relationship:', error);
    }
  };

  const refreshNode = async (nodeId: string) => {
    try {
      const response = await fetch(`/api/v1/ontology/${nodeId}`);
      if (!response.ok) throw new Error('Failed to fetch node');
      const updatedNode = await response.json();
      setSelectedNode(updatedNode);
    } catch (error) {
      console.error('Error refreshing node:', error);
    }
  };

  const refreshGraph = async () => {
    try {
      const response = await fetch(`/api/v1/ontology/graph?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch graph data');
      const data = await response.json();
      setOntologyData(data);
    } catch (error) {
      console.error('Error refreshing graph:', error);
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedNodeId(null);
    setSelectedRelationship(null);
  };

  const handleLegendClick = (type: NodeType) => {
    setSelectedType(type);
    setIsPanelOpen(true);
    setSelectedNode(null);
  };

  const handleDownloadOntology = () => {
    const blob = new Blob([JSON.stringify(ontologyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ontology-data.json';
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadOntologyData = async () => {
    try {
      const response = await fetch(`/api/v1/ontology/graph?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch ontology data');
      const data = await response.json();
      console.log('data', data);
      setOntologyData(data);
      setIsDataReady(true);
    } catch (error) {
      console.error('Error fetching ontology data:', error);
      setIsDataReady(false);
    }
  };

  useEffect(() => {
    loadOntologyData();
  }, []);

  const value = {
    // Graph Data
    ontologyData,
    isDataReady,
    selectedNode,
    selectedType,
    selectedNodeId,
    selectedRelationship,
    currentLayout,
    viewMode,
    isPanelOpen,

    // Graph Actions
    setSelectedNode,
    setSelectedType,
    setSelectedNodeId,
    setSelectedRelationship,
    setCurrentLayout,
    setViewMode,
    setIsPanelOpen,
    setOntologyData,
    setIsDataReady,

    // Graph Operations
    handleCreateNode,
    handleUpdateNode,
    handleDeleteNode,
    handleCreateRelationship,
    handleUpdateRelationType,
    handleDeleteRelationship,
    refreshNode,
    refreshGraph,
    handleClosePanel,
    handleLegendClick,
    handleDownloadOntology,
    loadOntologyData,
  };

  return (
    <GraphContext.Provider value={value}>
      {children}
    </GraphContext.Provider>
  );
}

// Custom hook for using the graph context
export function useGraph() {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
}
