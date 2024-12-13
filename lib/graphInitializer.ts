import cytoscape from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
import { NodeData, OntologyData } from '@/types/graph';
import EdgeHandlesInstance from 'cytoscape-edgehandles';
import EdgeHandlesOptions from 'cytoscape-edgehandles';
import type { NodeSingular, LayoutOptions as CytoscapeLayoutOptions } from 'cytoscape';
import { Node, CustomNodeType } from '@prisma/client';
import { NodeWithRelations } from '@/services/ontology';

// Register the edgehandles extension
cytoscape.use(edgehandles);

declare global {
  interface HTMLDivElement {
    __cy?: cytoscape.Core;
    unlockNodes?: () => void;
    ehInstance?: typeof EdgeHandlesInstance;
    filterByNodeType?: (nodeType: string | null) => void;
  }
}

// Helper function to get node color
function getNodeColor(typeId: string, nodeTypes: CustomNodeType[]) {
  const nodeType = nodeTypes.find(nt => nt.id === typeId);
  return nodeType?.hexColor || '#cccccc';
}

// Helper function to detect circular dependencies
function detectCircularDependencies(relationships: Array<{ fromNodeId: string; toNodeId: string }>): boolean {
  const graph: Record<string, string[]> = {};
  
  // Build adjacency list
  relationships.forEach(rel => {
    if (!graph[rel.fromNodeId]) graph[rel.fromNodeId] = [];
    graph[rel.fromNodeId].push(rel.toNodeId);
  });

  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph[nodeId] || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) return true;
    }

    recursionStack.delete(nodeId);
    return false;
  }

  return Object.keys(graph).some(nodeId => hasCycle(nodeId));
}

