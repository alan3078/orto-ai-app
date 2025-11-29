'use server'

import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { auth } from '@/lib/auth'

// Ensure only managers can perform these actions
async function requireManager() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') {
    throw new Error('Unauthorized: Manager access required')
  }
  return session.user
}

export async function fetchUsers() {
  await requireManager()
  
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      mustResetPassword: true,
      lastLoginAt: true,
      createdAt: true,
      staff: {
        select: {
          id: true,
          visibleId: true,
        },
      },
    },
  })
  
  return users
}

export async function createUserAction(formData: FormData) {
  await requireManager()
  
  const username = formData.get('username') as string
  const email = formData.get('email') as string | null
  const name = formData.get('name') as string | null
  const password = formData.get('password') as string
  const role = formData.get('role') as UserRole
  const staffId = formData.get('staffId') as string | null

  if (!username || !password) {
    return { error: 'Username and password are required' }
  }

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({ where: { username } })
  if (existingUsername) {
    return { error: 'A user with this username already exists' }
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return { error: 'A user with this email already exists' }
    }
  }

  // If staffId provided, check if staff exists and is not already linked
  if (staffId) {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } })
    if (!staff) {
      return { error: 'Staff member not found' }
    }
    if (staff.userId) {
      return { error: 'This staff member is already linked to another user' }
    }
  }

  const passwordHash = await hash(password, 12)

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        name: name || username, // Default name to username if not provided
        passwordHash,
        role: role || 'MEMBER',
        mustResetPassword: true,
      },
    })

    // Link staff to user if staffId provided
    if (staffId) {
      await prisma.staff.update({
        where: { id: staffId },
        data: { userId: user.id },
      })
    }
    
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    console.error('Error creating user:', error)
    return { error: 'Failed to create user' }
  }
}

export async function updateUserAction(formData: FormData) {
  await requireManager()
  
  const id = formData.get('id') as string
  const username = formData.get('username') as string
  const email = formData.get('email') as string | null
  const name = formData.get('name') as string | null
  const role = formData.get('role') as UserRole
  const staffId = formData.get('staffId') as string | null

  if (!id || !username) {
    return { error: 'User ID and username are required' }
  }

  // Check if username is taken by another user
  const existingUsername = await prisma.user.findFirst({
    where: { username, NOT: { id } },
  })
  if (existingUsername) {
    return { error: 'This username is already in use by another user' }
  }

  // Check if email is taken by another user (if provided)
  if (email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    })
    if (existingEmail) {
      return { error: 'This email is already in use by another user' }
    }
  }

  // If staffId provided, check if already linked to another user
  if (staffId) {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } })
    if (!staff) {
      return { error: 'Staff member not found' }
    }
    if (staff.userId && staff.userId !== id) {
      return { error: 'This staff member is already linked to another user' }
    }
  }

  try {
    // Get current user to check existing staff link
    const currentUser = await prisma.user.findUnique({
      where: { id },
      include: { staff: true },
    })

    await prisma.user.update({
      where: { id },
      data: {
        username,
        email: email || null,
        name: name || username, // Default to username if no name
        role,
      },
    })

    // Handle staff linking/unlinking
    // Unlink old staff if different
    if (currentUser?.staff && currentUser.staff.id !== staffId) {
      await prisma.staff.update({
        where: { id: currentUser.staff.id },
        data: { userId: null as any }, // This shouldn't happen in 1:1 mandatory, but handle gracefully
      })
    }
    // Link new staff
    if (staffId && currentUser?.staff?.id !== staffId) {
      await prisma.staff.update({
        where: { id: staffId },
        data: { userId: id },
      })
    }
    
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    console.error('Error updating user:', error)
    return { error: 'Failed to update user' }
  }
}

export async function toggleUserActiveAction(userId: string) {
  await requireManager()
  
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { error: 'User not found' }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    })
    
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    console.error('Error toggling user status:', error)
    return { error: 'Failed to update user status' }
  }
}

export async function resetUserPasswordAction(formData: FormData) {
  await requireManager()
  
  const userId = formData.get('userId') as string
  const newPassword = formData.get('newPassword') as string

  if (!userId || !newPassword) {
    return { error: 'User ID and new password are required' }
  }

  if (newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  const passwordHash = await hash(newPassword, 12)

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustResetPassword: true,
      },
    })
    
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    console.error('Error resetting password:', error)
    return { error: 'Failed to reset password' }
  }
}

export async function deleteUserAction(userId: string) {
  const currentUser = await requireManager()
  
  // Prevent self-deletion
  if (currentUser.id === userId) {
    return { error: 'You cannot delete your own account' }
  }

  try {
    await prisma.user.delete({ where: { id: userId } })
    
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { error: 'Failed to delete user' }
  }
}

// Fetch staff members for linking to users
// Note: In the new model, User and Staff are always 1:1 and created together
// This function returns staff that already have users (for reference/display)
export async function fetchStaffForLinking() {
  await requireManager()
  
  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { visibleId: 'asc' },
  })
  
  return staff.map(s => ({
    id: s.id,
    visibleId: s.visibleId,
    name: s.user?.name || s.visibleId,
    email: s.user?.email || '',
    userId: s.user?.id || null,
  }))
}
