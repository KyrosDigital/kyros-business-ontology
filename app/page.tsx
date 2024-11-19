'use client';

import { Legend } from '@/components/ui/legend';
import { AiChat } from '@/components/ui/ai-chat';
import { NodePanel } from '@/components/ui/node-panel';
import { OntologyTable } from "@/components/ui/ontology-table"
import { NodesCategoryPanel } from '@/components/ui/nodes-category-panel';
import { LayoutSelect } from '@/components/ui/layout-select';
import { RelationshipPanel } from '@/components/ui/relationship-panel';
import { Graph } from '@/components/ui/graph';
import { GraphProvider, useGraph } from '@/contexts/GraphContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreateNodeModal } from '@/components/ui/create-node-modal';

function HomeContent() {
  const {
    selectedType,
    selectedNode,
    isPanelOpen,
    viewMode,
    ontologyData,
    selectedRelationship,
    setSelectedRelationship,
    setViewMode,
    setCurrentLayout,
    handleLegendClick,
    handleClosePanel,
    handleCreateNode,
    handleUpdateNode,
    handleDeleteNode,
    handleCreateRelationship,
    handleUpdateRelationType,
    handleDeleteRelationship,
    refreshNode,
    refreshGraph,
  } = useGraph();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Legend
        selectedType={selectedType}
        onLegendClick={handleLegendClick}
        viewMode={viewMode}
        onViewModeChange={(checked) => setViewMode(checked ? 'table' : 'graph')}
        setIsCreateModalOpen={setIsCreateModalOpen}
      />

      <CreateNodeModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {viewMode === 'graph' && (
        <LayoutSelect onLayoutChange={setCurrentLayout} />
      )}

      {viewMode === 'graph' ? (
        <Graph />
      ) : (
        <div className="p-4 mt-16 ml-72 h-[calc(100vh-5rem)] w-[calc(100vw-20rem)]">
          {ontologyData && <OntologyTable data={ontologyData} />}
        </div>
      )}

      <NodesCategoryPanel 
        isPanelOpen={isPanelOpen && !selectedNode}
        selectedNode={selectedNode}
        selectedType={selectedType}
        nodes={ontologyData?.nodes ?? []}
        onClose={handleClosePanel}
        onUpdateNode={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
        onCreateRelationship={handleCreateRelationship}
        onCreateNode={handleCreateNode}
      />

      <NodePanel 
        isPanelOpen={isPanelOpen && !!selectedNode}
        selectedNode={selectedNode}
        onClose={handleClosePanel}
        onCreateNode={handleCreateNode}
        refreshNode={refreshNode}
        onNodeUpdate={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
        refreshGraph={refreshGraph}
      />

      <RelationshipPanel 
        isPanelOpen={!!selectedRelationship}
        sourceNode={selectedRelationship?.sourceNode ?? null}
        targetNode={selectedRelationship?.targetNode ?? null}
        relationType={selectedRelationship?.relationType ?? ''}
        onClose={() => setSelectedRelationship(null)}
        onUpdateRelationType={handleUpdateRelationType}
        onDeleteRelationship={handleDeleteRelationship}
      />

      <AiChat ontologyData={ontologyData} />
    </div>
  );
}

export default function Home() {
  return (
    <GraphProvider>
      <HomeContent />
    </GraphProvider>
  );
}