'use client';

import { useEffect, useState } from 'react';
import { Ontology } from '@prisma/client';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { useRouter } from 'next/navigation';
import { CreateOntologyModal } from '@/components/ui/create-ontology-modal';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from "@clerk/nextjs";

interface OntologyWithCounts extends Ontology {
  _count: {
    nodes: number;
    relationships: number;
  };
}

interface OntologyListItemProps {
  ontology: OntologyWithCounts;
}

const OntologyListItem = ({ ontology, onDelete }: OntologyListItemProps & { onDelete: (updatedOntologies: OntologyWithCounts[]) => void }) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

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
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
        <Button
          onClick={() => router.push(`/ontology-graph/${ontology.id}`)}
        >
          View Graph
        </Button>
      </CardFooter>
    </Card>
  );
};

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

export default function OntologiesPage() {
  const [ontologies, setOntologies] = useState<OntologyWithCounts[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { organization, fetchOrganization, clearOrganization } = useOrganization();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      clearOrganization();
      setOntologies([]);
      setError(null);
    } else {
      fetchOrganization(user.id);
    }
  }, [user, isLoaded]);

  useEffect(() => {
    const fetchOntologies = async () => {
      if (!organization || !user) {
        return;
      }

      setLoading(true);
      try {
        const ontologiesResponse = await fetch(`/api/v1/ontology/list?organizationId=${organization.id}`);
        if (!ontologiesResponse.ok) {
          throw new Error('Failed to fetch ontologies');
        }
        const ontologiesData = await ontologiesResponse.json();
        setOntologies(ontologiesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchOntologies();
  }, [organization?.id, user]);

  const handleCreateOntology = async (data: { name: string; description: string }) => {
    try {
      const response = await fetch('/api/v1/ontology/new', {
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
      
      // Update the local state with the new ontology
      setOntologies(prev => [newOntology, ...prev]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating ontology:', error);
      // You might want to show an error toast or message here
    }
  };

  const handleOntologyDelete = (updatedOntologies: OntologyWithCounts[]) => {
    setOntologies(updatedOntologies);
  };

  if (!isLoaded || loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Your Ontologies</h1>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New
          </Button>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Your Ontologies</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Please Log In</CardTitle>
            <CardDescription>
              You need to be logged in to view and manage ontologies
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Your Ontologies</h1>
          {organization && (
            <p className="text-muted-foreground">
              Organization: {organization.name}
            </p>
          )}
        </div>
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
              onDelete={handleOntologyDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
} 