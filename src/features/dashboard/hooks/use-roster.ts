'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { generateRosterAction, getRosterAction } from '@/app/actions/generate-roster.action'
import { rosterKeys } from '../services/dashboard.service'

/**
 * Hook to fetch roster for a specific month with automatic polling during SOLVING
 */
export function useRoster({ month }: { month: string }) {
  return useQuery({
    queryKey: rosterKeys.month(month),
    queryFn: async () => {
      const result = await getRosterAction({ month })
      if (!result.success) throw new Error(result.error)
      return result.roster
    },
    refetchInterval: (query) => {
      // Poll every 2s if status is SOLVING
      const roster = query.state.data
      return roster?.status === 'SOLVING' ? 2000 : false
    },
    staleTime: 0, // Always fetch fresh data
  })
}

/**
 * Hook to generate a new roster
 */
export function useGenerateRoster() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      name: string
      startDate: string
      timeSlots: number
      staffIds: string[]
      constraintIds: string[]
      shiftType?: 'APN' | 'DAY_NIGHT'
    }) => {
      const result = await generateRosterAction(params)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: (data, variables) => {
      // Derive month in local time to avoid timezone drift (e.g. UTC ISO strings can shift back a day)
      const month = format(new Date(variables.startDate), 'yyyy-MM')
      queryClient.invalidateQueries({ queryKey: rosterKeys.month(month) })
      toast.success('Roster generation started!')
    },
    onError: (err: Error) => {
      toast.error('Failed to generate roster: ' + err.message)
    },
  })
}
