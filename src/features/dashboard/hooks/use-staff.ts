'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getStaffAction, createStaffAction, deleteStaffAction } from '@/app/actions/staff.actions'
import { staffKeys } from '../services/dashboard.service'

/**
 * Hook to fetch all active staff members
 */
export function useStaff() {
  return useQuery({
    queryKey: staffKeys.all,
    queryFn: async () => {
      const result = await getStaffAction()
      if (!result.success) throw new Error(result.error)
      return result.staff
    },
    staleTime: 0, // Always fetch fresh data after mutations
  })
}

/**
 * Hook to add a new staff member with optimistic updates (FN/ADM/STF/007 extended)
 */
export function useAddStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      employeeId: string
      email?: string
      gender?: 'F' | 'M'
      roleIds?: string[]
      monthlyMinHours?: number
      monthlyMaxHours?: number
    }) => {
      const result = await createStaffAction(data)
      if (!result.success) throw new Error(result.error)
      return result.staff
    },
    onMutate: async (newStaff) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: staffKeys.all })

      // Snapshot the previous value
      const previous = queryClient.getQueryData(staffKeys.all)

      // Optimistically update to the new value
      queryClient.setQueryData(staffKeys.all, (old: any[]) => {
        if (!old) return old
        return [
          ...old,
          {
            ...newStaff,
            id: 'temp-' + Date.now(),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
      })

      return { previous }
    },
    onError: (err, newStaff, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(staffKeys.all, context.previous)
      }
      toast.error('Failed to add staff: ' + err.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      toast.success('Staff added successfully!')
    },
  })
}

/**
 * Hook to delete a staff member
 */
export function useDeleteStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteStaffAction(id)
      if (!result.success) throw new Error(result.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      toast.success('Staff deleted')
    },
    onError: (err) => {
      toast.error('Failed to delete staff: ' + err.message)
    },
  })
}
