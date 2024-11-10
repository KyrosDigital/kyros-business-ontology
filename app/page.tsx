'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { Legend } from '@/components/ui/legend';
import { initializeGraph } from '@/lib/graphInitializer';

// Move the JSON-LD data to a separate file
import { jsonld } from '@/lib/example';
import { NotesPanel } from '@/components/ui/notes-panel';
import { JsonLdTable } from '@/components/ui/json-ld-table';
import { NodesCategoryPanel } from '@/components/ui/nodes-category-panel';

// Add this helper function at the top of the file, outside the component
function extractNodesFromJsonLd(jsonld: any): NodeData[] {
  const nodes: NodeData[] = [];

  // Add the organization itself
  if (jsonld['@type'] === 'Organization') {
    nodes.push({
      id: jsonld['@id'],
      name: jsonld.name,
      type: jsonld['@type'],
      description: jsonld.description,
      version: jsonld.version,
      versionDate: jsonld.versionDate,
      hasNote: jsonld.hasNote
    });
  }

  // Add departments
  if (jsonld.hasDepartment) {
    jsonld.hasDepartment.forEach((dept: any) => {
      nodes.push({
        id: dept['@id'],
        name: dept.name,
        type: 'Department',
        description: dept.description,
        version: dept.version,
        versionDate: dept.versionDate,
        hasNote: dept.hasNote
      });
    });
  }

  // Add processes
  if (jsonld.hasProcess) {
    jsonld.hasProcess.forEach((process: any) => {
      nodes.push({
        id: process['@id'],
        name: process.name,
        type: 'Process',
        description: process.description,
        version: process.version,
        versionDate: process.versionDate,
        hasNote: process.hasNote
      });
    });
  }

  // Add AI Components
  if (jsonld.hasAIComponent) {
    jsonld.hasAIComponent.forEach((ai: any) => {
      nodes.push({
        id: ai['@id'],
        name: ai.name,
        type: 'AIComponent',
        description: ai.description,
        version: ai.version,
        versionDate: ai.versionDate,
        hasNote: ai.hasNote
      });
    });
  }

  // Add Analytics
  if (jsonld.hasAnalytics) {
    jsonld.hasAnalytics.forEach((analytics: any) => {
      nodes.push({
        id: analytics['@id'] || analytics.name,
        name: analytics.name,
        type: 'Analytics',
        description: analytics.description,
        hasNote: analytics.hasNote
      });
    });
  }

  // Add Software Tools
  if (jsonld.hasSoftwareTool) {
    jsonld.hasSoftwareTool.forEach((tool: any) => {
      nodes.push({
        id: tool['@id'] || tool.name,
        name: tool.name,
        type: 'SoftwareTool',
        description: tool.description,
        version: tool.version,
        versionDate: tool.versionDate,
        hasNote: tool.hasNote
      });
    });
  }

  return nodes;
}

export default function Home() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [nodes, setNodes] = useState<NodeData[]>([]);

  // Initialize nodes from JSON-LD data
  useEffect(() => {
    const extractedNodes = extractNodesFromJsonLd(jsonld);
    setNodes(extractedNodes);
  }, []); // Empty dependency array as we only need to do this once

  useEffect(() => {
    // Only initialize the graph if we're in graph view and the svg ref exists
    if (viewMode === 'graph' && svgRef.current) {
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
    }
  }, [viewMode]);

  const handleLegendClick = (type: string) => {
    setSelectedType(type);
    setIsPanelOpen(true);
    setSelectedNode(null);
    
    const svg = d3.select(svgRef.current);
    
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

  const handleCreateNode = (nodeData: Partial<NodeData>) => {
    // Implement node creation logic
    console.log('Create node:', nodeData);
  };

  const handleUpdateNode = (nodeId: string, nodeData: Partial<NodeData>) => {
    // Implement node update logic
    console.log('Update node:', nodeId, nodeData);
  };

  const handleDeleteNode = (nodeId: string) => {
    // Implement node deletion logic
    console.log('Delete node:', nodeId);
  };

  const handleCreateLink = (sourceId: string, targetId: string, relationship: string) => {
    // Implement link creation logic
    console.log('Create link:', sourceId, targetId, relationship);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Legend 
        selectedType={selectedType} 
        onLegendClick={handleLegendClick}
        viewMode={viewMode}
        onViewModeChange={(checked) => setViewMode(checked ? 'table' : 'graph')}
      />

      {/* View Container */}
      {viewMode === 'graph' ? (
        <>
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
        </>
      ) : (
        <div className="p-4 mt-16 ml-72 h-[calc(100vh-5rem)] w-[calc(100vw-20rem)]">
          <JsonLdTable data={jsonld} />
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
        onCreateLink={handleCreateLink}
      />

      <NotesPanel 
        isPanelOpen={isPanelOpen && !!selectedNode}
        selectedNode={selectedNode}
        onClose={handleClosePanel}
      />
    </div>
  );
}