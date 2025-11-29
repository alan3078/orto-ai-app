'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Gender } from '@prisma/client'
import { toast } from 'sonner'
import { getStaffAction, createStaffAction, deleteStaffAction, toggleStaffActiveAction, getStaffWithFilterAction, updateStaffAction } from '@/app/actions/staff.actions'
import { staffKeys } from '../services/dashboard.service'
import type { Staff } from '@/types/staff'

export type StaffFilter = 'all' | 'active' | 'inactive'

/**
 * Hook to fetch all active staff members
 */
export function useStaff() {
  return useQuery<Staff[]>({
    queryKey: staffKeys.all,
    queryFn: async () => {
      const result = await getStaffAction()
      if (!result.success) throw new Error(result.error)
      return result.staff as Staff[]
    },
    staleTime: 0, // Always fetch fresh data after mutations
  })
}

/**
 * Hook to fetch staff members with filter (FN/ADM/STF/004)
 */
export function useStaffWithFilter(filter: StaffFilter = 'active') {
  return useQuery<Staff[]>({
    queryKey: [...staffKeys.all, filter],
    queryFn: async () => {
      const result = await getStaffWithFilterAction(filter)
      if (!result.success) throw new Error(result.error)
      return result.staff as Staff[]
    },
    staleTime: 0,
  })
}

/**
 * Hook to add a new staff member with optimistic updates (FN/ADM/STF/007 extended)
 * Now creates User + Staff together (1:1 relationship)
 */
export function useAddStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      email?: string
      rank?: string
      visibleId: string
      gender?: Gender
      roleIds?: string[]
      password?: string
    }) => {
      const result = await createStaffAction(data)
      if (!result.success) throw new Error(result.error)
      return result.staff
    },
    onMutate: async (newStaff) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: staffKeys.all })

      // Snapshot the previous value
      const previous = queryClient.getQueryData<Staff[]>(staffKeys.all)

      // Optimistically update to the new value
      queryClient.setQueryData<Staff[]>(staffKeys.all, (old) => {
        if (!old) return old
        const tempUserId = 'temp-user-' + Date.now()
        return [
          ...old,
          {
            id: 'temp-' + Date.now(),
            visibleId: newStaff.visibleId,
            rank: newStaff.rank || null,
            isActive: true,
            staffGroupId: null,
            gender: newStaff.gender || null,
            userId: tempUserId,
            user: {
              id: tempUserId,
              email: newStaff.email || null,
              name: newStaff.name,
              role: 'MEMBER' as const,
              isActive: true,
              deletedAt: null,
            },
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            staffRoles: [],
            staffGroup: null,
          },
        ]
      })

      return { previous }
    },
    onError: (err, _newStaff, context) => {
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

/**
 * Hook to update a staff member
 */
export function useUpdateStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      id: string
      name: string
      email?: string
      rank?: string
      visibleId: string
      gender?: Gender
      roleIds?: string[]
    }) => {
      const result = await updateStaffAction(data)
      if (!result.success) throw new Error(result.error)
      return result.staff
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      toast.success('Staff updated successfully!')
    },
    onError: (err) => {
      toast.error('Failed to update staff: ' + err.message)
    },
  })
}

/**
 * Hook to toggle staff active status (FN/ADM/STF/004)
 */
export function useToggleStaffActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await toggleStaffActiveAction(id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: staffKeys.all })

      // Snapshot the previous value for all filter variations
      const previousAll = queryClient.getQueryData<Staff[]>([...staffKeys.all, 'all'])
      const previousActive = queryClient.getQueryData<Staff[]>([...staffKeys.all, 'active'])
      const previousInactive = queryClient.getQueryData<Staff[]>([...staffKeys.all, 'inactive'])
      const previousDefault = queryClient.getQueryData<Staff[]>(staffKeys.all)

      // Optimistic update function
      const updateStaffList = (old: Staff[] | undefined) => {
        if (!old) return old
        return old.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s)
      }

      // Apply optimistic updates
      if (previousAll) queryClient.setQueryData([...staffKeys.all, 'all'], updateStaffList(previousAll))
      if (previousActive) queryClient.setQueryData([...staffKeys.all, 'active'], updateStaffList(previousActive))
      if (previousInactive) queryClient.setQueryData([...staffKeys.all, 'inactive'], updateStaffList(previousInactive))
      if (previousDefault) queryClient.setQueryData(staffKeys.all, updateStaffList(previousDefault))

      return { previousAll, previousActive, previousInactive, previousDefault }
    },
    onError: (err, _id, context) => {
      // Rollback on error
      if (context?.previousAll) queryClient.setQueryData([...staffKeys.all, 'all'], context.previousAll)
      if (context?.previousActive) queryClient.setQueryData([...staffKeys.all, 'active'], context.previousActive)
      if (context?.previousInactive) queryClient.setQueryData([...staffKeys.all, 'inactive'], context.previousInactive)
      if (context?.previousDefault) queryClient.setQueryData(staffKeys.all, context.previousDefault)
      toast.error('Failed to toggle staff status: ' + err.message)
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      toast.success(result.message)
    },
  })
}
