'use server'

import { SolverIntegrationService } from '@/services/solver-integration.service'
import { prisma } from '@/lib/prisma'

export interface StaffInfo {
  employeeId: string
  name: string
  rank: string | null
}

/**
 * Server Action to validate an existing roster against its constraints
 * Part of FN/BE/ENG/002 - Roster Validator (Audit Mode)
 */
export async function validateRosterAction(rosterId: string) {
  try {
    const service = new SolverIntegrationService()
    const validationResult = await service.validateRoster(rosterId)

    // Fetch staff info for display (name, rank) - map employeeId to details
    const roster = await prisma.roster.findUnique({
      where: { id: rosterId },
      include: {
        shifts: {
          include: { staff: true },
        },
      },
    })

    const staffMap: Record<string, StaffInfo> = {}
    if (roster?.shifts) {
      for (const shift of roster.shifts) {
        if (!staffMap[shift.staff.employeeId]) {
          staffMap[shift.staff.employeeId] = {
            employeeId: shift.staff.employeeId,
            name: shift.staff.name,
            rank: shift.staff.rank,
          }
        }
      }
    }

    return {
      success: true as const,
      data: validationResult,
      staffMap,
    }
  } catch (error) {
    console.error('Validate roster error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null,
      staffMap: {},
    }
  }
}
