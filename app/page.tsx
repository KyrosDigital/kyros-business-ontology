'use client';

import { useEffect, useState } from 'react';
import { Ontology } from '@prisma/client';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { useRouter } from 'next/navigation';

interface OntologyWithCounts extends Ontology {
  _count: {
    nodes: number;
    relationships: number;
  };
}

interface OntologyListItemProps {
  ontology: OntologyWithCounts;
}

const OntologyListItem = ({ ontology }: OntologyListItemProps) => {
  const router = useRouter();

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
      <CardFooter className="flex justify-end">
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOntologies = async () => {
      try {
        const response = await fetch('/api/v1/ontologies');
        if (!response.ok) {
          throw new Error('Failed to fetch ontologies');
        }
        const data = await response.json();
        setOntologies(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchOntologies();
  }, []);

  if (loading) {
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
        <h1 className="text-3xl font-bold">Your Ontologies</h1>
        <Button onClick={() => router.push('/ontologies/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New
        </Button>
      </div>

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
              onClick={() => router.push('/ontologies/new')}
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
            <OntologyListItem key={ontology.id} ontology={ontology} />
          ))}
        </div>
      )}
    </div>
  );
} 