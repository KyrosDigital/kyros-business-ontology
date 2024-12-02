'use client';

import { useState, useEffect } from 'react';
import { Ontology } from '@prisma/client';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { PlusCircle, Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { CreateOntologyModal } from '@/components/ui/create-ontology-modal';

interface OntologyWithCounts extends Ontology {
  _count: {
    nodes: number;
    relationships: number;
  };
}

const LoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-1/3 bg-muted rounded"></div>
            <div className="h-4 w-2/3 bg-muted rounded mt-2"></div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <div className="h-10 w-24 bg-muted rounded"></div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

interface OntologyListItemProps {
  ontology: OntologyWithCounts;
  onDelete: (updatedOntologies: OntologyWithCounts[]) => void;
}

const OntologyListItem = ({ ontology, onDelete }: OntologyListItemProps) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this ontology?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/v1/ontology/${ontology.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete ontology');
      }

      const { updatedOntologies } = await response.json();
      onDelete(updatedOntologies);
    } catch (error) {
      console.error('Error deleting ontology:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete ontology');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewGraph = () => {
    setIsNavigating(true);
    router.push(`/ontology-graph/${ontology.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>{ontology.name}</CardTitle>
        {ontology.description && (
          <CardDescription>{ontology.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Created: {new Date(ontology.createdAt).toLocaleDateString()}</span>
          <span>Nodes: {ontology._count.nodes}</span>
          <span>Relationships: {ontology._count.relationships}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting || isNavigating}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
        <Button
          onClick={handleViewGraph}
          disabled={isNavigating}
        >
          {isNavigating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'View Graph'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

interface OntologyListProps {
  organizationId: string;
}

export function OntologyList({ organizationId }: OntologyListProps) {
  const [ontologies, setOntologies] = useState<OntologyWithCounts[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOntologies = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/ontology/list?organizationId=${organizationId}`);
        if (!response.ok) throw new Error('Failed to fetch ontologies');
        const data = await response.json();
        setOntologies(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchOntologies();
  }, [organizationId]);

  const handleCreateOntology = async (data: { name: string; description: string }) => {
    try {
      const response = await fetch(`/api/v1/ontology/new?organizationId=${organizationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create ontology');
      }

      const newOntology = await response.json();
      setOntologies(prev => [newOntology, ...prev]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating ontology:', error);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Ontologies</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New
        </Button>
      </div>

      <CreateOntologyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateOntology}
      />

      {ontologies.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No ontologies found</CardTitle>
            <CardDescription>
              Get started by creating your first ontology
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="outline"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Ontology
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-4">
          {ontologies.map((ontology) => (
            <OntologyListItem 
              key={ontology.id} 
              ontology={ontology} 
              onDelete={setOntologies}
            />
          ))}
        </div>
      )}
    </div>
  );
} 