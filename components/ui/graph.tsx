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

  // Initialize or reinitialize graph when data changes
  useEffect(() => {
    if (
      containerRef.current && 
      ontologyData && 
      isDataReady && 
      ontologyData.nodes.length > 0 &&
      containerRef.current.offsetWidth > 0 &&
      containerRef.current.offsetHeight > 0
    ) {
      try {
        // Clean up previous instance if it exists
        if (containerRef.current.__cy) {
          if (containerRef.current.ehInstance) {
            containerRef.current.ehInstance.destroy();
            delete containerRef.current.ehInstance;
          }
          containerRef.current.__cy.destroy();
          delete containerRef.current.__cy;
          graphInitializedRef.current = false;
        }

        // Initialize new instance with updated data
        initializeGraph(
          containerRef.current,
          containerRef.current.offsetWidth,
          containerRef.current.offsetHeight,
          ontologyData,
          handleClosePanel,
          setSelectedNodeId,
          setSelectedNode,
          setIsPanelOpen,
          setSelectedRelationship,
          currentLayout,
          handleCreateRelationship
        );

        if (containerRef.current.__cy) {
          graphInitializedRef.current = true;
        }
      } catch (error) {
        console.error('Graph initialization error:', error);
      }
    }
  }, [ontologyData, isDataReady, currentLayout]);

  // Handle data updates
  useEffect(() => {
    if (!ontologyData || !isDataReady || !graphInitializedRef.current || !containerRef.current?.__cy) {
      return;
    }

    const cy = containerRef.current.__cy;
    const zoom = cy.zoom();
    const pan = cy.pan();
    
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

    const elementsChanged = cy.elements().length !== ontologyData.nodes.length + ontologyData.relationships.length;
    
    if (elementsChanged) {
      cy.layout({
        ...currentLayout,
        animate: false,
        fit: false
      }).run();
    }

    cy.viewport({
      zoom: zoom,
      pan: pan
    });
  }, [ontologyData, isDataReady, currentLayout]);

  // Handle node filtering based on selected type
  useEffect(() => {
    if (!containerRef.current?.filterByNodeType) return;
    containerRef.current.filterByNodeType(selectedType);
  }, [selectedType]);

  // Cleanup only on component unmount
  useEffect(() => {
    return () => {
      if (graphInitializedRef.current && containerRef.current?.__cy) {
        if (containerRef.current.ehInstance) {
          containerRef.current.ehInstance.destroy();
          delete containerRef.current.ehInstance;
        }
        containerRef.current.__cy.destroy();
        delete containerRef.current.__cy;
        graphInitializedRef.current = false;
      }
    };
  }, []); // Empty dependency array ensures cleanup only runs on unmount

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
