'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/permissions'
import { UserRole } from '@prisma/client'
import type { LeaveType, LeaveStatus } from '@/lib/leave.types'

/**
 * Create a new leave record
 * Admin users can create leave for any staff member
 * Non-admin users can only create leave for themselves
 */
export async function createLeaveAction(params: {
  staffId: string
  startDate: string
  endDate: string
  leaveType: LeaveType
  status?: LeaveStatus
  notes?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false as const, error: 'Unauthorized' }
    }

    const { staffId, startDate, endDate, leaveType, status = 'APPROVED', notes } = params
    const userIsSuperAdmin = isSuperAdmin(session.user.role as UserRole)

    // Non-super-admin users can only create leave for themselves
    if (!userIsSuperAdmin && session.user.staffId !== staffId) {
      return { 
        success: false as const, 
        error: 'You can only create leave for yourself' 
      }
    }

    // Validate staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, visibleId: true },
    })
    if (!staff) {
      return { success: false as const, error: 'Staff member not found' }
    }

    // Create leave record
    const leave = await prisma.leave.create({
      data: {
        staffId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        leaveType: leaveType as any,
        status: status as any,
        notes,
      },
      include: {
        staff: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    })

    revalidatePath('/admin/leaves')
    revalidatePath('/admin/roster-management')

    return { success: true as const, leave }
  } catch (error) {
    console.error('Create leave error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to create leave',
    }
  }
}

/**
 * Get all leaves for a date range
 */
export async function getLeavesAction(params: {
  startDate?: string
  endDate?: string
  staffId?: string
  leaveType?: LeaveType
  status?: LeaveStatus
}) {
  try {
    const { startDate, endDate, staffId, leaveType, status } = params

    const where: any = {}

    // Filter by date range (leaves that overlap with the range)
    if (startDate && endDate) {
      where.AND = [
        { startDate: { lte: new Date(endDate) } },
        { endDate: { gte: new Date(startDate) } },
      ]
    }

    if (staffId) {
      where.staffId = staffId
    }

    if (leaveType) {
      where.leaveType = leaveType
    }

    if (status) {
      where.status = status
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        staff: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: [{ startDate: 'asc' }, { staff: { visibleId: 'asc' } }],
    })

    return { success: true as const, leaves }
  } catch (error) {
    console.error('Get leaves error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to fetch leaves',
      leaves: [],
    }
  }
}

/**
 * Update an existing leave record
 * Admin users can update any leave
 * Non-admin users can only update their own leave
 */
export async function updateLeaveAction(params: {
  id: string
  startDate?: string
  endDate?: string
  leaveType?: LeaveType
  status?: LeaveStatus
  notes?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false as const, error: 'Unauthorized' }
    }

    const { id, startDate, endDate, leaveType, status, notes } = params
    const userIsSuperAdmin = isSuperAdmin(session.user.role as UserRole)

    // Get the existing leave to check ownership
    const existingLeave = await prisma.leave.findUnique({
      where: { id },
      select: { staffId: true },
    })

    if (!existingLeave) {
      return { success: false as const, error: 'Leave not found' }
    }

    // Non-super-admin users can only update their own leave
    if (!userIsSuperAdmin && session.user.staffId !== existingLeave.staffId) {
      return { 
        success: false as const, 
        error: 'You can only update your own leave' 
      }
    }

    const data: any = {}
    if (startDate) data.startDate = new Date(startDate)
    if (endDate) data.endDate = new Date(endDate)
    if (leaveType) data.leaveType = leaveType
    if (status) data.status = status
    if (notes !== undefined) data.notes = notes

    const leave = await prisma.leave.update({
      where: { id },
      data,
      include: {
        staff: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    })

    revalidatePath('/admin/leaves')
    revalidatePath('/admin/roster-management')

    return { success: true as const, leave }
  } catch (error) {
    console.error('Update leave error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to update leave',
    }
  }
}

/**
 * Delete a leave record
 * Admin users can delete any leave
 * Non-admin users can only delete their own leave
 */
