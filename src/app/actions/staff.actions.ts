'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { sortStaff } from '@/lib/staff-sort'
import type { Gender } from '@prisma/client'

/**
 * Get all active staff members with roles (FN/ADM/STF/007)
 */
export async function getStaffAction() {
  try {
    const staffRaw = await prisma.staff.findMany({
      where: { isActive: true },
      select: {
        id: true,
        employeeId: true,
        name: true,
        rank: true,
        email: true,
        isActive: true,
        staffGroupId: true,
        gender: true,
        monthlyMinHours: true,
        monthlyMaxHours: true,
        createdAt: true,
        updatedAt: true,
        staffRoles: {
          include: { role: true },
          orderBy: { role: { order: 'asc' } },
        },
        staffGroup: {
          select: { id: true, name: true },
        },
      },
    })
    const staff = sortStaff(staffRaw as any)
    console.log(`[getStaffAction] Returning ${staff.length} staff members (sorted)`)
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
  rank?: string
  employeeId: string
  email?: string
  gender?: Gender
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
        rank: data.rank || null,
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
