'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * Get all active constraints
 */
export async function getConstraintsAction() {
  try {
    const constraints = await prisma.constraint.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
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
}) {
  try {
    const constraint = await prisma.constraint.create({ 
      data: {
        ...data,
        config: data.config as any
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
