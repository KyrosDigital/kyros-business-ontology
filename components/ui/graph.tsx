'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from "lucide-react";
import { initializeGraph } from '@/lib/graphInitializer';
import { useGraph } from '@/contexts/GraphContext';
import { useCustomNodeTypes } from '@/contexts/CustomNodeTypeContext';

export function Graph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphInitializedRef = useRef(false);
  const isInitializedRef = useRef(false);
  const { nodeTypes } = useCustomNodeTypes();
  
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
    viewMode,
  } = useGraph();

  const handleZoomIn = () => {
    if (containerRef.current?.__cy) {
      const cy = containerRef.current.__cy;
      const currentZoom = cy.zoom();
      cy.animate({
        zoom: currentZoom * 1.2,
        duration: 200
      });
    }
  };

  const handleZoomOut = () => {
    if (containerRef.current?.__cy) {
      const cy = containerRef.current.__cy;
      const currentZoom = cy.zoom();
      cy.animate({
        zoom: currentZoom / 1.2,
        duration: 200
      });
    }
  };

  // Initialize graph only on first load
  useEffect(() => {
		console.log("RAN INITIALIZE EFFECT")
		console.log(containerRef.current.__cy)
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
        // if (containerRef.current.__cy) {
        //   if (containerRef.current.ehInstance) {
        //     containerRef.current.ehInstance.destroy();
        //     delete containerRef.current.ehInstance;
        //   }
        //   containerRef.current.__cy.destroy();
        //   delete containerRef.current.__cy;
        //   graphInitializedRef.current = false;
        // }

				if(!isInitializedRef.current && !containerRef.current.__cy && nodeTypes.length > 0 && isDataReady && ontologyData) {
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
						handleCreateRelationship,
						nodeTypes
					);
				}
				if (containerRef.current.__cy) {
					graphInitializedRef.current = true;
					isInitializedRef.current = true;
				}
      } catch (error) {
        console.error('Graph initialization error:', error);
      }
    }
  }, [ontologyData, isDataReady, viewMode, nodeTypes]);

  // Handle data updates after initialization
  useEffect(() => {
		console.log("RAN BATCH UPDATE EFFECT")
		console.log(ontologyData)
    if (
      !ontologyData || 
      !isDataReady || 
      !graphInitializedRef.current || 
      !containerRef.current?.__cy ||
      !isInitializedRef.current
    ) {
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
          // Get viewport center in rendered coordinates
          const center = {
            x: (-pan.x + cy.width() / 2) / zoom,
            y: (-pan.y + cy.height() / 2) / zoom
          };

          // Add some random offset from center (-100 to 100 pixels)
          const offset = {
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200
          };

          cy.add({
            group: 'nodes',
            data: { ...node},
            position: {
              x: center.x + offset.x,
              y: center.y + offset.y
            }
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
  }, [ontologyData, isDataReady]); // Add currentLayout back as dependency

	// handle layout changes triggered by the layout select component
	useEffect(() => {
		if(!containerRef.current?.__cy) return; 
		if(!isInitializedRef.current) return // if the graph is not initialized, don't run the layout

    containerRef.current?.__cy.layout(currentLayout).run();
  }, [currentLayout]);

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
				isInitializedRef.current = false;
      }
    };
  }, []); // Empty dependency array ensures cleanup only runs on unmount

  // Add SSE effect
  useEffect(() => {
    const eventSource = new EventSource('/api/v1/notify-ui');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received SSE update:', data);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
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
            onClick={handleZoomIn}
          >
            +
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8"
            id="zoom-out"
            onClick={handleZoomOut}
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
