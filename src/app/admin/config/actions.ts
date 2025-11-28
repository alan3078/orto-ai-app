'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { ShiftType } from '@/types/enums'

export async function getSystemConfigGroupsAction() {
  try {
    const groups = await prisma.systemConfigGroup.findMany({
      include: {
        items: {
          orderBy: { priority: 'desc' },
        },
      },
      orderBy: { scope: 'asc' },
    })

    return { success: true, groups }
  } catch (error) {
    console.error('[SystemConfig] Failed to fetch groups:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      groups: [],
    }
  }
}

export async function updateSystemConfigItemAction(params: {
  itemId: number
  value: string // JSON string
}) {
  try {
    const { itemId, value } = params

    // Parse JSON to validate
    let parsedValue: unknown
    try {
      parsedValue = JSON.parse(value)
    } catch {
      return {
        success: false,
        error: 'Invalid JSON format',
      }
    }

    // Fetch item to check locked status
    const item = await prisma.systemConfigItem.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return {
        success: false,
        error: 'Configuration item not found',
      }
    }

    if (item.locked) {
      return {
        success: false,
        error: 'Cannot edit locked configuration item',
      }
    }

    // Update value
    await prisma.systemConfigItem.update({
      where: { id: itemId },
      data: { value: parsedValue as any },
    })

    revalidatePath('/admin/config')

    return { success: true }
  } catch (error) {
    console.error('[SystemConfig] Failed to update item:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function toggleSystemConfigItemAction(params: { itemId: number }) {
  try {
    const { itemId } = params

    const item = await prisma.systemConfigItem.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return {
        success: false,
        error: 'Configuration item not found',
      }
    }

    if (item.locked) {
      return {
        success: false,
        error: 'Cannot toggle locked configuration item',
      }
    }

    await prisma.systemConfigItem.update({
      where: { id: itemId },
      data: { isActive: !item.isActive },
    })

    revalidatePath('/admin/config')

    return { success: true }
  } catch (error) {
    console.error('[SystemConfig] Failed to toggle item:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// Shift Type Configuration Actions
// ============================================================================

export async function getShiftTypeConfigsAction() {
  try {
    const configs = await prisma.shiftTypeConfig.findMany({
      orderBy: { shiftType: 'asc' },
    })

    return { success: true, configs }
  } catch (error) {
    console.error('[ShiftTypeConfig] Failed to fetch configs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      configs: [],
    }
  }
}

export async function updateShiftTypeConfigAction(params: {
  id: string
  minHoursPerMonth: number
  maxHoursPerMonth: number
}) {
  try {
    const { id, minHoursPerMonth, maxHoursPerMonth } = params

    // Validate hours
    if (minHoursPerMonth < 0 || maxHoursPerMonth < 0) {
      return {
        success: false,
        error: 'Hours cannot be negative',
      }
    }

    if (minHoursPerMonth > maxHoursPerMonth) {
      return {
        success: false,
        error: 'Minimum hours cannot exceed maximum hours',
      }
    }

    // Update configuration
    await prisma.shiftTypeConfig.update({
      where: { id },
      data: {
        minHoursPerMonth,
        maxHoursPerMonth,
      },
    })

    revalidatePath('/admin/config')
    revalidatePath('/admin/config/shift-settings')

    return { success: true }
  } catch (error) {
    console.error('[ShiftTypeConfig] Failed to update config:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getShiftTypeConfigByTypeAction(shiftType: ShiftType) {
  try {
    const config = await prisma.shiftTypeConfig.findUnique({
      where: { shiftType },
    })

    return { success: true, config }
  } catch (error) {
    console.error('[ShiftTypeConfig] Failed to fetch config:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: null,
    }
  }
}
