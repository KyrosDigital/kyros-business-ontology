'use client';

import { useState } from 'react';
import { useCustomNodeTypes } from '@/contexts/CustomNodeTypeContext';
import { DashboardNav } from "@/components/ui/dashboard-nav";
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Form validation schema
const nodeTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  hexColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
});

type NodeTypeFormData = z.infer<typeof nodeTypeSchema>;

export default function NodeTypesPage() {
  const { nodeTypes, isLoading, createNodeType, updateNodeType, deprecateNodeType } = useCustomNodeTypes();
  const { organization } = useOrganization();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNodeType, setEditingNodeType] = useState<{ id: string; data: NodeTypeFormData } | null>(null);

  const createForm = useForm<NodeTypeFormData>({
    resolver: zodResolver(nodeTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      hexColor: '#000000',
    },
  });

  const editForm = useForm<NodeTypeFormData>({
    resolver: zodResolver(nodeTypeSchema),
  });

  const onCreateSubmit = async (data: NodeTypeFormData) => {
    try {
      await createNodeType(data);
      setIsCreateOpen(false);
      createForm.reset();
    } catch (error) {
      // Error handling is done in context
    }
  };

  const onEditSubmit = async (data: NodeTypeFormData) => {
    if (!editingNodeType) return;
    
    try {
      await updateNodeType(editingNodeType.id, data);
      setEditingNodeType(null);
    } catch (error) {
      // Error handling is done in context
    }
  };

  const handleDeprecate = async (id: string) => {
    try {
      await deprecateNodeType(id);
    } catch (error) {
      // Error handling is done in context
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 border-r bg-background p-6">
          <DashboardNav />
        </div>
        <div className="flex-1 p-6">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="w-64 border-r bg-background p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Node Types</h2>
          {organization && (
            <p className="text-sm text-muted-foreground">
              {organization.name}
            </p>
          )}
        </div>
        <DashboardNav />
      </div>
      <div className="flex-1 p-6 pt-16">
        <div className="max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Node Types</h1>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Node Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Node Type</DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="hexColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input type="color" {...field} className="w-20" />
                              <Input {...field} placeholder="#000000" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Create</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>System Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodeTypes.map((nodeType) => (
                <TableRow key={nodeType.id}>
                  <TableCell>
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: nodeType.hexColor }}
                    />
                  </TableCell>
                  <TableCell>{nodeType.name}</TableCell>
                  <TableCell>{nodeType.description}</TableCell>
                  <TableCell>{nodeType.isSystem ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    {!nodeType.isSystem && (
                      <div className="flex justify-end gap-2">
                        <Dialog
                          open={editingNodeType?.id === nodeType.id}
                          onOpenChange={(open) => !open && setEditingNodeType(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setEditingNodeType({
                                  id: nodeType.id,
                                  data: {
                                    name: nodeType.name,
                                    description: nodeType.description || '',
                                    hexColor: nodeType.hexColor,
                                  },
                                });
                                editForm.reset({
                                  name: nodeType.name,
                                  description: nodeType.description || '',
                                  hexColor: nodeType.hexColor,
                                });
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Node Type</DialogTitle>
                            </DialogHeader>
                            <Form {...editForm}>
                              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                                <FormField
                                  control={editForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="hexColor"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Color</FormLabel>
                                      <FormControl>
                                        <div className="flex gap-2">
                                          <Input type="color" {...field} className="w-20" />
                                          <Input {...field} placeholder="#000000" />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit">Save Changes</Button>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will deprecate the node type "{nodeType.name}". 
                                This action cannot be undone. Existing nodes using 
                                this type will not be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeprecate(nodeType.id)}
                              >
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
