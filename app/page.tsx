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

  const getOntologyData = async () => {
    const response = await fetch('/api/v1/ontology/graph');
    const data = await response.json();
    
    return {
      nodes: data.nodes.map((node: NodeData) => ({
        id: node.id,
        type: node.type,
        name: node.name
      })),
      relationships: data.relationships.map((rel: any) => ({
        id: rel.id,
        source: { id: rel.fromNodeId },
        target: { id: rel.toNodeId },
        relationType: rel.relationType
      }))
    };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getOntologyData();
        setOntologyData(data);
        setIsDataReady(true);
      } catch (error) {
        console.error('Error fetching ontology data:', error);
      }
    };

    loadData();
  }, []);

  // Add a function to fetch detailed node data when needed
  const fetchNodeDetails = async (nodeId: string) => {
    try {
      const response = await fetch(`/api/v1/ontology/${nodeId}`);
      if (!response.ok) throw new Error('Failed to fetch node details');
      const nodeData = await response.json();
      setSelectedNode(nodeData);
    } catch (error) {
      console.error('Error fetching node details:', error);
    }
  };

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
          cleanup = initializeGraph(
            containerRef.current!,
            window.innerWidth,
            window.innerHeight,
            ontologyData,
            handleClosePanel,
            setSelectedNodeId,
            setSelectedNode,
            setIsPanelOpen,
            selectedNodeId,
            currentLayout,
            fetchNodeDetails
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
    
    // Get Cytoscape instance and reset styles
    const cy = containerRef.current?.__cy;
    if (cy) {
      cy.elements().removeClass('highlighted faded selected');
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
      if (selectedNode?.id) {
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
          setOntologyData(prevData => ({
            nodes: [...prevData!.nodes, newNode],
            relationships: [
              ...prevData!.relationships,
              // Add the parent-child relationship
              {
                id: `${selectedNode.id}-${newNode.id}`,
                source: selectedNode,
                target: newNode,
                relationType: 'PARENT_CHILD'
              }
            ]
          }));
        }
      }
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

  const handleDeleteNode = async (nodeId: string) => {
    try {
      const response = await fetch(`/api/v1/ontology/${nodeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete node');
      
      // Update the state to remove the deleted node and its relationships
      setOntologyData(prev => ({
        nodes: prev!.nodes.filter(node => node.id !== nodeId),
        relationships: prev!.relationships.filter(rel => 
          rel.source.id !== nodeId && rel.target.id !== nodeId
        )
      }));
      
      // Close any open panels
      handleClosePanel();
    } catch (error) {
      console.error('Error deleting node:', error);
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
          relationType,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create relationship');
      
      // Refresh data
      const updatedData = await fetch('/api/v1/ontology').then(res => res.json());
      setOntologyData(updatedData);
    } catch (error) {
      console.error('Error creating relationship:', error);
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
      const response = await fetch('/api/v1/ontology/graph');
      if (!response.ok) {
        throw new Error('Failed to fetch graph data');
      }
      const data = await response.json();
      
      // Transform the data to match the expected format
      const transformedData: OntologyData = {
        nodes: data.nodes.map((node: any) => ({
          id: node.id,
          type: node.type,
          name: node.name
        })),
        relationships: data.relationships.map((rel: any) => ({
          id: rel.id,
          source: { id: rel.fromNodeId },
          target: { id: rel.toNodeId },
          relationType: rel.relationType
        }))
      };

      setOntologyData(transformedData);
    } catch (error) {
      console.error('Error refreshing graph:', error);
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
            style={{ visibility: isDataReady ? 'visible' : 'hidden' }}
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
        onCreateNode={handleCreateNode}
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

      <AiChat ontologyData={ontologyData as OntologyData} />
    </div>
  );
}