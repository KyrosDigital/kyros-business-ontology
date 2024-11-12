import * as d3 from 'd3';
import { NodeType } from '@prisma/client';
import { NODE_COLORS } from '@/components/ui/legend';

type Node = {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  fromRelations?: any[];
  toRelations?: any[];
  notes?: any[];
  x?: number;
  y?: number;
};

type Link = {
  id: string;
  source: Node;
  target: Node;
  relationType: string;
};

export const initializeGraph = (
  svgRef: React.RefObject<SVGSVGElement>,
  width: number,
  height: number,
  data: { nodes: Node[], relationships: Link[] },
  handleClosePanel: () => void,
  setSelectedNodeId: (id: string | null) => void,
  setSelectedNode: (node: Node | null) => void,
  setIsPanelOpen: (open: boolean) => void,
  selectedNodeId: string | null
) => {
  if (!svgRef.current) return;

  // Process the data
  const nodes = data.nodes;
  const links = data.relationships.map(rel => ({
    id: rel.id,
    source: nodes.find(n => n.id === rel.source.id)!,
    target: nodes.find(n => n.id === rel.target.id)!,
    relationType: rel.relationType
  }));

  // Replace the color scale with our defined colors
  const colorScale = (type: NodeType) => NODE_COLORS[type];

  // Create SVG
  const svg = d3.select(svgRef.current)
    .attr("viewBox", [0, 0, width, height]);

  // Create background
  const background = svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#ffffff");

  // Create zoom behavior
  const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .extent([[0, 0], [width, height]])
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
      container.attr("transform", event.transform);
    });

  svg.call(zoomBehavior);

  // Create container for zoom
  const container = svg.append("g");

  // Create force simulation
  const simulation = d3.forceSimulation<Node>(nodes)
    .force("link", d3.forceLink<Node, Link>(links)
      .id(d => d.id)
      .distance(200))
    .force("charge", d3.forceManyBody().strength(-1000))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(75));

  // Let the simulation settle initially
  simulation.tick(300); // Run several ticks immediately
  simulation.alphaTarget(0).alpha(0.1);

  // Drag functions
  function dragstarted(event: any, d: any) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event: any, d: any) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event: any, d: any) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // Create links with labels
  const link = container.append("g")
    .selectAll("g")
    .data(links)
    .enter()
    .append("g")
    .attr("class", "link");

  // Add the line elements
  link.append("line")
    .attr("class", "link")
    .style("stroke", "#cccccc")
    .style("stroke-width", "1.5px");

  // Add label background rectangles
  link.append("rect")
    .attr("class", "link-label-bg")
    .attr("fill", "white")
    .attr("opacity", 0.9)
    .attr("rx", 12)
    .attr("ry", 12)
    .style("filter", "drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))");

  // Add relationship type labels
  link.append("text")
    .attr("class", "link-label")
    .attr("text-anchor", "middle")
    .attr("dy", "0.32em")
    .style("font-size", "11px")
    .style("font-weight", "500")
    .style("pointer-events", "none")
    .style("fill", "#4b5563")
    .text(d => d.relationType);

  // Create nodes with drag behavior
  const node = container.append("g")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .call(d3.drag<any, Node>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  // Add circles with hover effects
  node.append("circle")
    .attr("r", d => {
      const connectionCount = links.filter(
        l => l.source.id === d.id || l.target.id === d.id
      ).length;
      return Math.max(10, Math.min(20, 10 + connectionCount / 2));
    })
    .attr("fill", d => colorScale(d.type))
    .style("stroke", "#333")
    .style("stroke-width", "1.5px")
    .style("cursor", "pointer")
    .style("transition", "all 0.2s ease-in-out");

  // Add hover tooltips
  node.append("title")
    .text(d => {
      const connections = links.filter(
        l => l.source.id === d.id || l.target.id === d.id
      );
      return `${d.name} (${d.type})\nConnections: ${connections.length}`;
    });

  // Add node labels
  node.append("text")
    .attr("text-anchor", "middle")
    .attr("x", 0)
    .attr("y", 25)
    .text(d => d.name)
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .each(function() {
      const bbox = this.getBBox();
      d3.select(this.parentNode)
        .insert("rect", "text")
        .attr("x", bbox.x - 2)
        .attr("y", bbox.y - 2)
        .attr("width", bbox.width + 4)
        .attr("height", bbox.height + 4)
        .attr("fill", "white")
        .attr("opacity", 0.8)
        .style("pointer-events", "none");
    });

  // Add click handlers
  node.on("click", function(event: any, d: Node) {
    event.stopPropagation();
    
    // Clear existing effects first
    d3.selectAll('.node').classed('node-pulse', false);
    svg.selectAll('.node, .link').style('opacity', 1);
    
    // Apply pulse effect to clicked node
    d3.select(this).classed('node-pulse', true);
    
    // Find connected nodes
    const connectedNodeIds = new Set(
      links
        .filter(l => l.source.id === d.id || l.target.id === d.id)
        .flatMap(l => [l.source.id, l.target.id])
    );
    
    // Apply opacity changes
    svg.selectAll('.node')
      .style('opacity', n => 
        connectedNodeIds.has((n as any).id) || (n as any).id === d.id ? 1 : 0.2
      );

    svg.selectAll('.link')
      .style('opacity', l => 
        l.source.id === d.id || l.target.id === d.id ? 1 : 0.2
      );

    // Update React state
    const fullNodeData = data.nodes.find(n => n.id === d.id);
    setSelectedNode(fullNodeData);
    setSelectedNodeId(d.id);
    setIsPanelOpen(true);
  });

  // Modify the simulation tick handler to be more efficient
  simulation.on("tick", () => {
    // Update positions without transitions
    link.select("line")
      .attr("x1", d => d.source.x!)
      .attr("y1", d => d.source.y!)
      .attr("x2", d => d.target.x!)
      .attr("y2", d => d.target.y!);

    link.select("text")
      .attr("x", d => (d.source.x! + d.target.x!) / 2)
      .attr("y", d => (d.source.y! + d.target.y!) / 2);

    node.attr("transform", d => `translate(${d.x},${d.y})`);

    // Update link label backgrounds
    link.select("rect")
      .attr("x", function(d) {
        const bbox = d3.select(this.parentNode).select("text").node()?.getBBox();
        return ((d.source.x! + d.target.x!) / 2) - (bbox?.width || 0) / 2 - 8;
      })
      .attr("y", function(d) {
        const bbox = d3.select(this.parentNode).select("text").node()?.getBBox();
        return ((d.source.y! + d.target.y!) / 2) - (bbox?.height || 0) / 2 - 6;
      })
      .attr("width", function() {
        const bbox = d3.select(this.parentNode).select("text").node()?.getBBox();
        return (bbox?.width || 0) + 16;
      })
      .attr("height", function() {
        const bbox = d3.select(this.parentNode).select("text").node()?.getBBox();
        return (bbox?.height || 0) + 12;
      });
  });

  // Add click handler to background
  svg.on("click", (event) => {
    if (event.target === svg.node() || event.target === background.node()) {
      handleClosePanel();
      d3.selectAll('.node').classed('node-pulse', false);
      svg.selectAll('.node, .link')
        .transition()
        .duration(200)
        .style('opacity', 1);
    }
  });

  // Add zoom buttons
  d3.select("#zoom-in").on("click", () => {
    svg.transition().duration(750).call(zoomBehavior.scaleBy, 1.3);
  });

  d3.select("#zoom-out").on("click", () => {
    svg.transition().duration(750).call(zoomBehavior.scaleBy, 0.7);
  });

  // Add pulse animation style
  const style = svg.append("defs")
    .append("style")
    .text(`
      @keyframes pulse {
        0% {
          stroke-width: 1.5px;
          stroke-opacity: 1;
          r: 10;
        }
        50% {
          stroke-width: 3px;
          stroke-opacity: 0.8;
          r: 15;
        }
        100% {
          stroke-width: 1.5px;
          stroke-opacity: 1;
          r: 10;
        }
      }
      .node-pulse circle {
        animation: pulse 1.5s ease-in-out infinite;
      }
    `);

  // Return cleanup function
  return () => {
    simulation.stop();
    svg.on('.zoom', null);
    d3.select("#zoom-in").on("click", null);
    d3.select("#zoom-out").on("click", null);
  };
};
