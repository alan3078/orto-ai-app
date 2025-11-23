'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * Get all active staff members with roles (FN/ADM/STF/007)
 */
export async function getStaffAction() {
  try {
    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      include: {
        staffRoles: {
          include: { role: true },
          orderBy: { role: { order: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    })
    return { success: true as const, staff }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      staff: [],
    }
  }
}

/**
 * Create a new staff member with extended attributes (FN/ADM/STF/007)
 */
export async function createStaffAction(data: {
  name: string
  employeeId: string
  email?: string
  gender?: 'F' | 'M'
  roleIds?: string[]
  monthlyMinHours?: number
  monthlyMaxHours?: number
}) {
  try {
    // Check for duplicate employeeId
    const existing = await prisma.staff.findUnique({
      where: { employeeId: data.employeeId },
    })

    if (existing) {
      return {
        success: false as const,
        error: 'Employee ID already exists',
        staff: null,
      }
    }

    const staff = await prisma.staff.create({
      data: {
        name: data.name,
        employeeId: data.employeeId,
        email: data.email || null,
        gender: data.gender || null,
        monthlyMinHours: data.monthlyMinHours || null,
        monthlyMaxHours: data.monthlyMaxHours || null,
        staffRoles: data.roleIds?.length
          ? {
              create: data.roleIds.map((roleId) => ({ roleId })),
            }
          : undefined,
      },
      include: {
        staffRoles: {
          include: { role: true },
          orderBy: { role: { order: 'asc' } },
        },
      },
    })

    revalidatePath('/roster-management')
    revalidatePath('/staff')
    return { success: true as const, staff }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      staff: null,
    }
  }
}

/**
 * Delete a staff member (soft delete)
 */
export async function deleteStaffAction(id: string) {
  try {
    await prisma.staff.update({
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
