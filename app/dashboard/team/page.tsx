'use client';

import { TeamManagement } from "@/components/ui/team-management";
import { DashboardNav } from "@/components/ui/dashboard-nav";
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from "@clerk/nextjs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect } from "react";

export default function TeamPage() {
  const { organization, fetchOrganization, clearOrganization } = useOrganization();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      clearOrganization();
    } else {
      fetchOrganization(user.id);
    }
  }, [user, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 border-r bg-background p-6">
          <DashboardNav />
        </div>
        <div className="flex-1 p-6">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 border-r bg-background p-6">
          <DashboardNav />
        </div>
        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Please Log In</CardTitle>
              <CardDescription>
                You need to be logged in to view and manage team members
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="w-64 border-r bg-background p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Team Management</h2>
          {organization && (
            <p className="text-sm text-muted-foreground">
              {organization.name}
            </p>
          )}
        </div>
        <DashboardNav />
      </div>
      <div className="flex-1 p-6">
        <div className="max-w-4xl">
          {organization && <TeamManagement />}
        </div>
      </div>
    </div>
  );
} 