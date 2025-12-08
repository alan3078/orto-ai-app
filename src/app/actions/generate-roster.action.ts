'use server';

import { SolverIntegrationService } from '@/services/solver-integration.service';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import {
  fetchSystemPolicies,
  buildSystemConstraints,
  buildResourceAttributes,
  fetchShiftTypeHoursConfig,
  buildWorkingHoursConstraints,
} from '@/features/engine/mapper';
import { ShiftType } from '@/types/enums';
import { getLeaveConstraintsForRoster } from './leave.actions';

/**
 * Server Action to generate a new roster
 * Accepts parameters directly from client components
 */
export async function generateRosterAction(params: {
  name: string;
  startDate: string;
  timeSlots: number;
  staffIds: string[];
  constraintIds: string[];
  shiftType?: ShiftType;
}) {
  try {
    const {
      name,
      startDate,
      timeSlots,
      staffIds,
      constraintIds,
      shiftType = ShiftType.APN,
    } = params;

    // Debug: Log incoming staff IDs
    console.log(`[generateRosterAction] Received ${staffIds.length} staffIds:`, staffIds);

    // Hard-delete any existing rosters for the SAME month only
    // Use year/month matching to avoid timezone-induced overlap issues
    const rosterStartDate = new Date(startDate);
    const targetYear = rosterStartDate.getFullYear();
    const targetMonth = rosterStartDate.getMonth();

    // Create month boundaries with buffer to handle timezone edge cases
    // A roster "belongs" to a month if its startDate falls within that calendar month
    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 1);
    // Add 2-day buffer on each side to catch timezone-shifted dates
    const searchStart = new Date(monthStart.getTime() - 2 * 24 * 60 * 60 * 1000);
    const searchEnd = new Date(monthEnd.getTime() + 2 * 24 * 60 * 60 * 1000);

    const existingRosters = await prisma.roster.findMany({
      where: {
        // Find rosters whose startDate falls within the target month (with buffer)
        startDate: {
          gte: searchStart,
          lt: searchEnd,
        },
      },
      select: { id: true, name: true, startDate: true },
    });

    // Filter to only delete rosters that actually belong to this month
    // (check that startDate's month matches target month)
    const rostersToDelete = existingRosters.filter((r) => {
      const rosterMonth = new Date(r.startDate).getMonth();
      const rosterYear = new Date(r.startDate).getFullYear();
      return rosterMonth === targetMonth && rosterYear === targetYear;
    });

    if (rostersToDelete.length > 0) {
      const rosterIds = rostersToDelete.map((r) => r.id);
      console.log(
        `[generateRosterAction] Deleting ${rostersToDelete.length} roster(s) for ${targetYear}-${String(targetMonth + 1).padStart(2, '0')}:`,
        rostersToDelete.map((r) => r.name)
      );
      // Delete shifts first (cascade should handle it, but explicit for safety)
      await prisma.shift.deleteMany({ where: { rosterId: { in: rosterIds } } });
      // Delete rosters
      await prisma.roster.deleteMany({ where: { id: { in: rosterIds } } });
    }

    // FN/ADM/RST/002 - Fetch previous month assignments for cross-month constraint enforcement
    // Get the previous month's date range with buffer for timezone edge cases
    const prevMonthYear = targetMonth === 0 ? targetYear - 1 : targetYear;
    const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
    const prevMonthStart = new Date(prevMonthYear, prevMonth, 1);
    const prevMonthEnd = new Date(targetYear, targetMonth, 1);
    // Add buffer for timezone issues
    const prevSearchStart = new Date(prevMonthStart.getTime() - 2 * 24 * 60 * 60 * 1000);
    const prevSearchEnd = new Date(prevMonthEnd.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Fetch previous month's roster - find by startDate in previous month range
    const previousRosterCandidates = await prisma.roster.findMany({
      where: {
        startDate: {
          gte: prevSearchStart,
          lt: prevSearchEnd,
        },
        status: 'COMPLETED',
        shiftType: shiftType, // Must match shift type
      },
      include: {
        shifts: {
          include: {
            staff: {
              select: { visibleId: true },
            },
          },
          orderBy: { timeSlot: 'desc' },
        },
      },
    });

    // Filter to find roster that actually belongs to previous month
    const previousRoster = previousRosterCandidates.find((r) => {
      const rosterMonth = new Date(r.startDate).getMonth();
      const rosterYear = new Date(r.startDate).getFullYear();
      return rosterMonth === prevMonth && rosterYear === prevMonthYear;
    });

    // Build previous month assignments (last 7 days for pattern checking)
    const OVERLAP_DAYS = 7;
    const previousMonthAssignments: Array<{
      resource: string;
      offset_days: number;
      state: number;
    }> = [];

    if (previousRoster) {
      const prevMonthDays = previousRoster.timeSlots || 30;
      // Get shifts from last OVERLAP_DAYS of previous month
      const startSlot = Math.max(0, prevMonthDays - OVERLAP_DAYS);

      previousRoster.shifts
        .filter((shift) => shift.timeSlot >= startSlot)
        .forEach((shift) => {
          // offset_days: 1 = last day of prev month, 2 = second-to-last, etc.
          // timeSlot is 0-indexed, so last day is (prevMonthDays - 1)
          // offset = prevMonthDays - 1 - timeSlot + 1 = prevMonthDays - timeSlot
          const offset = prevMonthDays - shift.timeSlot;
          if (offset >= 1 && offset <= OVERLAP_DAYS) {
            previousMonthAssignments.push({
              resource: shift.staff.visibleId,
              offset_days: offset,
              state: shift.state,
            });
          }
        });

      console.log(
        `[generateRosterAction] Found ${previousMonthAssignments.length} previous month assignments from ${previousRoster.name}`
      );
    } else {
      console.log(
        `[generateRosterAction] No previous month roster found for cross-month constraints`
      );
    }

    // Fetch system policies and build system constraints
    const systemPolicies = await fetchSystemPolicies({
      includeGlobal: true,
      includeRoster: true,
    });

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
    });

    // Determine available states based on shift type
    // APN: 0=Off, 1=Afternoon, 2=PM, 3=Night
    // SEVEN_E: 0=Off, 1=Day (7), 2=Night (E)
    const availableStates = shiftType === ShiftType.APN ? [0, 1, 2, 3] : [0, 1, 2];
    // Pass timeSlots to buildSystemConstraints for dynamic constraint generation
    const systemConstraints = await buildSystemConstraints(
      systemPolicies,
      staff,
      availableStates,
      timeSlots
    );

    // Fetch shift type config and build working hours constraints dynamically
    const hoursConfig = await fetchShiftTypeHoursConfig(shiftType);
    let workingHoursConstraints: Awaited<ReturnType<typeof buildWorkingHoursConstraints>> = [];
    if (hoursConfig) {
      workingHoursConstraints = buildWorkingHoursConstraints(hoursConfig, staff, timeSlots);
    }

    // Fetch leave constraints (FN/ADM/LVE/001)
    // Leaves are treated as fixed OFF (state=0) point constraints
    const rosterEndDate = new Date(rosterStartDate.getTime() + timeSlots * 24 * 60 * 60 * 1000);
    const staffVisibleIds = staff.map((s) => s.visibleId);
    const leaveConstraintsRaw = await getLeaveConstraintsForRoster({
      startDate: rosterStartDate,
      endDate: rosterEndDate,
      staffVisibleIds,
    });
    // Convert leave constraints to system constraint format
    const leaveConstraints = leaveConstraintsRaw.map((c) => ({
      type: c.type,
      config: {
        resource: c.resource,
        time_slot: c.time_slot,
        state: c.state,
      },
      is_required: c.is_required,
    }));
    console.log(`[generateRosterAction] Generated ${leaveConstraints.length} leave constraints`);

    // Merge all system constraints
    const allSystemConstraints = [
      ...systemConstraints,
      ...workingHoursConstraints,
      ...leaveConstraints,
    ];

    // Build resource attributes (FN/ADM/STF/007)
    const resourceAttributes = buildResourceAttributes(staff);

    const service = new SolverIntegrationService();

    const result = await service.generateRoster(
      name,
      new Date(startDate),
      timeSlots,
      staffIds,
      constraintIds,
      allSystemConstraints,
      resourceAttributes,
      shiftType,
      previousMonthAssignments
    );

    revalidatePath('/roster-management');
    revalidatePath('/test-roster');
    revalidatePath(`/test-roster/${result.rosterId}`);

    return {
      success: true as const,
      rosterId: result.rosterId,
      status: result.status,
    };
  } catch (error) {
    console.error('Generate roster error:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      rosterId: null,
      status: 'ERROR',
    };
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
            user: { select: { name: true; email: true } };
          };
        };
      };
    };
    constraints: true;
  };
}>;

