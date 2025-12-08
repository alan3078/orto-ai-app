'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllRolesAction,
  createRoleAction,
  updateRoleAction,
  toggleRoleActiveAction,
  deleteRoleAction,
} from '@/app/actions/role.actions';
import { RoleDialog } from './role-dialog';

export function RoleManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{
    id: string;
    name: string;
    order: number;
  } | null>(null);

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const result = await getAllRolesAction();
      if (!result.success) throw new Error(result.error);
      return result.roles;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; order: number }) => {
      const result = await createRoleAction(data);
      if (!result.success) throw new Error(result.error);
      return result.role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created successfully');
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; order?: number } }) => {
      const result = await updateRoleAction(id, data);
      if (!result.success) throw new Error(result.error);
      return result.role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated successfully');
      setDialogOpen(false);
      setEditingRole(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await toggleRoleActiveAction(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role status updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteRoleAction(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleEdit = (role: { id: string; name: string; order: number }) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleDelete = (role: { id: string; name: string; _count: { staffRoles: number } }) => {
    if (role._count.staffRoles > 0) {
      toast.error(
        `Cannot delete: ${role._count.staffRoles} staff member(s) assigned to ${role.name}`
      );
      return;
    }
    if (confirm(`Delete role "${role.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(role.id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingRole(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className='flex justify-between items-center'>
            <span>Roles</span>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setEditingRole(null);
                setDialogOpen(true);
              }}
            >
              <Plus className='h-4 w-4 mr-1' />
              Add Role
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='space-y-2'>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          ) : !roles || roles.length === 0 ? (
            <p className='text-sm text-muted-foreground text-center py-8'>
              No roles found. Create one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Staff Count</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className='font-mono font-bold'>{role.order}</TableCell>
                    <TableCell className='font-medium'>{role.name}</TableCell>
                    <TableCell>
                      <Badge variant={role.isActive ? 'default' : 'secondary'}>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{role._count.staffRoles}</TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-1'>
                        <Button
                          size='icon'
                          variant='ghost'
                          onClick={() => handleEdit(role)}
                          disabled={updateMutation.isPending}
                        >
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button
                          size='icon'
                          variant='ghost'
                          onClick={() => toggleMutation.mutate(role.id)}
                          disabled={toggleMutation.isPending}
                        >
                          {role.isActive ? (
                            <PowerOff className='h-4 w-4 text-orange-500' />
                          ) : (
                            <Power className='h-4 w-4 text-green-500' />
                          )}
                        </Button>
                        <Button
                          size='icon'
                          variant='ghost'
                          onClick={() => handleDelete(role)}
                          disabled={deleteMutation.isPending || role._count.staffRoles > 0}
                        >
                          <Trash2
                            className={`h-4 w-4 ${
                              role._count.staffRoles > 0
                                ? 'text-muted-foreground'
                                : 'text-destructive'
                            }`}
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RoleDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        role={editingRole}
        onSubmit={(data) => {
          if (editingRole) {
            updateMutation.mutate({ id: editingRole.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}
