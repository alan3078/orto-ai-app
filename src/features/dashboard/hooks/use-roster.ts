'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatMonthISO } from '@/lib/date-time.utils'
import { ShiftType } from '@/types/enums'
import { toast } from 'sonner'
import { generateRosterAction, getRosterAction } from '@/app/actions/generate-roster.action'
import { rosterKeys } from '../services/dashboard.service'

/**
 * Hook to fetch roster for a specific month with automatic polling during SOLVING
 * Returns roster data along with leaves for the period (FN/ADM/LVE/001)
 */
export function useRoster({ month }: { month: string }) {
  return useQuery({
    queryKey: rosterKeys.month(month),
    queryFn: async () => {
      const result = await getRosterAction({ month })
      if (!result.success) throw new Error(result.error)
      return {
        roster: result.roster,
        leaves: result.leaves || [],
      }
    },
    select: (data) => ({
      ...data.roster,
      leaves: data.leaves,
    }),
    refetchInterval: (query) => {
      // Poll every 2s if status is SOLVING
      const data = query.state.data
      // @ts-ignore - status exists on roster object but TS inference is tricky here
      return data?.status === 'SOLVING' ? 2000 : false
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
      shiftType?: ShiftType
    }) => {
      const result = await generateRosterAction(params)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: (data, variables) => {
      // Derive month in local time to avoid timezone drift (e.g. UTC ISO strings can shift back a day)
      const month = formatMonthISO(new Date(variables.startDate))
      queryClient.invalidateQueries({ queryKey: rosterKeys.month(month) })
      toast.success('Roster generation started!')
    },
    onError: (err: Error) => {
      toast.error('Failed to generate roster: ' + err.message)
    },
  })
}
