'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createLeaveAction,
  getLeavesAction,
  updateLeaveAction,
  deleteLeaveAction,
  getPublicHolidaysAction,
} from '@/app/actions/leave.actions';
import type { LeaveType, LeaveStatus } from '@/lib/leave.types';

// Query keys
export const leaveKeys = {
  all: ['leaves'] as const,
  list: (params: { startDate?: string; endDate?: string; staffId?: string }) =>
    [...leaveKeys.all, 'list', params] as const,
  holidays: (params: { startDate: string; endDate: string }) => ['publicHolidays', params] as const,
};

/**
 * Hook to fetch leaves with optional filters
 */
export function useLeaves(
  params: {
    startDate?: string;
    endDate?: string;
    staffId?: string;
    leaveType?: LeaveType;
    status?: LeaveStatus;
  } = {}
) {
  return useQuery({
    queryKey: leaveKeys.list(params),
    queryFn: async () => {
      const result = await getLeavesAction(params);
      if (!result.success) throw new Error(result.error);
      return result.leaves;
    },
  });
}

/**
 * Hook to fetch public holidays for a date range
 */
export function usePublicHolidays(params: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: leaveKeys.holidays(params),
    queryFn: async () => {
      const result = await getPublicHolidaysAction(params);
      if (!result.success) throw new Error(result.error);
      return result.holidays;
    },
    enabled: Boolean(params.startDate && params.endDate),
  });
}

/**
 * Hook to create a new leave
 */
export function useCreateLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      staffId: string;
      startDate: string;
      endDate: string;
      leaveType: LeaveType;
      status?: LeaveStatus;
      notes?: string;
    }) => {
      const result = await createLeaveAction(params);
      if (!result.success) throw new Error(result.error);
      return result.leave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      toast.success('Leave created successfully');
    },
    onError: (err: Error) => {
      toast.error('Failed to create leave: ' + err.message);
    },
  });
}

/**
 * Hook to update an existing leave
 */
export function useUpdateLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      startDate?: string;
      endDate?: string;
      leaveType?: LeaveType;
      status?: LeaveStatus;
      notes?: string;
    }) => {
      const result = await updateLeaveAction(params);
      if (!result.success) throw new Error(result.error);
      return result.leave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      toast.success('Leave updated successfully');
    },
    onError: (err: Error) => {
      toast.error('Failed to update leave: ' + err.message);
    },
  });
}

/**
 * Hook to delete a leave
 */
export function useDeleteLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteLeaveAction(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      toast.success('Leave deleted successfully');
    },
    onError: (err: Error) => {
      toast.error('Failed to delete leave: ' + err.message);
    },
  });
}
