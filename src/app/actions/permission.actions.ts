'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { auth } from '@/lib/auth'

// Check if user is super admin
async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Super Admin access required')
  }
  return session.user
}

// Get all modules with their permissions
export async function getModulesWithPermissions() {
  const modules = await prisma.permissionModule.findMany({
    where: { isActive: true },
    include: {
      permissions: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })
  return modules
}

// Get all role permissions (which role has which permission)
export async function getRolePermissions() {
  const rolePermissions = await prisma.rolePermission.findMany({
    include: {
      permission: {
        include: {
          module: true,
        },
      },
    },
  })
  return rolePermissions
}

// Get permissions for a specific role
export async function getPermissionsForRole(role: UserRole) {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { 
      role,
      isGranted: true,
    },
    include: {
      permission: {
        include: {
          module: true,
        },
      },
    },
  })
  return rolePermissions.map(rp => rp.permission)
}

// Get full permission matrix (all roles x all permissions)
export async function getPermissionMatrix() {
  const [modules, rolePermissions] = await Promise.all([
    prisma.permissionModule.findMany({
      where: { isActive: true },
      include: {
        permissions: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.rolePermission.findMany({
      where: { isGranted: true },
    }),
  ])

  // Build a map of permissionId -> granted roles
  const permissionRoleMap: Record<string, UserRole[]> = {}
  rolePermissions.forEach(rp => {
    if (!permissionRoleMap[rp.permissionId]) {
      permissionRoleMap[rp.permissionId] = []
    }
    permissionRoleMap[rp.permissionId].push(rp.role)
  })

  return {
    modules,
    permissionRoleMap,
    roles: Object.values(UserRole) as UserRole[],
  }
}

// Toggle a permission for a role
export async function toggleRolePermission(
  role: UserRole,
  permissionId: string,
  isGranted: boolean
) {
  await requireSuperAdmin()

  // SUPER_ADMIN always has all permissions - can't be modified
  if (role === UserRole.SUPER_ADMIN) {
    throw new Error('Cannot modify Super Admin permissions')
  }

  const existing = await prisma.rolePermission.findUnique({
    where: {
      role_permissionId: { role, permissionId },
    },
  })

  if (existing) {
    await prisma.rolePermission.update({
      where: { id: existing.id },
      data: { isGranted },
    })
  } else {
    await prisma.rolePermission.create({
      data: {
        role,
        permissionId,
        isGranted,
      },
    })
  }

  revalidatePath('/admin/roles')
  return { success: true }
}

// Bulk update permissions for a role
export async function updateRolePermissions(
  role: UserRole,
  permissionIds: string[]
) {
  await requireSuperAdmin()

  if (role === UserRole.SUPER_ADMIN) {
    throw new Error('Cannot modify Super Admin permissions')
  }

  // Get all permissions
  const allPermissions = await prisma.permission.findMany({
    where: { isActive: true },
  })

  // Use transaction to update all at once
  await prisma.$transaction(async (tx) => {
    // Delete existing role permissions for this role
    await tx.rolePermission.deleteMany({
      where: { role },
    })

    // Create new permissions
    await tx.rolePermission.createMany({
      data: allPermissions.map(p => ({
        role,
        permissionId: p.id,
        isGranted: permissionIds.includes(p.id),
      })),
    })
  })

  revalidatePath('/admin/roles')
  return { success: true }
}

// Check if a role has a specific permission (for runtime checks)
export async function checkPermission(
  role: UserRole,
  permissionCode: string
): Promise<boolean> {
  // SUPER_ADMIN always has all permissions
  if (role === UserRole.SUPER_ADMIN) {
    return true
  }

  const permission = await prisma.permission.findUnique({
    where: { code: permissionCode },
    include: {
      rolePermissions: {
        where: { role, isGranted: true },
      },
    },
  })

  return permission?.rolePermissions.length ? true : false
}

// Check multiple permissions at once (more efficient for bulk checks)
export async function checkPermissions(
  role: UserRole,
  permissionCodes: string[]
): Promise<Record<string, boolean>> {
  // SUPER_ADMIN always has all permissions
  if (role === UserRole.SUPER_ADMIN) {
    return permissionCodes.reduce((acc, code) => {
      acc[code] = true
      return acc
    }, {} as Record<string, boolean>)
  }

  const permissions = await prisma.permission.findMany({
    where: { 
      code: { in: permissionCodes },
      isActive: true,
    },
    include: {
      rolePermissions: {
        where: { role, isGranted: true },
      },
    },
  })

  return permissionCodes.reduce((acc, code) => {
    const perm = permissions.find(p => p.code === code)
    acc[code] = perm?.rolePermissions.length ? true : false
    return acc
  }, {} as Record<string, boolean>)
}

// Create a new module (admin only)
export async function createModule(data: {
  code: string
  name: string
  description?: string
  icon?: string
}) {
  await requireSuperAdmin()

  const module = await prisma.permissionModule.create({
    data: {
      ...data,
      sortOrder: await prisma.permissionModule.count(),
    },
  })

  revalidatePath('/admin/roles')
  return module
}

// Create a new permission (admin only)
export async function createPermission(data: {
  moduleId: string
  code: string
  name: string
  description?: string
  action: string
}) {
  await requireSuperAdmin()

  const permission = await prisma.permission.create({
    data: {
      ...data,
      sortOrder: await prisma.permission.count({ where: { moduleId: data.moduleId } }),
    },
  })

  // Auto-grant to SUPER_ADMIN
  await prisma.rolePermission.create({
    data: {
      role: UserRole.SUPER_ADMIN,
      permissionId: permission.id,
      isGranted: true,
    },
  })

  revalidatePath('/admin/roles')
  return permission
}
