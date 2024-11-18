'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from "lucide-react";
import { initializeGraph } from '@/lib/graphInitializer';
import { useGraph } from '@/contexts/GraphContext';

export function Graph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphInitializedRef = useRef(false);
  
  const {
    ontologyData,
    isDataReady,
    currentLayout,
    selectedType,
    handleDownloadOntology,
    handleClosePanel,
    setSelectedNodeId,
    setSelectedNode,
    setIsPanelOpen,
    setSelectedRelationship,
    handleCreateRelationship,
  } = useGraph();

  // Initialize graph only once when data is ready
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (
      !graphInitializedRef.current &&
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
            setSelectedRelationship,
            currentLayout,
            handleCreateRelationship
          );
          graphInitializedRef.current = true;
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
  }, [ontologyData, isDataReady]); // Only depend on data readiness

  // Handle layout changes separately
  useEffect(() => {
    if (graphInitializedRef.current && containerRef.current?.__cy) {
      const cy = containerRef.current.__cy;
      cy.layout(currentLayout).run();
    }
  }, [currentLayout]);

  // Handle legend selection highlighting
  useEffect(() => {
    if (graphInitializedRef.current && containerRef.current?.__cy) {
      const cy = containerRef.current.__cy;
      
      // Reset styles
      cy.elements().removeClass('highlighted faded');
      
      if (selectedType) {
        // Find nodes of selected type
        const matchingNodes = cy.nodes(`[type = "${selectedType}"]`);
        
        // Fade all elements first
        cy.elements().addClass('faded');
        
        // Remove faded class from matching nodes only
        matchingNodes.removeClass('faded');
      }
    }
  }, [selectedType]);

  // Update graph data without reinitializing
  useEffect(() => {
    if (graphInitializedRef.current && containerRef.current?.__cy && ontologyData) {
      const cy = containerRef.current.__cy;
      
      // Update nodes and edges without reinitializing the entire graph
      const existingNodes = new Set(cy.nodes().map(node => node.id()));
      const existingEdges = new Set(cy.edges().map(edge => edge.id()));

      // Add new nodes
      ontologyData.nodes.forEach(node => {
        if (!existingNodes.has(node.id)) {
          cy.add({
            group: 'nodes',
            data: {
              id: node.id,
              type: node.type,
              name: node.name,
            }
          });
        }
      });

      // Add new edges
      ontologyData.relationships.forEach(rel => {
        if (!existingEdges.has(rel.id)) {
          cy.add({
            group: 'edges',
            data: {
              id: rel.id,
              source: rel.fromNodeId,
              target: rel.toNodeId,
              relationType: rel.relationType
            }
          });
        }
      });

      // Remove deleted nodes/edges
      cy.nodes().forEach(node => {
        if (!ontologyData.nodes.some(n => n.id === node.id())) {
          node.remove();
        }
      });

      cy.edges().forEach(edge => {
        if (!ontologyData.relationships.some(r => r.id === edge.id())) {
          edge.remove();
        }
      });

      // Run layout only if there were changes
      cy.layout(currentLayout).run();
    }
  }, [ontologyData, currentLayout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current?.__cy) {
        containerRef.current.__cy.destroy();
        graphInitializedRef.current = false;
      }
    };
  }, []);

  return (
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
  );
}
