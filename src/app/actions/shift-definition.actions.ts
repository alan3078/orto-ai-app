'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Get all shift definitions (FN/ADM/STF/007)
 */
export async function getShiftDefinitionsAction() {
  try {
    const shifts = await prisma.shiftDefinition.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });
    return { success: true as const, shifts };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      shifts: [],
    };
  }
}

/**
 * Create a new shift definition
 */
export async function createShiftDefinitionAction(data: {
  code: string;
  startMinutes: number;
  durationMinutes: number;
}) {
  try {
    // Check for duplicate code
    const existing = await prisma.shiftDefinition.findFirst({
      where: { code: data.code, deletedAt: null },
    });

    if (existing) {
      return {
        success: false as const,
        error: 'Shift code already exists',
        shift: null,
      };
    }

    // Validation
    if (data.startMinutes < 0 || data.startMinutes > 1439) {
      return {
        success: false as const,
        error: 'Start minutes must be between 0 and 1439',
        shift: null,
      };
    }

    if (data.durationMinutes <= 0) {
      return {
        success: false as const,
        error: 'Duration must be greater than 0',
        shift: null,
      };
    }

    const shift = await prisma.shiftDefinition.create({
      data: {
        code: data.code.toUpperCase(),
        startMinutes: data.startMinutes,
        durationMinutes: data.durationMinutes,
        isActive: true,
      },
    });

    revalidatePath('/config/shift-settings');
    return { success: true as const, shift };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      shift: null,
    };
  }
}

/**
 * Update a shift definition
 */
export async function updateShiftDefinitionAction(
  id: string,
  data: { code?: string; startMinutes?: number; durationMinutes?: number }
) {
  try {
    // Check for duplicate code if changing
    if (data.code) {
      const existing = await prisma.shiftDefinition.findFirst({
        where: { code: data.code, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        return {
          success: false as const,
          error: 'Shift code already exists',
          shift: null,
        };
      }
    }

    // Validation
    if (data.startMinutes !== undefined && (data.startMinutes < 0 || data.startMinutes > 1439)) {
      return {
        success: false as const,
        error: 'Start minutes must be between 0 and 1439',
        shift: null,
      };
    }

    if (data.durationMinutes !== undefined && data.durationMinutes <= 0) {
      return {
        success: false as const,
        error: 'Duration must be greater than 0',
        shift: null,
      };
    }

    const shift = await prisma.shiftDefinition.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code.toUpperCase() }),
        ...(data.startMinutes !== undefined && {
          startMinutes: data.startMinutes,
        }),
        ...(data.durationMinutes !== undefined && {
          durationMinutes: data.durationMinutes,
        }),
      },
    });

    revalidatePath('/config/shift-settings');
    return { success: true as const, shift };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      shift: null,
    };
  }
}

/**
 * Toggle shift active status (soft delete)
 */
export async function toggleShiftActiveAction(id: string) {
  try {
    const shift = await prisma.shiftDefinition.findUnique({ where: { id } });
    if (!shift) {
      return {
        success: false as const,
        error: 'Shift not found',
      };
    }

    await prisma.shiftDefinition.update({
      where: { id },
      data: { isActive: !shift.isActive },
    });

    revalidatePath('/config/shift-settings');
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Hard delete shift with audit trail (FN/ADM/STF/007)
 */
export async function hardDeleteShiftAction(id: string, reason?: string, deletedBy?: string) {
  try {
    const shift = await prisma.shiftDefinition.findUnique({ where: { id } });
    if (!shift) {
      return {
        success: false as const,
        error: 'Shift not found',
      };
    }

    // Transaction: create audit record + delete shift
    await prisma.$transaction([
      prisma.shiftDefinitionAudit.create({
        data: {
          code: shift.code,
          startMinutes: shift.startMinutes,
          durationMinutes: shift.durationMinutes,
          deletedBy: deletedBy || 'system',
          reason: reason || 'No reason provided',
        },
      }),
      prisma.shiftDefinition.delete({ where: { id } }),
    ]);

    revalidatePath('/config/shift-settings');
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get shift deletion audit log
 */
export async function getShiftAuditLogAction() {
  try {
    const audits = await prisma.shiftDefinitionAudit.findMany({
      orderBy: { deletedAt: 'desc' },
      take: 50,
    });
    return { success: true as const, audits };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      audits: [],
    };
  }
}
