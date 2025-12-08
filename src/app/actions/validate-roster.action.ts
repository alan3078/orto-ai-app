'use server';

import { SolverIntegrationService } from '@/services/solver-integration.service';
import { prisma } from '@/lib/prisma';

export interface StaffInfo {
  visibleId: string;
  user?: { name: string; email: string | null } | null;
  rank: string | null;
  isIC: boolean;
}

/**
 * Server Action to validate an existing roster against its constraints
 * Part of FN/BE/ENG/002 - Roster Validator (Audit Mode)
 */
export async function validateRosterAction(rosterId: string) {
  try {
    const service = new SolverIntegrationService();
    const validationResult = await service.validateRoster(rosterId);

    // Fetch staff info for display (name, rank, roles) - map visibleId to details
    const roster = await prisma.roster.findUnique({
      where: { id: rosterId },
      include: {
        shifts: {
          include: {
            staff: {
              include: {
                user: { select: { name: true, email: true } },
                staffRoles: {
                  include: { role: true },
                },
              },
            },
          },
        },
      },
    });

    const staffMap: Record<string, StaffInfo> = {};
    if (roster?.shifts) {
      for (const shift of roster.shifts) {
        if (!staffMap[shift.staff.visibleId]) {
          const isIC = shift.staff.staffRoles?.some((sr) => sr.role.name === 'IC') ?? false;
          staffMap[shift.staff.visibleId] = {
            visibleId: shift.staff.visibleId,
            user: shift.staff.user,
            rank: shift.staff.rank,
            isIC,
          };
        }
      }
    }

    return {
      success: true as const,
      data: validationResult,
      staffMap,
    };
  } catch (error) {
    console.error('Validate roster error:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null,
      staffMap: {},
    };
  }
}
