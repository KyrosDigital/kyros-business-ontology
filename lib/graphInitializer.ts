import cytoscape from 'cytoscape';
import { NodeData, OntologyData } from '@/types/graph';
import { NODE_COLORS } from '@/components/ui/legend';

declare global {
  interface HTMLDivElement {
    __cy?: cytoscape.Core;
  }
}

export function initializeGraph(
  container: HTMLDivElement,
  width: number,
  height: number,
  data: OntologyData,
  onClose: () => void,
  setSelectedNodeId: (id: string | null) => void,
  setSelectedNode: (node: NodeData | null) => void,
  setIsPanelOpen: (isOpen: boolean) => void,
  selectedNodeId: string | null,
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

  // Transform data for Cytoscape
  const elements = {
    nodes: data.nodes.map(node => ({
      data: {
        ...node,
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

    // Add click handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = node.data();
      
      // Reset styles
      cy.elements().removeClass('highlighted faded selected');
      
      // Highlight selected node and its connections
      node.addClass('selected');
      node.neighborhood().addClass('highlighted');
      cy.elements().not(node.neighborhood()).not(node).addClass('faded');
      
      // Update React state
      const fullNodeData = data.nodes.find(n => n.id === nodeData.id) || null;
      setSelectedNode(fullNodeData);
      setSelectedNodeId(nodeData.id);
      setIsPanelOpen(true);
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
