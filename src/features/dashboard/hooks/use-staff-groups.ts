import { useQuery } from '@tanstack/react-query'
import { staffGroupKeys } from '../services/dashboard.service'

export interface StaffGroup {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  memberCount: number
  createdAt: Date
  updatedAt: Date
}

async function fetchStaffGroups(): Promise<StaffGroup[]> {
  const response = await fetch('/api/staff-groups')
  if (!response.ok) {
    throw new Error('Failed to fetch staff groups')
  }
  return response.json()
}

export function useStaffGroups() {
  return useQuery({
    queryKey: staffGroupKeys.lists(),
    queryFn: fetchStaffGroups,
  })
}
