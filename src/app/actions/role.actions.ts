'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Get all active roles ordered by priority (FN/ADM/STF/007)
 */
export async function getRolesAction() {
  try {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    return { success: true as const, roles };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      roles: [],
    };
  }
}

/**
 * Get all roles including inactive
 */
export async function getAllRolesAction() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { staffRoles: true },
        },
      },
    });
    return { success: true as const, roles };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      roles: [],
    };
  }
}

/**
 * Create a new role
 */
export async function createRoleAction(data: { name: string; order: number }) {
  try {
    // Check for duplicate name
    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return {
        success: false as const,
        error: 'Role name already exists',
        role: null,
      };
    }

    // Check for duplicate order
    const orderExists = await prisma.role.findUnique({
      where: { order: data.order },
    });

    if (orderExists) {
      return {
        success: false as const,
        error: 'Order value already in use',
        role: null,
      };
    }

    const role = await prisma.role.create({
      data: {
        name: data.name.toUpperCase(),
        order: data.order,
        isActive: true,
      },
    });

    revalidatePath('/config/roles');
    return { success: true as const, role };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      role: null,
    };
  }
}

/**
 * Update a role
 */
export async function updateRoleAction(
  id: string,
  data: { name?: string; order?: number; isActive?: boolean }
) {
  try {
    // Check for duplicate name if changing
    if (data.name) {
      const existing = await prisma.role.findFirst({
        where: { name: data.name, id: { not: id } },
      });
      if (existing) {
        return {
          success: false as const,
          error: 'Role name already exists',
          role: null,
        };
      }
    }

    // Check for duplicate order if changing
    if (data.order !== undefined) {
      const orderExists = await prisma.role.findFirst({
        where: { order: data.order, id: { not: id } },
      });
      if (orderExists) {
        return {
          success: false as const,
          error: 'Order value already in use',
          role: null,
        };
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.toUpperCase() }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    revalidatePath('/config/roles');
    return { success: true as const, role };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      role: null,
    };
  }
}

/**
 * Toggle role active status
 */
export async function toggleRoleActiveAction(id: string) {
  try {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return {
        success: false as const,
        error: 'Role not found',
      };
    }

    await prisma.role.update({
      where: { id },
      data: { isActive: !role.isActive },
    });

    revalidatePath('/config/roles');
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a role (only if no staff assigned)
 */
export async function deleteRoleAction(id: string) {
  try {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { staffRoles: true } } },
    });

    if (!role) {
      return {
        success: false as const,
        error: 'Role not found',
      };
    }

    if (role._count.staffRoles > 0) {
      return {
        success: false as const,
        error: `Cannot delete role: ${role._count.staffRoles} staff member(s) assigned`,
      };
    }

    await prisma.role.delete({ where: { id } });

    revalidatePath('/config/roles');
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
