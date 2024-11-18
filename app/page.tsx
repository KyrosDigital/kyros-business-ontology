'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Legend } from '@/components/ui/legend';
import { initializeGraph } from '@/lib/graphInitializer';
import { Download } from "lucide-react";
import { AiChat } from '@/components/ui/ai-chat';
import { NodePanel } from '@/components/ui/node-panel';
import { OntologyTable } from "@/components/ui/ontology-table"
import { NodesCategoryPanel } from '@/components/ui/nodes-category-panel';
import { NodeData, OntologyData, NodeType } from '@/types/graph';
import { LayoutSelect, LAYOUT_OPTIONS } from '@/components/ui/layout-select';
import type { LayoutOptions as LayoutConfig } from 'cytoscape';
import { RelationshipPanel } from '@/components/ui/relationship-panel';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedType, setSelectedType] = useState<NodeType | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [ontologyData, setOntologyData] = useState<OntologyData | null>(null);
  const [isDataReady, setIsDataReady] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<LayoutConfig>(LAYOUT_OPTIONS.breadthfirst);
  const [selectedRelationship, setSelectedRelationship] = useState<{
    sourceNode: NodeData | null;
    targetNode: NodeData | null;
    relationType: string;
  } | null>(null);

  const getOntologyData = async () => {
    const response = await fetch(`/api/v1/ontology/graph?t=${Date.now()}`);
    const data = await response.json();
    return data;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getOntologyData();
        console.log('data', data);
        setOntologyData(data);
        setIsDataReady(true);
      } catch (error) {
        console.error('Error fetching ontology data:', error);
      }
    };

    loadData();
  }, []);

  // Initialize or update graph
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (
      viewMode === 'graph' && 
      containerRef.current && 
      ontologyData && 
      isDataReady && 
      ontologyData.nodes.length > 0
    ) {
      // Add a small delay to ensure the container is properly mounted
      const timer = setTimeout(() => {
        try {
          // NOTE: window.innerWidth and window.innerHeight are required parameters
          // for proper Cytoscape initialization. Do not remove them even though
          // the container is responsively sized with CSS. Removing these will
          // cause the graph to be invisible or fail to render properly.
          cleanup = initializeGraph(
            containerRef.current!,
            window.innerWidth,
            window.innerHeight,
            ontologyData,
            handleClosePanel,
            setSelectedNodeId,
            setSelectedNode,
            setIsPanelOpen,
            setSelectedRelationship,
            currentLayout,
            handleCreateRelationship
          );
        } catch (error) {
          console.error('Error initializing graph:', error);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (cleanup) cleanup();
      };
    }

    return cleanup;
  }, [viewMode, ontologyData, isDataReady, currentLayout]);

  const handleLegendClick = (type: NodeType) => {
    setSelectedType(type);
    setIsPanelOpen(true);
    setSelectedNode(null);
    
    // Get Cytoscape instance from the container
    const cy = containerRef.current?.__cy;
    if (!cy) return;
    
    // Update visibility using Cytoscape classes
    cy.elements().removeClass('highlighted faded');
    cy.nodes().forEach(node => {
      if (node.data('type') === type) {
        node.addClass('highlighted');
        node.neighborhood().addClass('highlighted');
      } else {
        node.addClass('faded');
      }
    });
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedNodeId(null);
    setSelectedRelationship(null);
    
    // Get Cytoscape instance and reset styles
    const container = containerRef.current;
    if (container) {
      const cy = container.__cy;
      if (cy) {
        cy.elements().removeClass('highlighted faded selected');
      }
      // Unlock nodes when panel closes
      if (container.unlockNodes) {
        container.unlockNodes();
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const cy = containerRef.current?.__cy;
      if (cy) {
        cy.elements().removeClass('highlighted faded selected');
      }
    };
  }, []);

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
      
      // Get the newly created node from the response
      const newNode = await response.json();
      
      // Update the state directly with the new node instead of fetching all data again
      if (ontologyData) {
        setOntologyData(prevData => {
          if (!prevData) return prevData;
          
          // Get the relationship from the newNode's toRelations
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

      // Refresh the selected node to show updated relationships
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
      
      // Refresh data
      const updatedData = await fetch('/api/v1/ontology').then(res => res.json());
      setOntologyData(updatedData);
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
      
      // Fetch fresh graph data after deletion
      const updatedData = await fetch('/api/v1/ontology/graph').then(res => res.json());
      setOntologyData(updatedData);
      
      // Don't call handleClosePanel here - let the NodePanel handle it
    } catch (error) {
      console.error('Error deleting node:', error);
      throw error; // Re-throw to let NodePanel handle the error
    }
  };

  const handleCreateRelationship = async (sourceId: string, targetId: string, relationType: string) => {
    try {
      // Verify these nodes exist in our current data
      if (!ontologyData) {
        throw new Error('No ontology data available');
      }

      const sourceNode = ontologyData.nodes.find(n => n.id === sourceId);
      const targetNode = ontologyData.nodes.find(n => n.id === targetId);

      if (!sourceNode || !targetNode) {
        throw new Error(`Invalid node IDs: source=${sourceId}, target=${targetId}`);
      }

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

      // await refreshGraph();
    } catch (error) {
      console.error('Error creating relationship:', error);
      throw error;
    }
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

  /**
   * Fetches updated data for a specific node from the API and updates the local state
   * @param nodeId - The unique identifier of the node to refresh
   * @returns Promise<void>
   * 
   * This function is used to:
   * 1. Get fresh node data after operations like adding notes or updating node details
   * 2. Update the selectedNode state with the latest data from the backend
   * 
   * The function makes a GET request to /api/v1/ontology/{nodeId} and updates
   * the selectedNode state with the response data. If the request fails,
   * the error is logged to the console.
   */
  const refreshNode = async (nodeId: string) => {
    try {
      const response = await fetch(`/api/v1/ontology/${nodeId}`);
      if (!response.ok) throw new Error('Failed to fetch node');
      const updatedNode = await response.json();
      setSelectedNode(updatedNode); // Update your state with the fresh node data
    } catch (error) {
      console.error('Error refreshing node:', error);
    }
  };

  const handleNodeUpdate = (nodeId: string, updatedNode: Partial<NodeData>) => {
    // Update the nodes array
    if (ontologyData) {
      setOntologyData(prevData => ({
        ...prevData!,
        nodes: prevData!.nodes.map(node =>
          node.id === nodeId ? { ...node, ...updatedNode } : node
        )
      }));
    }

    // Update the selected node
    setSelectedNode(prevNode => 
      prevNode?.id === nodeId ? { ...prevNode, ...updatedNode } : prevNode
    );
  };

  const refreshGraph = async () => {
    try {
      const response = await fetch(`/api/v1/ontology/graph?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch graph data');
      }
      const data = await response.json();
      setOntologyData(data);
    } catch (error) {
      console.error('Error refreshing graph:', error);
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
      
      // Update local state
      setSelectedRelationship(prev => prev ? {
        ...prev,
        relationType: newType
      } : null);

      // Refresh the graph data
      await refreshGraph();
    } catch (error) {
      console.error('Error updating relationship:', error);
    }
  };

  const handleDeleteRelationship = async () => {
    if (selectedRelationship?.sourceNode && selectedRelationship?.targetNode) {
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

        // Refresh your graph data here
        await refreshGraph();
        
        // Close the panel
        setSelectedRelationship(null);
      } catch (error) {
        console.error('Error deleting relationship:', error);
        // Handle error (show toast notification, etc.)
      }
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Legend 
        selectedType={selectedType} 
        onLegendClick={handleLegendClick}
        viewMode={viewMode}
        onViewModeChange={(checked) => setViewMode(checked ? 'table' : 'graph')}
      />

      {viewMode === 'graph' && (
        <LayoutSelect onLayoutChange={setCurrentLayout} />
      )}

      {viewMode === 'graph' ? (
        <>
          <div className="absolute bottom-4 left-4 z-10">
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8"
                id="zoom-in"
              >
                +
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8"
                id="zoom-out"
              >
                -
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8"
                onClick={handleDownloadOntology}
                title="Download Ontology Data"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={containerRef}
            className="w-full h-full"
            style={{ 
              visibility: isDataReady ? 'visible' : 'hidden',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          />
          
          {!isDataReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-lg">Loading graph...</div>
            </div>
          )}
        </>
      ) : (
        <div className="p-4 mt-16 ml-72 h-[calc(100vh-5rem)] w-[calc(100vw-20rem)]">
          {ontologyData && <OntologyTable data={ontologyData} />}
        </div>
      )}

      <NodesCategoryPanel 
        isPanelOpen={isPanelOpen && !selectedNode}
        selectedNode={selectedNode}
        selectedType={selectedType}
        nodes={ontologyData?.nodes ?? []}
        onClose={handleClosePanel}
        onUpdateNode={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
        onCreateRelationship={handleCreateRelationship}
      />

      <NodePanel 
        isPanelOpen={isPanelOpen && !!selectedNode}
        selectedNode={selectedNode}
        onClose={handleClosePanel}
        onCreateNode={handleCreateNode}
        refreshNode={refreshNode}
        onNodeUpdate={handleNodeUpdate}
        onDeleteNode={handleDeleteNode}
        refreshGraph={refreshGraph}
      />

      <RelationshipPanel 
        isPanelOpen={!!selectedRelationship}
        sourceNode={selectedRelationship?.sourceNode ?? null}
        targetNode={selectedRelationship?.targetNode ?? null}
        relationType={selectedRelationship?.relationType ?? ''}
        onClose={() => setSelectedRelationship(null)}
        onUpdateRelationType={handleUpdateRelationType}
        onDeleteRelationship={handleDeleteRelationship}
      />

      <AiChat ontologyData={ontologyData as OntologyData} />
    </div>
  );
}