export async function deleteLeaveAction(id: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false as const, error: 'Unauthorized' }
    }

    const userIsSuperAdmin = isSuperAdmin(session.user.role as UserRole)

    // Get the existing leave to check ownership
    const existingLeave = await prisma.leave.findUnique({
      where: { id },
      select: { staffId: true },
    })

    if (!existingLeave) {
      return { success: false as const, error: 'Leave not found' }
    }

    // Non-super-admin users can only delete their own leave
    if (!userIsSuperAdmin && session.user.staffId !== existingLeave.staffId) {
      return { 
        success: false as const, 
        error: 'You can only delete your own leave' 
      }
    }

    await prisma.leave.delete({ where: { id } })

    revalidatePath('/admin/leaves')
    revalidatePath('/admin/roster-management')

    return { success: true as const }
  } catch (error) {
    console.error('Delete leave error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to delete leave',
    }
  }
}

/**
 * Get public holidays for a date range
 */
export async function getPublicHolidaysAction(params: {
  startDate: string
  endDate: string
}) {
  try {
    const { startDate, endDate } = params

    const holidays = await prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    })

    return { success: true as const, holidays }
  } catch (error) {
    console.error('Get public holidays error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to fetch public holidays',
      holidays: [],
    }
  }
}

/**
 * Check if a specific date is a public holiday
 */
export async function isPublicHolidayAction(dateStr: string) {
  try {
    const date = new Date(dateStr)
    // Normalize to start of day UTC
    const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

    const holiday = await prisma.publicHoliday.findFirst({
      where: {
        date: normalizedDate,
      },
    })

    return {
      success: true as const,
      isHoliday: !!holiday,
      holiday: holiday || null,
    }
  } catch (error) {
    console.error('Check public holiday error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to check public holiday',
      isHoliday: false,
      holiday: null,
    }
  }
}

/**
 * Get leaves for solver integration - returns leave days as point constraints
 * This function generates constraint data for leaves to be treated as fixed OFF
 */
export async function getLeaveConstraintsForRoster(params: {
  startDate: Date
  endDate: Date
  staffVisibleIds: string[]
}): Promise<Array<{ type: 'point'; resource: string; time_slot: number; state: 0; is_required: true }>> {
  const { startDate, endDate, staffVisibleIds } = params

  // Fetch all approved leaves that overlap with the roster period
  const leaves = await prisma.leave.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      staff: {
        visibleId: { in: staffVisibleIds },
        isActive: true,
        deletedAt: null,
      },
    },
    include: {
      staff: { select: { visibleId: true } },
    },
  })

  const constraints: Array<{ type: 'point'; resource: string; time_slot: number; state: 0; is_required: true }> = []

  // Generate point constraints for each leave day
  for (const leave of leaves) {
    const leaveStart = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()))
    const leaveEnd = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()))

    // Iterate through each day of the leave within the roster period
    let currentDate = new Date(leaveStart)
    while (currentDate <= leaveEnd) {
      // Calculate time slot (days from roster start)
      const timeSlot = Math.floor((currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))

      if (timeSlot >= 0) {
        constraints.push({
          type: 'point',
          resource: leave.staff.visibleId,
          time_slot: timeSlot,
          state: 0, // OFF state
          is_required: true, // Hard constraint - leaves cannot be overridden
        })
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  return constraints
}

/**
 * Get leave data for display on roster grid
 * Returns a map of staffId-date to leave info
 */
export async function getLeavesForRosterDisplay(params: {
  startDate: Date
  endDate: Date
}): Promise<Map<string, { leaveType: LeaveType; notes: string | null }>> {
  const { startDate, endDate } = params

  const leaves = await prisma.leave.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: {
      staff: { select: { id: true, visibleId: true } },
    },
  })

  const leaveMap = new Map<string, { leaveType: LeaveType; notes: string | null }>()

  for (const leave of leaves) {
    const leaveStart = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()))
    const leaveEnd = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()))

    let currentDate = new Date(leaveStart)
    while (currentDate <= leaveEnd) {
      const dateKey = currentDate.toISOString().split('T')[0]
      const key = `${leave.staffId}-${dateKey}`
      leaveMap.set(key, {
        leaveType: leave.leaveType as LeaveType,
        notes: leave.notes,
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  return leaveMap
}