export type GetRosterResponse =
  | {
      success: true;
      roster: RosterWithRelations | null;
      leaves: Array<{
        id: string;
        staffId: string;
        startDate: Date;
        endDate: Date;
        leaveType: string;
        notes: string | null;
      }>;
    }
  | {
      success: false;
      error: string;
      roster: null;
      leaves: [];
    };

export async function getRosterAction(params: { month: string }): Promise<GetRosterResponse> {
  try {
    // Parse month string "2025-10" to get year and month
    const [year, monthNum] = params.month.split('-').map(Number);

    // Get full month name (e.g., "October")
    const monthName = new Date(year, monthNum - 1, 15).toLocaleString('en-US', {
      month: 'long',
    });
    const expectedRosterName = `${monthName} ${year}`; // e.g., "October 2025"

    // Create date range for precise matching as fallback
    const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));

    // Find roster by name (most reliable) or by startDate range
    const roster = await prisma.roster.findFirst({
      where: {
        OR: [
          // Match by roster name containing "October 2025" etc.
          { name: { contains: expectedRosterName } },
          // Fallback: startDate is within first week of month (handles timezone)
          {
            AND: [
              {
                startDate: {
                  gte: new Date(monthStart.getTime() - 2 * 24 * 60 * 60 * 1000),
                },
              }, // 2 days before
              {
                startDate: {
                  lt: new Date(monthStart.getTime() + 5 * 24 * 60 * 60 * 1000),
                },
              }, // 5 days after
            ],
          },
        ],
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
    });

    // Fetch leaves for the roster period (FN/ADM/LVE/001)
    let leaves: Array<{
      id: string;
      staffId: string;
      startDate: Date;
      endDate: Date;
      leaveType: string;
      notes: string | null;
    }> = [];

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
      });
    }

    return { success: true as const, roster, leaves };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      roster: null,
      leaves: [],
    };
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
    });

    return {
      success: true,
      rosters,
    };
  } catch (error) {
    console.error('Get rosters error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete a roster and all its shifts
 */
export async function deleteRosterAction(rosterId: string) {
  try {
    // Delete shifts first (cascade should handle this, but be explicit)
    await prisma.shift.deleteMany({
      where: { rosterId },
    });

    // Delete the roster
    await prisma.roster.delete({
      where: { id: rosterId },
    });

    revalidatePath('/admin/roster');
    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Delete roster error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
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
          orderBy: [{ staffId: 'asc' }, { timeSlot: 'asc' }],
        },
        constraints: true,
      },
    });

    if (!roster) {
      return {
        success: false,
        error: 'Roster not found',
      };
    }

    return {
      success: true,
      roster,
    };
  } catch (error) {
    console.error('Get roster by ID error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
