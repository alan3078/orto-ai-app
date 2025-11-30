'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { sortStaff } from '@/lib/staff-sort'
import { hash } from 'bcryptjs'
import { type Gender, UserRole } from '@prisma/client'

/**
 * Get all active staff members with roles (FN/ADM/STF/007)
 */
export async function getStaffAction() {
  try {
    const staffRaw = await prisma.staff.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        visibleId: true,
        rank: true,
        isActive: true,
        staffGroupId: true,
        gender: true,
        userId: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { id: true, email: true, name: true, role: true, isActive: true, deletedAt: true },
        },
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
 * Creates both User and Staff records in a transaction (1:1 relationship)
 */
export async function createStaffAction(data: {
  name: string
  email?: string
  rank?: string
  visibleId: string
  gender?: Gender
  roleIds?: string[]
  password?: string
}) {
  try {
    // Generate username from visibleId (lowercase)
    const username = data.visibleId.toLowerCase()

    // Check for duplicate visibleId
    const existingStaff = await prisma.staff.findUnique({
      where: { visibleId: data.visibleId },
    })

    if (existingStaff) {
      return {
        success: false as const,
        error: 'Staff ID already exists',
        staff: null,
      }
    }

    // Check for duplicate username
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUsername) {
      return {
        success: false as const,
        error: 'Username already exists',
        staff: null,
      }
    }

    // Check for duplicate email (if provided)
    if (data.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (existingEmail) {
        return {
          success: false as const,
          error: 'Email already exists',
          staff: null,
        }
      }
    }

    // Default password if not provided
    const passwordHash = await hash(data.password || 'changeme123', 12)

    // Create User + Staff in transaction
    const user = await prisma.user.create({
      data: {
        username,
        email: data.email || null,
        name: data.name,
        passwordHash,
        role: UserRole.USER,
        isActive: true,
        mustResetPassword: true,
        staff: {
          create: {
            visibleId: data.visibleId,
            rank: data.rank || null,
            gender: data.gender || null,
            isActive: true,
            staffRoles: data.roleIds?.length
              ? {
                  create: data.roleIds.map((roleId) => ({ roleId })),
                }
              : undefined,
          },
        },
      },
      include: {
        staff: {
          include: {
            staffRoles: {
              include: { role: true },
              orderBy: { role: { order: 'asc' } },
            },
          },
        },
      },
    })

    revalidatePath('/roster-management')
    revalidatePath('/staff')
    revalidatePath('/admin/users')
    return { success: true as const, staff: user.staff }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      staff: null,
    }
  }
}

/**
 * Update an existing staff member
 * Updates both Staff and User records (1:1 relationship)
 */
export async function updateStaffAction(data: {
  id: string
  name: string
  email?: string
  rank?: string
  visibleId: string
  gender?: Gender
  roleIds?: string[]
}) {
  try {
    // Check for duplicate visibleId (excluding current staff)
    const existingStaff = await prisma.staff.findFirst({
      where: { 
        visibleId: data.visibleId,
        NOT: { id: data.id },
      },
    })

    if (existingStaff) {
      return {
        success: false as const,
        error: 'Staff ID already exists',
        staff: null,
      }
    }

    // Check for duplicate email (if provided, excluding current user)
    if (data.email) {
      const staff = await prisma.staff.findUnique({
        where: { id: data.id },
        select: { userId: true },
      })
      
      if (staff) {
        const existingEmail = await prisma.user.findFirst({
          where: { 
            email: data.email,
            NOT: { id: staff.userId },
          },
        })

        if (existingEmail) {
          return {
            success: false as const,
            error: 'Email already exists',
            staff: null,
          }
        }
      }
    }

    // Delete existing role assignments
    await prisma.staffRole.deleteMany({
      where: { staffId: data.id },
    })

    // Update Staff and User
    const updatedStaff = await prisma.staff.update({
      where: { id: data.id },
      data: {
        visibleId: data.visibleId,
        rank: data.rank || null,
        gender: data.gender || null,
        user: {
          update: {
            name: data.name,
            email: data.email || null,
          },
        },
        staffRoles: data.roleIds?.length
          ? {
              create: data.roleIds.map((roleId) => ({ roleId })),
            }
          : undefined,
      },
      include: {
        user: true,
        staffRoles: {
          include: { role: true },
          orderBy: { role: { order: 'asc' } },
        },
      },
    })

    revalidatePath('/roster-management')
    revalidatePath('/staff')
    revalidatePath('/admin/users')
    return { success: true as const, staff: updatedStaff }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      staff: null,
    }
  }
}

/**
 * Soft delete a staff member and their user account
 */
export async function deleteStaffAction(id: string) {
  try {
    const now = new Date()
    
    // Soft delete both Staff and User
    const staff = await prisma.staff.update({
      where: { id },
      data: { 
        isActive: false,
        deletedAt: now,
        user: {
          update: {
            isActive: false,
            deletedAt: now,
          },
        },
      },
      include: { user: { select: { name: true } } },
    })

    revalidatePath('/roster-management')
    revalidatePath('/admin/users')
    return { success: true as const, message: `${staff.user.name} has been deleted` }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Toggle staff active status (FN/ADM/STF/004)
 * Also toggles the associated user's active status
 */
export async function toggleStaffActiveAction(id: string) {
  try {
    // Get current status
    const staff = await prisma.staff.findUnique({
      where: { id },
      select: { isActive: true, user: { select: { name: true } } },
    })

    if (!staff) {
      return {
        success: false as const,
        error: 'Staff not found',
        isActive: false,
      }
    }

    // Toggle the status for both Staff and User
    const updated = await prisma.staff.update({
      where: { id },
      data: { 
        isActive: !staff.isActive,
        user: {
          update: {
            isActive: !staff.isActive,
          },
        },
      },
      select: { isActive: true },
    })

    revalidatePath('/roster-management')
    revalidatePath('/staff')
    revalidatePath('/admin/users')
    return { 
      success: true as const, 
      isActive: updated.isActive,
      message: `${staff.user.name} is now ${updated.isActive ? 'active' : 'inactive'}`,
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      isActive: false,
    }
  }
}

/**
 * Get all staff members with optional filter (FN/ADM/STF/004)
 */
export async function getStaffWithFilterAction(filter: 'all' | 'active' | 'inactive' = 'active') {
  try {
    const whereClause = filter === 'all' 
      ? { deletedAt: null } 
      : { isActive: filter === 'active', deletedAt: null }

    const staffRaw = await prisma.staff.findMany({
      where: whereClause,
      select: {
        id: true,
        visibleId: true,
        rank: true,
        isActive: true,
        staffGroupId: true,
        gender: true,
        userId: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: { id: true, email: true, name: true, role: true, isActive: true, deletedAt: true },
        },
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
    console.log(`[getStaffWithFilterAction] Returning ${staff.length} staff members (filter: ${filter})`)
    return { success: true as const, staff }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      staff: [],
    }
  }
}
