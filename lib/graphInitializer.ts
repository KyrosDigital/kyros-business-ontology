import cytoscape from 'cytoscape';
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
};

type Link = {
  id: string;
  source: Node;
  target: Node;
  relationType: string;
};

export const initializeGraph = (
  container: HTMLElement,
  width: number,
  height: number,
  data: { nodes: Node[], relationships: Link[] },
  handleClosePanel: () => void,
  setSelectedNodeId: (id: string | null) => void,
  setSelectedNode: (node: Node | null) => void,
  setIsPanelOpen: (open: boolean) => void,
  selectedNodeId: string | null,
  layoutConfig: any
) => {
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
            'background-color': (ele) => NODE_COLORS[ele.data('type')],
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
            'background-color': (ele) => NODE_COLORS[ele.data('type')],
          }
        }
      ],
      layout: layoutConfig
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
      const fullNodeData = data.nodes.find(n => n.id === nodeData.id);
      setSelectedNode(fullNodeData);
      setSelectedNodeId(nodeData.id);
      setIsPanelOpen(true);
    });

    // Background click handler
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        handleClosePanel();
        cy.elements().removeClass('highlighted faded selected');
      }
    });

    // Add zoom handlers
    const zoomIn = () => cy.zoom(cy.zoom() * 1.3);
    const zoomOut = () => cy.zoom(cy.zoom() * 0.7);

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
};
