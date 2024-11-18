import cytoscape from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
import { NodeData, OntologyData } from '@/types/graph';
import { NODE_COLORS } from '@/components/ui/legend';

// Register the edgehandles extension
cytoscape.use(edgehandles);

declare global {
  interface HTMLDivElement {
    __cy?: cytoscape.Core;
    unlockNodes?: () => void;
    ehInstance?: any; // for the edgehandles instance
  }
}

/**
 * Initializes and renders a Cytoscape graph instance
 * 
 * @param container - The HTML container element where the graph will be rendered
 * @param width - Container width in pixels. Required for proper Cytoscape initialization
 *               even though we use CSS for responsive sizing. Removing this parameter
 *               will cause the graph to fail to render properly.
 * @param height - Container height in pixels. Required for proper Cytoscape initialization
 *                even though we use CSS for responsive sizing. Removing this parameter
 *                will cause the graph to fail to render properly.
 * @param data - The ontology data containing nodes and relationships to display
 * @param onClose - Callback function to handle closing/cleanup actions
 * @param setSelectedNodeId - Callback to update the selected node ID
 * @param setSelectedNode - Callback to update the selected node data
 * @param setIsPanelOpen - Callback to control panel visibility
 * @param layout - Cytoscape layout configuration
 * 
 * @returns Cleanup function to remove event listeners and destroy the Cytoscape instance
 * 
 * @important The width and height parameters are crucial for proper graph initialization.
 * Even though the container uses CSS for responsive sizing, Cytoscape requires explicit
 * dimensions during initialization. Without these, the graph may appear invisible or
 * fail to render properly. Do not remove these parameters even if they appear unused.
 */
export function initializeGraph(
  container: HTMLDivElement,
  width: number,
  height: number,
  data: OntologyData,
  onClose: () => void,
  setSelectedNodeId: (id: string | null) => void,
  setSelectedNode: (node: NodeData | null) => void,
  setIsPanelOpen: (isOpen: boolean) => void,
  layout: cytoscape.LayoutOptions
): () => void {
  // Validate input data
  if (!container || !data.nodes || !data.relationships) {
    console.error('Invalid input for graph initialization');
    return () => {};
  }

  // Check if there's an existing instance
  if (container.__cy) {
    container.__cy.destroy();
  }

  // Set container dimensions explicitly - required for proper Cytoscape initialization
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;

  // Transform data for Cytoscape
  const elements = {
    nodes: data.nodes.map(node => ({
      data: {
        id: node.id,
        type: node.type,
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
    // Initialize Cytoscape
    const cy = cytoscape({
      container,
      elements,
      style: [
        // Base node style first
        {
          selector: 'node',
          style: {
            'background-color': (ele) => {
              const nodeType = ele.data('type') as keyof typeof NODE_COLORS;
              return NODE_COLORS[nodeType] || '#cccccc';
            },
            'width': 30,
            'height': 30,
            'shape': 'ellipse',
            'border-width': 2,
            'border-color': '#333'
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
            'curve-style': 'bezier'
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
            'text-rotation': 'autorotate'
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
              const nodeType = ele.data('type') as keyof typeof NODE_COLORS;
              return NODE_COLORS[nodeType] || '#cccccc';
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
        }
      ],
      layout: layout
    });

    // Store the instance on the container
    container.__cy = cy;

    // Initialize edge handles
    const eh = cy.edgehandles({
      snap: true,
      noEdgeEventsInDraw: true,
      disableBrowserGestures: true,
      handleNodes: 'node',
      handlePosition: () => 'middle top',
      handleInDrawMode: false,
      edgeType: () => 'flat',
      loopAllowed: () => false,
      edgeParams: (sourceNode, targetNode) => ({
        data: {
          id: `${sourceNode.id()}-${targetNode.id()}`,
          source: sourceNode.id(),
          target: targetNode.id(),
        },
        classes: 'eh-preview'
      }),
      complete: (sourceNode, targetNode, addedEles) => {
        // Remove the temporary edge
        addedEles.remove();
        
        // Create new edge with proper data structure
        cy.add({
          group: 'edges',
          data: {
            id: `${sourceNode.id()}-${targetNode.id()}`,
            source: sourceNode.id(),
            target: targetNode.id(),
            relationType: 'connected_to'
          }
        });

        console.log('Edge created:', {
          source: sourceNode.id(),
          target: targetNode.id()
        });
      }
    });

    // Store the edgehandles instance
    container.ehInstance = eh;

    // Function to lock all nodes
    const lockNodes = () => {
      cy.nodes().ungrabify();
      // Enable edge handles when nodes are locked
      if (container.ehInstance) {
        container.ehInstance.enableDrawMode();
      }
    };

    // Function to unlock all nodes
    const unlockNodes = () => {
      cy.nodes().grabify();
      // Disable edge handles when nodes are unlocked
      if (container.ehInstance) {
        container.ehInstance.disableDrawMode();
      }
    };

    // Update click handlers
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeId = node.id();
      
      const nodeData = data.nodes.find(n => n.id === nodeId);
      if (nodeData) {
        const completeNodeData: NodeData = {
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
      
      // Reset styles
      cy.elements().removeClass('highlighted faded selected');
      
      // Highlight selected node and its connections
      node.addClass('selected');
      node.neighborhood().addClass('highlighted');
      cy.elements().not(node.neighborhood()).not(node).addClass('faded');
    });

    // Background click handler
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onClose();
        cy.elements().removeClass('highlighted faded selected');
        unlockNodes();
      }
    });

    // Add cleanup function
    container.unlockNodes = unlockNodes;

    // Replace the zoom handlers with animated viewport-centered zoom
    const zoomIn = () => {
      cy.animate({
        zoom: cy.zoom() * 1.3,
        duration: 200
      });
    };

    const zoomOut = () => {
      cy.animate({
        zoom: cy.zoom() * 0.7,
        duration: 200
      });
    };

    document.getElementById('zoom-in')?.addEventListener('click', zoomIn);
    document.getElementById('zoom-out')?.addEventListener('click', zoomOut);

    return () => {
      if (container.__cy) {
        document.getElementById('zoom-in')?.removeEventListener('click', zoomIn);
        document.getElementById('zoom-out')?.removeEventListener('click', zoomOut);
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
