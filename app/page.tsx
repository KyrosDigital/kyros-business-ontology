'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { Legend } from '@/components/ui/legend';
import { initializeGraph } from '@/lib/graphInitializer';

// Move the JSON-LD data to a separate file
import { jsonld } from '@/lib/example';
import { NotesPanel } from '@/components/ui/notes-panel';

export default function Home() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    // Initialize the visualization using the imported function
    const cleanup = initializeGraph(
      svgRef,
      jsonld,
      handleClosePanel,
      setSelectedNodeId,
      setSelectedNode,
      setIsPanelOpen,
      selectedNodeId
    );

    // Cleanup function
    return () => {
      if (cleanup) cleanup();
      d3.select(svgRef.current).selectAll('*').remove();
    };
  }, []);

  const handleLegendClick = (type: string) => {
    setSelectedType(selectedType === type ? null : type);
    
    const svg = d3.select(svgRef.current);
    
    if (selectedType === type) {
      // Reset all nodes and links to full opacity
      svg.selectAll('.node')
        .transition()
        .duration(200)
        .style('opacity', 1);
      
      svg.selectAll('.link')
        .transition()
        .duration(200)
        .style('opacity', 1);
    } else {
      // Dim non-matching nodes and their links
      svg.selectAll('.node')
        .transition()
        .duration(200)
        .style('opacity', (d: any) => d.type === type ? 1 : 0.2);
      
      svg.selectAll('.link')
        .transition()
        .duration(200)
        .style('opacity', (d: any) => {
          const source = d.source as Node;
          const target = d.target as Node;
          return source.type === type || target.type === type ? 1 : 0.2;
        });
    }
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedNodeId(null);
    
    // Remove pulse effect
    d3.selectAll('.node').classed('node-pulse', false);
    
    // Restore opacity for all nodes
    d3.select(svgRef.current)
      .selectAll('.node')
      .transition()
      .duration(300)
      .style('opacity', 1);
    
    // Restore opacity for all links and their labels
    d3.select(svgRef.current)
      .selectAll('.link, .link-label')
      .transition()
      .duration(300)
      .style('opacity', 1);
  };

  // Add a cleanup effect for when the component unmounts
  useEffect(() => {
    return () => {
      // Ensure we clean up any remaining styles
      if (svgRef.current) {
        d3.select(svgRef.current)
          .selectAll('.node, .link, .link-label')
          .style('opacity', 1);
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Replace the Legend Card with the new Legend component */}
      <Legend 
        selectedType={selectedType} 
        onLegendClick={handleLegendClick} 
      />

      {/* Controls */}
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
        </div>
      </div>

      {/* SVG Container */}
      <svg
        ref={svgRef}
        className="w-full h-full"
      />

      <NotesPanel 
        isPanelOpen={isPanelOpen}
        selectedNode={selectedNode}
        onClose={handleClosePanel}
      />
    </div>
  );
}