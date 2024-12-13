'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CustomNodeType } from '@prisma/client';
import { useOrganization } from './OrganizationContext';
import { toast } from 'sonner';

interface CustomNodeTypeContextType {
  nodeTypes: CustomNodeType[];
  isLoading: boolean;
  createNodeType: (data: { name: string; description?: string; hexColor: string }) => Promise<void>;
  updateNodeType: (id: string, data: { name?: string; description?: string; hexColor?: string }) => Promise<void>;
  deprecateNodeType: (id: string) => Promise<void>;
  refreshNodeTypes: () => Promise<void>;
}

const CustomNodeTypeContext = createContext<CustomNodeTypeContextType | undefined>(undefined);

interface CustomNodeTypeProviderProps {
  children: ReactNode;
}

export function CustomNodeTypeProvider({ children }: CustomNodeTypeProviderProps) {
  const [nodeTypes, setNodeTypes] = useState<CustomNodeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useOrganization();

  const refreshNodeTypes = async () => {
    if (!organization) return;
    
    try {
      const response = await fetch('/api/v1/custom-node-types');
      if (!response.ok) throw new Error('Failed to fetch node types');
      const types = await response.json();
      setNodeTypes(types);
    } catch (error) {
      console.error('Error fetching node types:', error);
      toast.error('Failed to load node types');
    }
  };

  useEffect(() => {
    if (organization) {
      setIsLoading(true);
      refreshNodeTypes()
        .finally(() => setIsLoading(false));
    }
  }, [organization]);

  const createNodeType = async (data: { name: string; description?: string; hexColor: string }) => {
    if (!organization) return;

    try {
      const response = await fetch('/api/v1/custom-node-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      await refreshNodeTypes();
      toast.success('Node type created successfully');
    } catch (error) {
      console.error('Error creating node type:', error);
      toast.error('Failed to create node type');
      throw error;
    }
  };

  const updateNodeType = async (
    id: string,
    data: { name?: string; description?: string; hexColor?: string }
  ) => {
    try {
      const response = await fetch(`/api/v1/custom-node-types/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      await refreshNodeTypes();
      toast.success('Node type updated successfully');
    } catch (error) {
      console.error('Error updating node type:', error);
      toast.error('Failed to update node type');
      throw error;
    }
  };

  const deprecateNodeType = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/custom-node-types/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      await refreshNodeTypes();
      toast.success('Node type deprecated successfully');
    } catch (error) {
      console.error('Error deprecating node type:', error);
      toast.error('Failed to deprecate node type');
      throw error;
    }
  };

  return (
    <CustomNodeTypeContext.Provider
      value={{
        nodeTypes,
        isLoading,
        createNodeType,
        updateNodeType,
        deprecateNodeType,
        refreshNodeTypes
      }}
    >
      {children}
    </CustomNodeTypeContext.Provider>
  );
}

export function useCustomNodeTypes() {
  const context = useContext(CustomNodeTypeContext);
  if (context === undefined) {
    throw new Error('useCustomNodeTypes must be used within a CustomNodeTypeProvider');
  }
  return context;
}
