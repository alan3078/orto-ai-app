'use server'

import { SolverIntegrationService } from '@/services/solver-integration.service'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { fetchSystemPolicies, buildSystemConstraints, buildResourceAttributes } from '@/features/engine/mapper'

/**
 * Server Action to generate a new roster
 * Accepts parameters directly from client components
 */
export async function generateRosterAction(params: {
  name: string
  startDate: string
  timeSlots: number
  staffIds: string[]
  constraintIds: string[]
  shiftType?: 'APN' | 'DAY_NIGHT'
}) {
  try {
    const { name, startDate, timeSlots, staffIds, constraintIds, shiftType = 'APN' } = params

    // Fetch system policies and build system constraints
    const systemPolicies = await fetchSystemPolicies({
      includeGlobal: true,
      includeRoster: true,
    })

    const staff = await prisma.staff.findMany({
      where: { id: { in: staffIds }, isActive: true },
      select: {
        employeeId: true,
        gender: true,
        monthlyMaxHours: true,
        staffRoles: {
          include: { role: true },
          orderBy: { role: { order: 'asc' } },
        },
      },
    })

    // Determine available states based on shift type
    // APN: 0=Off, 1=Afternoon, 2=PM, 3=Night
    // DAY_NIGHT: 0=Off, 1=Day, 2=Night
    const availableStates = shiftType === 'APN' ? [0, 1, 2, 3] : [0, 1, 2]
    const systemConstraints = await buildSystemConstraints(systemPolicies, staff, availableStates)

    // Build resource attributes (FN/ADM/STF/007)
    const resourceAttributes = buildResourceAttributes(staff)

    const service = new SolverIntegrationService()

    const result = await service.generateRoster(
      name,
      new Date(startDate),
      timeSlots,
      staffIds,
      constraintIds,
      systemConstraints,
      resourceAttributes,
      shiftType
    )

    revalidatePath('/roster-management')
    revalidatePath('/test-roster')
    revalidatePath(`/test-roster/${result.rosterId}`)

    return {
      success: true as const,
      rosterId: result.rosterId,
      status: result.status,
    }
  } catch (error) {
    console.error('Generate roster error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      rosterId: null,
      status: 'ERROR',
    }
  }
}

/**
 * Get roster for a specific month
 * Uses date range overlap logic: roster overlaps month if startDate < monthEnd AND endDate > monthStart
 */
export async function getRosterAction(params: { month: string }) {
  try {
    const monthStart = new Date(params.month + '-01')
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const roster = await prisma.roster.findFirst({
      where: {
        // Date range overlap: roster overlaps month if startDate < monthEnd AND endDate > monthStart
        startDate: { lt: monthEnd },
        endDate: { gt: monthStart },
      },
      include: {
        shifts: {
          include: { staff: true },
          orderBy: [{ staffId: 'asc' }, { timeSlot: 'asc' }],
        },
        constraints: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true as const, roster }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      roster: null,
    }
  }
}

/**
 * Get all rosters with their basic info
 */
export async function getRostersAction() {
  try {
    const rosters = await prisma.roster.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: {
          select: { shifts: true },
        },
      },
    })

    return {
      success: true,
      rosters,
    }
  } catch (error) {
    console.error('Get rosters error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get a specific roster with all its shifts
 */
export async function getRosterByIdAction(rosterId: string) {
  try {
    const roster = await prisma.roster.findUnique({
      where: { id: rosterId },
      include: {
        shifts: {
          include: {
            staff: true,
          },
          orderBy: [
            { staffId: 'asc' },
            { timeSlot: 'asc' },
          ],
        },
        constraints: true,
      },
    })

    if (!roster) {
      return {
        success: false,
        error: 'Roster not found',
      }
    }

    return {
      success: true,
      roster,
    }
  } catch (error) {
    console.error('Get roster by ID error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
