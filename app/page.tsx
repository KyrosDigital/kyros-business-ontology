'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { Legend } from '@/components/ui/legend';
import { initializeGraph } from '@/lib/graphInitializer';
import { Download } from "lucide-react";
import { AiChat } from '@/components/ui/ai-chat';
import { NodePanel } from '@/components/ui/node-panel';
import { OntologyTable } from "@/components/ui/ontology-table"
import { NodesCategoryPanel } from '@/components/ui/nodes-category-panel';
import { NodeType } from '@prisma/client';
import { LayoutSelect, LAYOUT_OPTIONS } from '@/components/ui/layout-select';

// Types
type NodeData = {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedType, setSelectedType] = useState<NodeType | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [ontologyData, setOntologyData] = useState<any>(null);
  const [isDataReady, setIsDataReady] = useState(false);
  const [currentLayout, setCurrentLayout] = useState(LAYOUT_OPTIONS.breadthfirst);

  // Fetch ontology data
  useEffect(() => {
    const fetchOntologyData = async () => {
      try {
        const response = await fetch('/api/v1/ontology');
        const data = await response.json();
        
        // Transform the data to match the expected format
        const transformedData = {
          nodes: data.map((node: any) => ({
            id: node.id,
            type: node.type,
            name: node.name,
            description: node.description,
            metadata: node.metadata,
            fromRelations: node.fromRelations,
            toRelations: node.toRelations,
            notes: node.notes
          })),
          relationships: data.flatMap((node: any) => [
            ...node.fromRelations.map((rel: any) => ({
              id: rel.id,
              source: node,
              target: rel.toNode,
              relationType: rel.relationType
            })),
            ...node.toRelations.map((rel: any) => ({
              id: rel.id,
              source: rel.fromNode,
              target: node,
              relationType: rel.relationType
            }))
          ])
        };

        setOntologyData(transformedData);
        setNodes(transformedData.nodes);
        setIsDataReady(true);
      } catch (error) {
        console.error('Error fetching ontology data:', error);
      }
    };

    fetchOntologyData();
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
            currentLayout
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

  const handleCreateNode = async (nodeData: Partial<NodeData>) => {
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
        
        // Refresh data
        const updatedData = await fetch('/api/v1/ontology').then(res => res.json());
        const transformedData = {
          nodes: updatedData.map((node: any) => ({
            id: node.id,
            type: node.type,
            name: node.name,
            description: node.description,
            metadata: node.metadata,
            fromRelations: node.fromRelations,
            toRelations: node.toRelations,
            notes: node.notes
          })),
          relationships: updatedData.flatMap((node: any) => [
            ...node.fromRelations.map((rel: any) => ({
              id: rel.id,
              source: node,
              target: rel.toNode,
              relationType: rel.relationType
            })),
            ...node.toRelations.map((rel: any) => ({
              id: rel.id,
              source: rel.fromNode,
              target: node,
              relationType: rel.relationType
            }))
          ])
        };
        setOntologyData(transformedData);
        setNodes(transformedData.nodes);
      }
    } catch (error) {
      console.error('Error creating node:', error);
    }
  };

  const handleUpdateNode = async (nodeId: string, nodeData: Partial<NodeData>) => {
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
      setNodes(updatedData);
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      const response = await fetch(`/api/v1/ontology/nodes/${nodeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete node');
      
      // Refresh data
      const updatedData = await fetch('/api/v1/ontology').then(res => res.json());
      setOntologyData(updatedData);
      setNodes(updatedData);
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
      setNodes(updatedData.nodes);
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
          <OntologyTable data={ontologyData} />
        </div>
      )}

      <NodesCategoryPanel 
        isPanelOpen={isPanelOpen && !selectedNode}
        selectedNode={selectedNode}
        selectedType={selectedType}
        nodes={nodes}
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
      />

      <AiChat ontologyData={ontologyData} />
    </div>
  );
}