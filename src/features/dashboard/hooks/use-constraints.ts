'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getConstraintsAction,
  createConstraintAction,
  deleteConstraintAction,
  updateConstraintAction,
} from '@/app/actions/constraints.actions';
import { constraintKeys } from '../services/dashboard.service';

/**
 * Hook to fetch all active constraints
 */
export function useConstraints() {
  return useQuery({
    queryKey: constraintKeys.all,
    queryFn: async () => {
      const result = await getConstraintsAction();
      if (!result.success) throw new Error(result.error);
      return result.constraints;
    },
    staleTime: 0, // Always fetch fresh data after mutations
  });
}

/**
 * Hook to add a new constraint
 */
export function useAddConstraint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: 'point' | 'vertical_sum';
      config: Record<string, unknown>;
      description?: string;
      priority?: number;
    }) => {
      const result = await createConstraintAction(data);
      if (!result.success) throw new Error(result.error);
      return result.constraint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: constraintKeys.all });
      toast.success('Constraint added successfully!');
    },
    onError: (err) => {
      toast.error('Failed to add constraint: ' + err.message);
    },
  });
}

/**
 * Hook to delete a constraint
 */
export function useDeleteConstraint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteConstraintAction(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: constraintKeys.all });
      toast.success('Constraint deleted');
    },
    onError: (err) => {
      toast.error('Failed to delete constraint: ' + err.message);
    },
  });
}

/**
 * Hook to update an existing constraint
 */
export function useUpdateConstraint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      type?: string;
      config?: Record<string, unknown>;
      description?: string;
      priority?: number;
      isRequired?: boolean;
    }) => {
      const { id, ...updateData } = data;
      const result = await updateConstraintAction(id, updateData);
      if (!result.success) throw new Error(result.error);
      return result.constraint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: constraintKeys.all });
      toast.success('Constraint updated successfully!');
    },
    onError: (err) => {
      toast.error('Failed to update constraint: ' + err.message);
    },
  });
}
