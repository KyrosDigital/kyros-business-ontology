import cytoscape from 'cytoscape';
import { NodeData, OntologyData } from '@/types/graph';
import { NODE_COLORS } from '@/components/ui/legend';

declare global {
  interface HTMLDivElement {
    __cy?: cytoscape.Core;
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
        label: node.name,
      }
    })),
    edges: data.relationships.map(rel => ({
      data: {
        id: rel.id,
        source: rel.source.id,
        target: rel.target.id,
        label: rel.relationType
      }
    }))
  };

  try {
    // Initialize Cytoscape
    const cy = cytoscape({
      container,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => NODE_COLORS[ele.data('type') as keyof typeof NODE_COLORS],
            'label': 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '12px',
            'width': 30,
            'height': 30,
            'border-width': 2,
            'border-color': '#333',
            'text-background-color': 'white',
            'text-background-opacity': 0.8,
            'text-background-padding': '3px'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#cccccc',
            'target-arrow-color': '#cccccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'text-background-color': 'white',
            'text-background-opacity': 0.9,
            'text-background-padding': '3px',
            'font-size': '11px',
            'text-rotation': 'autorotate'
          }
        },
        {
          selector: '.highlighted',
          style: {
            'opacity': 1
          }
        },
        {
          selector: '.faded',
          style: {
            'opacity': 0.2
          }
        },
        {
          selector: '.selected',
          style: {
            'border-width': 4,
            'border-color': '#000',
            'border-opacity': 0.8,
            'background-color': (ele) => NODE_COLORS[ele.data('type') as keyof typeof NODE_COLORS],
          }
        }
      ],
      layout: layout
    });

    // Store the instance on the container
    container.__cy = cy;

    // Update click handlers to use fetchNodeDetails
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeId = node.id();
      
      // Find the node data directly from the provided data
      const nodeData = data.nodes.find(n => n.id === nodeId);
      if (nodeData) {
        setSelectedNode(nodeData);
        setSelectedNodeId(nodeId);
        setIsPanelOpen(true);
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
      }
    });

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
        container.__cy.destroy();
        delete container.__cy;
      }
    };
  } catch (error) {
    console.error('Error during Cytoscape initialization:', error);
    return () => {};
  }
}
