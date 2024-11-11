'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { Legend } from '@/components/ui/legend';
import { initializeGraph } from '@/lib/graphInitializer';
import { Download } from "lucide-react";
import { AiChat } from '@/components/ui/ai-chat';

// Move the JSON-LD data to a separate file
import { NotesPanel } from '@/components/ui/notes-panel';
import { OntologyTable } from "@/components/ui/ontology-table"
import { NodesCategoryPanel } from '@/components/ui/nodes-category-panel';

// Add this helper function at the top of the file, outside the component
function extractNodesFromDatabase(data: any): NodeData[] {
  const nodes: NodeData[] = [];
  const nodeMap = new Map();

  // Add the organization
  if (data) {
    const orgNode = {
      id: data.id,
      name: data.name,
      type: 'Organization',
      description: data.description,
      children: []
    };
    nodes.push(orgNode);
    nodeMap.set(orgNode.id, orgNode);
  }

  // Process departments and their children
  if (data?.departments) {
    data.departments.forEach((dept: any) => {
      const deptNode = {
        id: dept.id,
        name: dept.name,
        type: 'Department',
        description: dept.description,
        children: []
      };

      // Process roles
      if (dept.roles) {
        const roleNodes = dept.roles.map((role: any) => ({
          id: role.id,
          name: role.name,
          type: 'Role',
          description: role.responsibilities,
          children: []
        }));
        deptNode.children.push(...roleNodes);
        nodes.push(...roleNodes);
        roleNodes.forEach(node => nodeMap.set(node.id, node));
      }

      // Process processes and their children
      if (dept.processes) {
        dept.processes.forEach((process: any) => {
          const processNode = {
            id: process.id,
            name: process.name,
            type: 'Process',
            description: process.description,
            children: []
          };

          // Add tasks
          if (process.workflow) {
            const taskNodes = process.workflow.map((task: any) => ({
              id: task.id,
              name: task.name,
              type: 'Task',
              description: task.description,
              children: []
            }));
            processNode.children.push(...taskNodes);
            nodes.push(...taskNodes);
          }

          // Add integrations
          if (process.integrations) {
            const integrationNodes = process.integrations.map((integration: any) => ({
              id: integration.id,
              name: integration.name,
              type: 'Integration',
              description: integration.description,
              children: []
            }));
            processNode.children.push(...integrationNodes);
            nodes.push(...integrationNodes);
          }

          // Add data sources
          if (process.dataSources) {
            const dataSourceNodes = process.dataSources.map((ds: any) => ({
              id: ds.id,
              name: ds.name,
              type: 'DataSource',
              description: ds.description,
              children: []
            }));
            processNode.children.push(...dataSourceNodes);
            nodes.push(...dataSourceNodes);
          }

          nodes.push(processNode);
          nodeMap.set(processNode.id, processNode);
        });
      }

      nodes.push(deptNode);
      nodeMap.set(deptNode.id, deptNode);
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
  const [dbData, setDbData] = useState<any>(null);

  // Add new useEffect to fetch data from API
  useEffect(() => {
    const fetchOntologyData = async () => {
      try {
        const response = await fetch('/api/v1/ontology');
        const data = await response.json();
        setDbData(data);
        const extractedNodes = extractNodesFromDatabase(data);
        setNodes(extractedNodes);
      } catch (error) {
        console.error('Error fetching ontology data:', error);
      }
    };

    fetchOntologyData();
  }, []);

  useEffect(() => {
    // Only initialize the graph if we're in graph view and the svg ref exists
    if (viewMode === 'graph' && svgRef.current && dbData) {
      // Clear any existing SVG content
      d3.select(svgRef.current).selectAll('*').remove();

      // Initialize the visualization using the imported function
      const cleanup = initializeGraph(
        svgRef,
        dbData,
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
  }, [viewMode, dbData]);

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

  const handleDownloadOntology = () => {
    const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
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
                onClick={handleDownloadOntology}
                title="Download Ontology Data"
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
          <OntologyTable data={dbData} />
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
      <AiChat ontologyData={dbData} />
    </div>
  );
}