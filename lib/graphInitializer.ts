import * as d3 from 'd3';
import { getRelationshipType } from './utils';
import { NodeData, Link, Note } from '@/types/graph';

export function initializeGraph(
  svgRef: React.RefObject<SVGSVGElement>,
  jsonld: any,
  handleClosePanel: () => void,
  setSelectedNodeId: (id: string | null) => void,
  setSelectedNode: (node: NodeData | null) => void,
  setIsPanelOpen: (isOpen: boolean) => void,
  selectedNodeId: string | null,
  existingNodes: NodeData[] = []
) {
	const width = window.innerWidth;
	const height = window.innerHeight;
	const svg = d3.select(svgRef.current);

	// Clear any existing content
	svg.selectAll('*').remove();

	// Create zoom behavior first
	const zoomBehavior = d3.zoom()
		.scaleExtent([0.1, 4])
		.on("zoom", (event) => {
			container.attr("transform", event.transform);
			
			// Update node text position based on zoom level
			node?.selectAll("text")
				.attr("x", 12 / event.transform.k);
		});

	// Create container for zoom
	const container = svg.append("g").attr("class", "zoom-container");

	// Create background rect first
	const background = container.append("rect")
		.attr("width", width)
		.attr("height", height)
		.attr("fill", "transparent");

	// Apply zoom behavior to svg
	svg.call(zoomBehavior);

	// Create color scale
	const colorScale = d3.scaleOrdinal()
		.domain(["Organization", "Department", "Role", "Process", "Task", "Integration", "DataSource", "AIComponent", "Analytics", "SoftwareTool"])
		.range(["#69b3a2", "#ffcc00", "#ff6600", "#0066cc", "#cc0066", "#9900cc", "#00cc99", "#ff3333", "#3333ff", "#ff99cc"]);

	// Create local arrays for D3 visualization
	const visualNodes: NodeData[] = [];
	const links: Link[] = [];
	const nodeMap = new Map();

	function parseJsonLd(data: any, parent = null) {
		const nodeId = data['@id'] || data.name || data['@type'] || "Unknown";
		let currentNode;

		if (nodeMap.has(nodeId)) {
			currentNode = nodeMap.get(nodeId);
		} else {
			// Find the node in existingNodes if available
			const existingNode = existingNodes?.find(n => n.id === nodeId);
			
			if (existingNode) {
				currentNode = existingNode;
			} else {
				// Create new node if not found
				const notes: Note[] = [];

				if (data.hasNote) {
					notes.push(...data.hasNote.map((note: any) => ({
						content: note.content,
						author: note.author,
						dateCreated: note.dateCreated
					})));
				}

				if (data.relatedNotes) {
					notes.push(...data.relatedNotes.map((note: any) => ({
						content: note.content,
						author: note.author,
						dateCreated: note.dateCreated
					})));
				}

				currentNode = {
					id: nodeId,
					name: data.name,
					type: data['@type'] || "Unknown",
					description: data.description,
					responsibilities: data.responsibilities,
					version: data.version,
					versionDate: data.versionDate,
					notes: notes.length > 0 ? notes : undefined,
					children: []
				};
			}
			
			visualNodes.push(currentNode);
			nodeMap.set(nodeId, currentNode);
		}

		if (parent) {
			links.push({
				source: parent.id,
				target: currentNode.id,
				relationship: getRelationshipType(data['@type'])
			});
		}

		if (data.hasDepartment) {
			data.hasDepartment.forEach((dept: any) => parseJsonLd(dept, currentNode));
		}

		if (data.hasRole) {
			data.hasRole.forEach((role: any) => parseJsonLd(role, currentNode));
		}

		if (data.hasProcess) {
			data.hasProcess.forEach((process: any) => parseJsonLd(process, currentNode));
		}

		if (data.workflow) {
			data.workflow.forEach(task => parseJsonLd(task, currentNode));
		}

		if (data.hasIntegration) {
			data.hasIntegration.forEach(integration => parseJsonLd(integration, currentNode));
		}

		if (data.hasDataSource) {
			data.hasDataSource.forEach(dataSource => parseJsonLd(dataSource, currentNode));
		}

		if (data.hasAIComponent) {
			data.hasAIComponent.forEach(aiComponent => parseJsonLd(aiComponent, currentNode));
		}

		if (data.hasAnalytics) {
			data.hasAnalytics.forEach(analytics => parseJsonLd(analytics, currentNode));
		}

		if (data.hasSoftwareTool) {
			data.hasSoftwareTool.forEach(softwareTool => parseJsonLd(softwareTool, currentNode));
		}

		if (data.relatedProcess) {
			parseJsonLd(data.relatedProcess, currentNode);
		}

		if (data.usesDataSource) {
			parseJsonLd(data.usesDataSource, currentNode);
		}

		if (data.softwareTool) {
			parseJsonLd(data.softwareTool, currentNode);
		}

		if (data.relatedDepartment) {
			parseJsonLd(data.relatedDepartment, currentNode);
		}

		if (data.dataSource) {
			data.dataSource.forEach(source => parseJsonLd(source, currentNode));
		}

		if (data.relatedIntegration) {
			parseJsonLd(data.relatedIntegration, currentNode);
		}

		if (data.relatedRole) {
			parseJsonLd(data.relatedRole, currentNode);
		}

		if (data.responsibleRole) {
			parseJsonLd(data.responsibleRole, currentNode);
		}

		return currentNode;
	}

	// Initialize the graph with the JSON-LD data
	parseJsonLd(jsonld);

	// Define drag event handlers
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

	// Create simulation with adjusted forces
	const simulation = d3.forceSimulation(visualNodes)
		.force("link", d3.forceLink(links).id((d: any) => d.id).distance(200))
		.force("charge", d3.forceManyBody().strength(-800))
		.force("center", d3.forceCenter(width / 2, height / 2))
		.force("collision", d3.forceCollide().radius(50));

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

	// Add label background rectangles with rounded corners
	link.append("rect")
		.attr("class", "link-label-bg")
		.attr("fill", "white")
		.attr("opacity", 0.9)
		.attr("rx", 12) // Rounded corners
		.attr("ry", 12) // Rounded corners
		.style("filter", "drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))"); // Subtle shadow

	// Add the text labels with updated styling
	link.append("text")
		.attr("class", "link-label")
		.attr("text-anchor", "middle")
		.attr("dy", "0.32em") // Center text vertically
		.style("font-size", "11px")
		.style("font-weight", "500") // Medium weight
		.style("pointer-events", "none")
		.style("fill", "#4b5563") // Gray-600
		.text((d: any) => d.relationship);

	// Create nodes with drag behavior
	const node = container.append("g")
		.selectAll("g")
		.data(visualNodes)
		.enter().append("g")
		.attr("class", "node")
		.call(d3.drag()
			.on("start", dragstarted)
			.on("drag", dragged)
			.on("end", dragended) as any);

	// Add simulation tick handler
	simulation.on("tick", () => {
		// Update link positions
		link.select("line")
			.attr("x1", (d: any) => d.source.x)
			.attr("y1", (d: any) => d.source.y)
			.attr("x2", (d: any) => d.target.x)
			.attr("y2", (d: any) => d.target.y);

		// Update link label positions
		link.select("text")
			.attr("x", (d: any) => (d.source.x + d.target.x) / 2)
			.attr("y", (d: any) => (d.source.y + d.target.y) / 2);

		// Update link label backgrounds with more padding
		link.select("rect")
			.attr("x", function (d: any) {
				const textElement = d3.select(this.parentNode).select("text").node();
				const bbox = textElement?.getBBox();
				return ((d.source.x + d.target.x) / 2) - (bbox?.width || 0) / 2 - 8; // More horizontal padding
			})
			.attr("y", function (d: any) {
				const textElement = d3.select(this.parentNode).select("text").node();
				const bbox = textElement?.getBBox();
				return ((d.source.y + d.target.y) / 2) - (bbox?.height || 0) / 2 - 6; // More vertical padding
			})
			.attr("width", function () {
				const textElement = d3.select(this.parentNode).select("text").node();
				const bbox = textElement?.getBBox();
				return (bbox?.width || 0) + 16; // More horizontal padding
			})
			.attr("height", function () {
				const textElement = d3.select(this.parentNode).select("text").node();
				const bbox = textElement?.getBBox();
				return (bbox?.height || 0) + 12; // More vertical padding
			});

		// Update node positions
		node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
	});

	// Add click handler to SVG (not background)
	svg.on("click", (event) => {
		// Ignore if the click is on a node or link
		if (event.target === svg.node() || event.target === background.node()) {
			handleClosePanel();
		}
	});

	// Ensure background is behind nodes and links
	background.lower();

	// Add circles with hover effects
	node.append("circle")
		.attr("r", 10)
		.attr("fill", (d: any) => colorScale(d.type))
		.style("stroke", "#333")
		.style("stroke-width", "1.5px")
		.style("cursor", "pointer")
		.style("transition", "r 0.2s ease-in-out")
		.on("mouseover", function (event, d) {
			const nodeGroup = d3.select(this.parentNode);

			// Enlarge circle
			d3.select(this)
				.transition()
				.duration(200)
				.attr("r", 15);

			// Enhance the text
			const textElement = nodeGroup.select("text")
				.transition()
				.duration(200)
				.style("font-size", "16px")
				.style("font-weight", "bold")
				.attr("y", 30); // Adjust the y position when circle is larger

			// Ensure the background updates after text changes
			nodeGroup.select("text")
				.transition()
				.duration(200)
				.on("end", function () {
					const bbox = this.getBBox();
					nodeGroup.select("rect")
						.attr("x", bbox.x - 2)
						.attr("y", bbox.y - 2)
						.attr("width", bbox.width + 4)
						.attr("height", bbox.height + 4);
				});
		})
		.on("mouseout", function (event, d) {
			if (d.id !== selectedNodeId) {
				const nodeGroup = d3.select(this.parentNode);

				// Shrink circle
				d3.select(this)
					.transition()
					.duration(200)
					.attr("r", 10);

				// Reset text
				const textElement = nodeGroup.select("text")
					.transition()
					.duration(200)
					.style("font-size", "12px")
					.style("font-weight", "normal")
					.attr("y", 25);

				// Update background
				nodeGroup.select("text")
					.transition()
					.duration(200)
					.on("end", function () {
						const bbox = this.getBBox();
						nodeGroup.select("rect")
							.attr("x", bbox.x - 2)
							.attr("y", bbox.y - 2)
							.attr("width", bbox.width + 4)
							.attr("height", bbox.height + 4);
					});
			}
		})
		.on("click", (event, d: any) => {
			event.stopPropagation();

			// Find the complete node data from existingNodes or visualNodes
			const nodeData = existingNodes?.find(n => n.id === d.id) || visualNodes.find(n => n.id === d.id);
			
			if (nodeData) {
				setSelectedNodeId(nodeData.id);
				setSelectedNode(nodeData);
				setIsPanelOpen(true);
				
				// Add pulse effect to clicked node
				d3.selectAll('.node').classed('node-pulse', false);
				d3.select(event.currentTarget).classed('node-pulse', true);
				
				// Dim other nodes and their links
				svg.selectAll('.node')
					.transition()
					.duration(200)
					.style('opacity', (n: any) => n.id === nodeData.id ? 1 : 0.2);
				
				svg.selectAll('.link')
					.transition()
					.duration(200)
					.style('opacity', (l: any) => {
						const source = l.source.id || l.source;
						const target = l.target.id || l.target;
						return source === nodeData.id || target === nodeData.id ? 1 : 0.2;
					});
			}
		});

	// Also stop propagation on the node group
	node.on("click", (event) => {
		event.stopPropagation();
	});

	// Stop propagation on links to prevent background clicks
	link.on("click", (event) => {
		event.stopPropagation();
	});

	// Add text labels with background for better readability
	node.append("text")
		.attr("text-anchor", "middle") // Center the text horizontally
		.attr("x", 0) // Center relative to the circle
		.attr("y", 25) // Position below the circle (10px radius + 15px spacing)
		.text((d: any) => d.name || d.id)
		.style("font-size", "12px")
		.style("pointer-events", "none")
		.each(function () {
			// Add a background rectangle for the text
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

	// Add zoom button handlers
	d3.select("#zoom-in").on("click", () => {
		svg.transition()
			.duration(750)
			.call(zoomBehavior.scaleBy, 1.3);
	});

	d3.select("#zoom-out").on("click", () => {
		svg.transition()
			.duration(750)
			.call(zoomBehavior.scaleBy, 0.7);
	});

	// Add this CSS to the SVG container for the pulse animation
	const defs = svg.append("defs");
	defs.append("style").text(`
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

	// Add a small delay to distinguish between single clicks and double clicks
	let clickTimeout: NodeJS.Timeout;
	svg.on("dblclick.zoom", null); // Disable default double-click zoom
	svg.on("dblclick", (event) => {
		event.preventDefault();
		event.stopPropagation();

		// Clear any pending single clicks
		clearTimeout(clickTimeout);

		// Handle double click zoom here if needed
		const [[x, y], k] = [
			[event.offsetX, event.offsetY],
			svg.property("__zoom").k * 2
		];

		svg.transition()
			.duration(750)
			.call(
				zoomBehavior.transform as any,
				d3.zoomIdentity
					.translate(width / 2, height / 2)
					.scale(k)
					.translate(-x, -y)
			);
	});

	// Return a cleanup function
	return () => {
		// Remove zoom listeners
		svg.on('.zoom', null);
		svg.on('dblclick', null);
		svg.on('click', null);
		// Remove drag listeners
		node.on('.drag', null);
		// Remove click listeners
		node.on('click', null);
		link.on('click', null);
		// Clear any pending timeouts
		clearTimeout(clickTimeout);
		// Stop simulation
		simulation.stop();
		// Remove button handlers
		d3.select("#zoom-in").on("click", null);
		d3.select("#zoom-out").on("click", null);
	};
};
