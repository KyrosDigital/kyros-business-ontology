'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Building } from 'lucide-react';

export function OrganizationSelector() {
  const { user } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrganizations() {
      if (!user) return;
      
      try {
        const memberships = await user.getOrganizationMemberships();
        setOrganizations(memberships);
      } catch (error) {
        console.error('Error loading organizations:', error);
      } finally {
        setLoading(false);
      }
    }

    loadOrganizations();
  }, [user]);

  const selectOrganization = async (orgId: string) => {
    try {
      await clerk.setActive({ organization: orgId });
      router.push('/dashboard'); // Redirect to dashboard after selection
    } catch (error) {
      console.error('Error setting active organization:', error);
    }
  };

  if (loading) {
    return <div>Loading organizations...</div>;
  }

  return (
    <div className="container max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
          <CardDescription>
            Choose an organization to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {organizations.map((org) => (
            <Button
              key={org.organization.id}
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => selectOrganization(org.organization.id)}
            >
              <Building className="h-4 w-4" />
              {org.organization.name}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
} 