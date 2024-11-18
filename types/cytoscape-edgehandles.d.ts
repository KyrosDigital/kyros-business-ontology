declare module 'cytoscape-edgehandles' {
  import { Core, NodeSingular, Collection } from 'cytoscape';

  interface EdgeHandlesInstance {
    enableDrawMode: () => void;
    disableDrawMode: () => void;
    destroy: () => void;
  }

  interface EdgeHandlesOptions {
    snap?: boolean;
    noEdgeEventsInDraw?: boolean;
    disableBrowserGestures?: boolean;
    handleNodes?: string;
    handlePosition?: (node: NodeSingular) => string;
    handleInDrawMode?: boolean;
    edgeType?: (sourceNode: NodeSingular, targetNode: NodeSingular) => string;
    loopAllowed?: (node: NodeSingular) => boolean;
    edgeParams?: (sourceNode: NodeSingular, targetNode: NodeSingular) => {
      data: {
        id: string;
        source: string;
        target: string;
      };
      classes?: string;
    };
    complete?: (sourceNode: NodeSingular, targetNode: NodeSingular, addedElements: Collection) => void;
    stop?: (sourceNode: NodeSingular) => void;
    start?: (sourceNode: NodeSingular) => void;
    cancel?: (sourceNode: NodeSingular, targetNode: NodeSingular) => void;
    hoverOver?: (sourceNode: NodeSingular, targetNode: NodeSingular) => void;
    hoverOut?: (sourceNode: NodeSingular, targetNode: NodeSingular) => void;
  }

  interface EdgeHandlesExtension {
    (options?: EdgeHandlesOptions): EdgeHandlesInstance;
  }

  const extension: (cy: Core) => void;
  export default extension;
} 