export function initializeGraph(
  container: HTMLDivElement,
  width: number,
  height: number,
  data: OntologyData,
  onClose: () => void,
  setSelectedNodeId: (id: string | null) => void,
  setSelectedNode: (node: Node | null) => void,
  setIsPanelOpen: (isOpen: boolean) => void,
  setSelectedRelationship: (rel: { sourceNode: NodeData; targetNode: NodeData; relationType: string; } | null) => void,
  layout: CytoscapeLayoutOptions,
  onCreateRelationship: (sourceId: string, targetId: string, relationType: string) => Promise<void>,
  nodeTypes: CustomNodeType[]
): () => void {
  // Validate input data
  if (!container || !data.nodes || !data.relationships) {
    return () => {};
  }

  // If there's already a Cytoscape instance, don't reinitialize
  if (container.__cy) {
    return () => {};
  }

  // Set container dimensions explicitly - required for proper Cytoscape initialization
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;

  // Transform data for Cytoscape
  const elements = {
    nodes: data.nodes.map(node => ({
      data: {
        id: node.id,
        typeId: node.typeId,
        name: node.name,
      }
    })),
    edges: data.relationships.map(rel => ({
      data: {
        id: rel.id,
        source: rel.fromNodeId,
        target: rel.toNodeId,
        relationType: rel.relationType
      }
    }))
  };

  try {
    // Check for circular dependencies and use appropriate layout
    const hasCircular = detectCircularDependencies(data.relationships);
    const safeLayout = hasCircular ? {
      name: 'circle',
      padding: 50,
      animate: false,
      fit: true
    } : {
      ...layout,
      animate: false,
      fit: true,
      padding: 50
    };

    // Initialize Cytoscape with modified layout options
    const cy = cytoscape({
      container,
      elements,
      style: [
        // Base node style first
        {
          selector: 'node',
          style: {
            'background-color': (ele) => {
              const typeId = ele.data('typeId');
              return getNodeColor(typeId, nodeTypes);
            },
            'width': 30,
            'height': 30,
            'shape': 'ellipse',
            'border-width': 2,
            'border-color': '#333'
          }
        },
        // Add faded state style
        {
          selector: 'node.faded',
          style: {
            'opacity': 0.3,
            'background-color': '#cccccc'  // Override color for faded nodes
          }
        },
        {
          selector: 'edge.faded',
          style: {
            'opacity': 0.2
          }
        },
        // Named nodes
        {
          selector: 'node[name]',
          style: {
            'label': 'data(name)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '12px',
            'text-background-color': 'white',
            'text-background-opacity': 0.8,
            'text-background-padding': '3px'
          }
        },
        // Edge styles
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#cccccc',
            'target-arrow-color': '#cccccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'control-point-step-size': 140
          }
        },
        {
          selector: 'edge[relationType]',
          style: {
            'label': 'data(relationType)',
            'text-background-color': 'white',
            'text-background-opacity': 0.9,
            'text-background-padding': '3px',
            'font-size': '11px',
            'text-margin-y': -10
          }
        },
        // Selected state
        {
          selector: '.selected',
          style: {
            'border-width': 4,
            'border-color': '#000',
            'border-opacity': 0.8
          }
        },
        // Edge handles styles - More specific selectors last
        {
          selector: '.eh-preview, .eh-ghost-edge',
          style: {
            'line-color': '#ff4444',
            'target-arrow-color': '#ff4444',
            'source-arrow-color': '#ff4444',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'width': 2,
            'opacity': 0.8
          }
        },
        {
          selector: '.eh-handle',
          style: {
            'background-color': '#ff4444',
            'width': 12,
            'height': 12,
            'shape': 'ellipse'
          }
        },
        {
          selector: '.eh-source',
          style: {
            'border-width': 2,
            'border-color': '#ff4444'
          }
        },
        {
          selector: '.eh-target',
          style: {
            'border-width': 3,
            'border-color': '#ff4444',
            'border-opacity': 1,
            'opacity': 1,
            // Preserve original node appearance
            'background-color': (ele) => {
              const typeId = ele.data('typeId');
              return getNodeColor(typeId, nodeTypes);
            },
            'width': 30,
            'height': 30,
            'shape': 'ellipse'
          }
        },
        // Most specific styles last
        {
          selector: '.eh-target.eh-hover',
          style: {
            'border-width': 3,
            'border-color': '#ff4444'
          }
        },
        {
          selector: 'edge.selected',
          style: {
            'width': 3,
            'line-color': '#000',
            'target-arrow-color': '#000'
          }
        }
      ],
      layout: safeLayout,
      minZoom: 0.1,
      maxZoom: 3,
      autoungrabify: false,
      userZoomingEnabled: true,
      userPanningEnabled: true
    });

    // Handle single node case
    if (data.nodes.length === 1) {
      cy.zoom({
        level: 1,
        position: cy.nodes().first().position()
      });
      cy.center(cy.nodes().first());
    } else {
      cy.layout(safeLayout).run();
    }

    // Store the instance on the container
    container.__cy = cy;

    // Initialize edge handles
    const ehOptions: typeof EdgeHandlesOptions = {
      snap: true,
      noEdgeEventsInDraw: true,
      disableBrowserGestures: true,
      handleNodes: 'node',
      handlePosition: () => 'middle top',
      handleInDrawMode: false,
      edgeType: () => 'flat',
      loopAllowed: () => false,
      edgeParams: (sourceNode: NodeSingular, targetNode: NodeSingular) => ({
        data: {
          id: `${sourceNode.id()}-${targetNode.id()}`,
          source: sourceNode.id(),
          target: targetNode.id(),
        },
        classes: 'eh-preview'
      })
    };

    const eh = cy.edgehandles(ehOptions);
    container.ehInstance = eh;

    // Handle edge creation
    cy.on('ehcomplete', (event, sourceNode, targetNode, addedEles) => {
      addedEles.remove();
      
      const sourceId = sourceNode.id();
      const targetId = targetNode.id();
      
      onCreateRelationship(sourceId, targetId, 'PARENT_CHILD')
        .then(() => {
          cy.add({
            group: 'edges',
            data: {
              id: `${sourceId}-${targetId}`,
              source: sourceId,
              target: targetId,
              relationType: 'PARENT_CHILD'
            }
          });
        })
        .catch(error => {
          console.error('Failed to create relationship:', error);
        });
    });

    // Node management functions
    const lockNodes = () => {
      cy.nodes().ungrabify();
      if (container.ehInstance) {
        container.ehInstance.enableDrawMode();
      }
    };

    const unlockNodes = () => {
      cy.nodes().grabify();
      if (container.ehInstance) {
        container.ehInstance.disableDrawMode();
      }
    };

    // Event handlers
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeId = node.id();
      
      const nodeData = data.nodes.find(n => n.id === nodeId);

      if (nodeData) {
        const completeNodeData: NodeWithRelations = {
          ...nodeData,
          fromRelations: data.relationships
            .filter(rel => rel.fromNodeId === nodeId)
            .map(rel => ({
              toNode: data.nodes.find(n => n.id === rel.toNodeId)!,
              relationType: rel.relationType
            })),
          toRelations: data.relationships
            .filter(rel => rel.toNodeId === nodeId)
            .map(rel => ({
              fromNode: data.nodes.find(n => n.id === rel.fromNodeId)!,
              relationType: rel.relationType
            }))
        };

        setSelectedNode(completeNodeData);
        setSelectedNodeId(nodeId);
        setIsPanelOpen(true);
        lockNodes();
      }
      
      cy.elements().removeClass('highlighted faded selected');
      node.addClass('selected');
      node.neighborhood().addClass('highlighted');
      cy.elements().not(node.neighborhood()).not(node).addClass('faded');
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onClose();
        cy.elements().removeClass('highlighted faded selected');
        unlockNodes();
      }
    });

    container.unlockNodes = unlockNodes;

    const filterByNodeType = (nodeType: string | null) => {
      if (!cy) return;
      
      if (!nodeType) {
        cy.elements().removeClass('faded');
        return;
      }

      const matchingNodes = cy.nodes(`[typeId = "${nodeType}"]`);
      const connectedEdges = matchingNodes.connectedEdges();
      
      cy.elements().addClass('faded');
      matchingNodes.removeClass('faded');
      connectedEdges.removeClass('faded');
    };

    container.filterByNodeType = filterByNodeType;

    cy.on('tap', 'edge', (event) => {
      const edge = event.target;
      const sourceId = edge.source().id();
      const targetId = edge.target().id();
      const relationType = edge.data('relationType');

      const sourceNode = data.nodes.find(n => n.id === sourceId);
      const targetNode = data.nodes.find(n => n.id === targetId);

      if (sourceNode && targetNode) {
        cy.elements().removeClass('highlighted faded selected');
        edge.addClass('selected');
        edge.source().addClass('highlighted');
        edge.target().addClass('highlighted');
        cy.elements()
          .not(edge)
          .not(edge.source())
          .not(edge.target())
          .addClass('faded');

        setSelectedRelationship({
          sourceNode,
          targetNode,
          relationType
        });
      }
    });

    return () => {
      if (container.__cy) {
        if (container.ehInstance) {
          container.ehInstance.destroy();
          delete container.ehInstance;
        }
        unlockNodes();
        delete container.unlockNodes;
        container.__cy.destroy();
        delete container.__cy;
      }
    };
  } catch (error) {
    console.error('Error during Cytoscape initialization:', error);
    return () => {};
  }
}



