'use server'

import { SolverIntegrationService } from '@/services/solver-integration.service'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { 
  fetchSystemPolicies, 
  buildSystemConstraints, 
  buildResourceAttributes,
  fetchShiftTypeHoursConfig,
  buildWorkingHoursConstraints,
} from '@/features/engine/mapper'
import { ShiftType } from '@/types/enums'
import { getLeaveConstraintsForRoster } from './leave.actions'

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
  shiftType?: ShiftType
}) {
  try {
    const { name, startDate, timeSlots, staffIds, constraintIds, shiftType = ShiftType.APN } = params

    // Debug: Log incoming staff IDs
    console.log(`[generateRosterAction] Received ${staffIds.length} staffIds:`, staffIds)

    // Hard-delete any existing rosters that overlap the same month
    const rosterStartDate = new Date(startDate)
    const monthStart = new Date(rosterStartDate.getFullYear(), rosterStartDate.getMonth(), 1)
    const monthEnd = new Date(rosterStartDate.getFullYear(), rosterStartDate.getMonth() + 1, 1)

    const existingRosters = await prisma.roster.findMany({
      where: {
        startDate: { lt: monthEnd },
        endDate: { gt: monthStart },
      },
      select: { id: true },
    })

    if (existingRosters.length > 0) {
      const rosterIds = existingRosters.map((r) => r.id)
      // Delete shifts first (cascade should handle it, but explicit for safety)
      await prisma.shift.deleteMany({ where: { rosterId: { in: rosterIds } } })
      // Delete rosters
      await prisma.roster.deleteMany({ where: { id: { in: rosterIds } } })
      console.log(`[generateRosterAction] Deleted ${existingRosters.length} existing roster(s) for month ${monthStart.toISOString().slice(0, 7)}`)
    }

    // Fetch system policies and build system constraints
    const systemPolicies = await fetchSystemPolicies({
      includeGlobal: true,
      includeRoster: true,
    })

    const staff = await prisma.staff.findMany({
      where: { id: { in: staffIds }, isActive: true, deletedAt: null },
      select: {
        visibleId: true,
        gender: true,
        staffRoles: {
          include: { role: true },
          orderBy: { role: { order: 'asc' } },
        },
      },
    })

    // Determine available states based on shift type
    // APN: 0=Off, 1=Afternoon, 2=PM, 3=Night
    // SEVEN_E: 0=Off, 1=Day (7), 2=Night (E)
    const availableStates = shiftType === ShiftType.APN ? [0, 1, 2, 3] : [0, 1, 2]
    const systemConstraints = await buildSystemConstraints(systemPolicies, staff, availableStates)

    // Fetch shift type config and build working hours constraints dynamically
    const hoursConfig = await fetchShiftTypeHoursConfig(shiftType)
    let workingHoursConstraints: Awaited<ReturnType<typeof buildWorkingHoursConstraints>> = []
    if (hoursConfig) {
      workingHoursConstraints = buildWorkingHoursConstraints(hoursConfig, staff, timeSlots)
    }

    // Fetch leave constraints (FN/ADM/LVE/001)
    // Leaves are treated as fixed OFF (state=0) point constraints
    const rosterEndDate = new Date(rosterStartDate.getTime() + timeSlots * 24 * 60 * 60 * 1000)
    const staffVisibleIds = staff.map(s => s.visibleId)
    const leaveConstraintsRaw = await getLeaveConstraintsForRoster({
      startDate: rosterStartDate,
      endDate: rosterEndDate,
      staffVisibleIds,
    })
    // Convert leave constraints to system constraint format
    const leaveConstraints = leaveConstraintsRaw.map(c => ({
      type: c.type,
      config: {
        resource: c.resource,
        time_slot: c.time_slot,
        state: c.state,
      },
      is_required: c.is_required,
    }))
    console.log(`[generateRosterAction] Generated ${leaveConstraints.length} leave constraints`)

    // Merge all system constraints
    const allSystemConstraints = [...systemConstraints, ...workingHoursConstraints, ...leaveConstraints]

    // Build resource attributes (FN/ADM/STF/007)
    const resourceAttributes = buildResourceAttributes(staff)

    const service = new SolverIntegrationService()

    const result = await service.generateRoster(
      name,
      new Date(startDate),
      timeSlots,
      staffIds,
      constraintIds,
      allSystemConstraints,
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
export type RosterWithRelations = Prisma.RosterGetPayload<{
  include: {
    shifts: {
      include: {
        staff: {
          include: {
            user: { select: { name: true; email: true } }
          }
        }
      }
    }
    constraints: true
  }
}>

export type GetRosterResponse = 
  | {
      success: true
      roster: RosterWithRelations | null
      leaves: Array<{
        id: string
        staffId: string
        startDate: Date
        endDate: Date
        leaveType: string
        notes: string | null
      }>
    }
  | {
      success: false
      error: string
      roster: null
      leaves: []
    }

export async function getRosterAction(params: { month: string }): Promise<GetRosterResponse> {
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
          include: { 
            staff: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: [{ staffId: 'asc' }, { timeSlot: 'asc' }],
        },
        constraints: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch leaves for the roster period (FN/ADM/LVE/001)
    let leaves: Array<{
      id: string
      staffId: string
      startDate: Date
      endDate: Date
      leaveType: string
      notes: string | null
    }> = []
    
    if (roster) {
      leaves = await prisma.leave.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: roster.endDate },
          endDate: { gte: roster.startDate },
        },
        select: {
          id: true,
          staffId: true,
          startDate: true,
          endDate: true,
          leaveType: true,
          notes: true,
        },
      })
    }

    return { success: true as const, roster, leaves }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      roster: null,
      leaves: [],
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
