'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSignIn } from '@clerk/clerk-react'
import { Organization } from '@prisma/client';


interface OrganizationContextType {
  organization: Organization | null;
  isLoading: boolean;
  error: string | null;
  setOrganization: (org: Organization | null) => void;
  fetchOrganization: (userId: string) => Promise<void>;
  clearOrganization: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
	const { isLoaded, setActive } = useSignIn()

	// Set the active organization when the organization is loaded
	useEffect(() => {
		if (organization && isLoaded) {
			setActive({ organization: organization.clerkId })
		}
	}, [organization, isLoaded])

  const fetchOrganization = async (clerkUserId: string) => {
    if (isLoading || organization) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/organization/fetch?clerkUserId=${clerkUserId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch organization');
      }
      const data = await response.json();
      setOrganization(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organization');
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearOrganization = () => {
    setOrganization(null);
    setError(null);
    setIsLoading(false);
  };

  const value = React.useMemo(() => ({
    organization,
    isLoading,
    error,
    setOrganization,
    fetchOrganization,
    clearOrganization,
  }), [organization, isLoading, error]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
