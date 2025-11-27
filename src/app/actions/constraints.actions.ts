'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * Get all active constraints with shiftType for scope display
 */
export async function getConstraintsAction() {
  try {
    const constraints = await prisma.constraint.findMany({
      where: { isActive: true },
      orderBy: [
        { shiftType: 'asc' }, // null (GLOBAL) first, then APN, DAY_NIGHT
        { priority: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        config: true,
        priority: true,
        shiftType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return { success: true as const, constraints }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      constraints: [],
    }
  }
}

/**
 * Create a new constraint
 */
export async function createConstraintAction(data: {
  name: string
  type: 'point' | 'vertical_sum'
  config: Record<string, unknown>
  description?: string
  priority?: number
  shiftType?: 'APN' | 'DAY_NIGHT' | null
}) {
  try {
    const constraint = await prisma.constraint.create({ 
      data: {
        name: data.name,
        type: data.type,
        config: data.config as any,
        description: data.description,
        priority: data.priority,
        shiftType: data.shiftType ?? null, // null = GLOBAL
      }
    })
    revalidatePath('/roster-management')
    return { success: true as const, constraint }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      constraint: null,
    }
  }
}

/**
 * Delete a constraint (soft delete)
 */
export async function deleteConstraintAction(id: string) {
  try {
    await prisma.constraint.update({
      where: { id },
      data: { isActive: false },
    })
    revalidatePath('/roster-management')
    return { success: true as const }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
