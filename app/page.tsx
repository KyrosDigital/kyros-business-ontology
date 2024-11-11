'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { Legend } from '@/components/ui/legend';
import { initializeGraph } from '@/lib/graphInitializer';
import { Download } from "lucide-react";
import { AiChat } from '@/components/ui/ai-chat';

// Move the JSON-LD data to a separate file
import { jsonld } from '@/lib/example';
import { NotesPanel } from '@/components/ui/notes-panel';
import { JsonLdTable } from '@/components/ui/json-ld-table';
import { NodesCategoryPanel } from '@/components/ui/nodes-category-panel';

// Add this helper function at the top of the file, outside the component
function extractNodesFromJsonLd(jsonld: any): NodeData[] {
  const nodes: NodeData[] = [];
  const nodeMap = new Map(); // To help with linking children to parents

  // Add the organization itself
  if (jsonld['@type'] === 'Organization') {
    const orgNode = {
      id: jsonld['@id'],
      name: jsonld.name,
      type: jsonld['@type'],
      description: jsonld.description,
      version: jsonld.version,
      versionDate: jsonld.versionDate,
      hasNote: jsonld.hasNote,
      children: []
    };
    nodes.push(orgNode);
    nodeMap.set(orgNode.id, orgNode);
  }

  // Helper function to process departments and their nested structures
  const processDepartment = (dept: any) => {
    const deptNode = {
      id: dept['@id'],
      name: dept.name,
      type: 'Department',
      description: dept.description,
      version: dept.version,
      versionDate: dept.versionDate,
      hasNote: dept.hasNote,
      children: []
    };

    // Process roles within department
    if (dept.hasRole) {
      deptNode.children = dept.hasRole.map((role: any) => ({
        id: role['@id'] || `role-${role.name}`,
        name: role.name,
        type: 'Role',
        description: role.responsibilities,
        version: role.version,
        versionDate: role.versionDate,
        hasNote: role.hasNote,
        children: []
      }));
      // Add roles to nodes array as well
      nodes.push(...deptNode.children);
      deptNode.children.forEach(child => nodeMap.set(child.id, child));
    }

    nodes.push(deptNode);
    nodeMap.set(deptNode.id, deptNode);
  };

  // Process processes and their children
  const processProcess = (process: any) => {
    const processNode = {
      id: process['@id'],
      name: process.name,
      type: 'Process',
      description: process.description,
      version: process.version,
      versionDate: process.versionDate,
      hasNote: process.hasNote,
      children: []
    };

    // Add tasks as children
    if (process.workflow) {
      const taskNodes = process.workflow.map((task: any) => ({
        id: task['@id'] || `task-${task.name}`,
        name: task.name,
        type: 'Task',
        description: task.description,
        version: task.version,
        versionDate: task.versionDate,
        hasNote: task.hasNote,
        children: []
      }));
      processNode.children.push(...taskNodes);
      nodes.push(...taskNodes);
      taskNodes.forEach(child => nodeMap.set(child.id, child));
    }

    // Add integrations as children
    if (process.hasIntegration) {
      const integrationNodes = process.hasIntegration.map((integration: any) => ({
        id: integration['@id'] || `integration-${integration.name}`,
        name: integration.name,
        type: 'Integration',
        description: integration.description,
        version: integration.version,
        versionDate: integration.versionDate,
        hasNote: integration.hasNote,
        children: []
      }));
      processNode.children.push(...integrationNodes);
      nodes.push(...integrationNodes);
      integrationNodes.forEach(child => nodeMap.set(child.id, child));
    }

    // Add data sources as children
    if (process.hasDataSource) {
      const dataSourceNodes = process.hasDataSource.map((dataSource: any) => ({
        id: dataSource['@id'] || `datasource-${dataSource.name}`,
        name: dataSource.name,
        type: 'DataSource',
        description: dataSource.description,
        version: dataSource.version,
        versionDate: dataSource.versionDate,
        hasNote: dataSource.hasNote,
        children: []
      }));
      processNode.children.push(...dataSourceNodes);
      nodes.push(...dataSourceNodes);
      dataSourceNodes.forEach(child => nodeMap.set(child.id, child));
    }

    nodes.push(processNode);
    nodeMap.set(processNode.id, processNode);
  };

  // Process departments and processes
  if (jsonld.hasDepartment) {
    jsonld.hasDepartment.forEach(processDepartment);
  }
  if (jsonld.hasProcess) {
    jsonld.hasProcess.forEach(processProcess);
  }

  // Add other components with empty children arrays
  const processOtherComponent = (component: any, type: string) => {
    const node = {
      id: component['@id'] || `${type}-${component.name}`,
      name: component.name,
      type: type,
      description: component.description,
      version: component.version,
      versionDate: component.versionDate,
      hasNote: component.hasNote,
      children: []
    };
    nodes.push(node);
    nodeMap.set(node.id, node);
  };

  // Process other components
  if (jsonld.hasAIComponent) {
    jsonld.hasAIComponent.forEach(ai => processOtherComponent(ai, 'AIComponent'));
  }
  if (jsonld.hasAnalytics) {
    jsonld.hasAnalytics.forEach(analytics => processOtherComponent(analytics, 'Analytics'));
  }
  if (jsonld.hasSoftwareTool) {
    jsonld.hasSoftwareTool.forEach(tool => processOtherComponent(tool, 'SoftwareTool'));
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

  const handleDownloadJsonLd = () => {
    // Create a blob from the JSON-LD data
    const blob = new Blob([JSON.stringify(jsonld, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element and trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data.jsonld';
    document.body.appendChild(link);
    link.click();
    
    // Clean up
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
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8"
                onClick={handleDownloadJsonLd}
                title="Download JSON-LD"
              >
                <Download className="h-4 w-4" />
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

      {/* Add AiChat component */}
      <AiChat jsonld={jsonld} />
    </div>
  );
}