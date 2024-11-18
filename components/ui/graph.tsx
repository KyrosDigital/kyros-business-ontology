'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from "lucide-react";
import { initializeGraph } from '@/lib/graphInitializer';
import { useGraph } from '@/contexts/GraphContext';
import type { Core } from 'cytoscape';

export function Graph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphInitializedRef = useRef(false);
  const cyRef = useRef<Core | null>(null);
  
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
      console.log('Initializing graph...');
      
      cleanup = initializeGraph(
        containerRef.current,
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
      cyRef.current = containerRef.current.__cy || null;
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isDataReady]); // Only depend on isDataReady

  // Separate effect for handling data updates
  useEffect(() => {
    if (!ontologyData || !isDataReady || !graphInitializedRef.current || !cyRef.current) {
      return;
    }

    const cy = cyRef.current;
    console.log('Updating graph data...');
    
    // Store current viewport state
    const zoom = cy.zoom();
    const pan = cy.pan();
    
    // Batch all updates
    cy.batch(() => {
      // Update nodes
      ontologyData.nodes.forEach(node => {
        const existingNode = cy.getElementById(node.id);
        if (existingNode.length === 0) {
          cy.add({
            group: 'nodes',
            data: {
              id: node.id,
              type: node.type,
              name: node.name,
            },
            position: existingNode.position() || undefined
          });
        } else {
          existingNode.data(node);
        }
      });

      // Update edges
      ontologyData.relationships.forEach(rel => {
        const existingEdge = cy.getElementById(rel.id);
        if (existingEdge.length === 0) {
          cy.add({
            group: 'edges',
            data: {
              id: rel.id,
              source: rel.fromNodeId,
              target: rel.toNodeId,
              relationType: rel.relationType
            }
          });
        } else {
          existingEdge.data({
            source: rel.fromNodeId,
            target: rel.toNodeId,
            relationType: rel.relationType
          });
        }
      });

      // Remove deleted elements
      cy.elements().forEach(ele => {
        const elementId = ele.id();
        if (ele.isNode() && !ontologyData.nodes.some(n => n.id === elementId)) {
          ele.remove();
        } else if (ele.isEdge() && !ontologyData.relationships.some(r => r.id === elementId)) {
          ele.remove();
        }
      });
    });

    // Only run layout if elements changed
    const elementsChanged = cy.elements().length !== ontologyData.nodes.length + ontologyData.relationships.length;
    
    if (elementsChanged) {
      cy.layout({
        ...currentLayout,
        animate: false,
        fit: false
      }).run();
    }

    // Restore viewport state
    cy.viewport({
      zoom: zoom,
      pan: pan
    });
  }, [ontologyData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cyRef.current) {
        console.log('Cleaning up graph...');
        cyRef.current.destroy();
        cyRef.current = null;
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
          visibility: isDataReady && graphInitializedRef.current ? 'visible' : 'hidden',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />
      
      {(!isDataReady || !graphInitializedRef.current) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-lg">Loading graph...</div>
        </div>
      )}
    </>
  );
}
