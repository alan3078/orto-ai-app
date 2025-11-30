import { UserRole } from '@prisma/client'

/**
 * Dynamic Role-based permissions system (FN/ADM/AUTH/002)
 * 
 * Permissions are stored in database and can be configured via UI.
 * This file provides helper functions and cached permission checks.
 * 
 * Roles:
 * - SUPER_ADMIN: Full system access (always has all permissions)
 * - ADMIN: Manager access (configurable permissions)
 * - USER: Staff access (configurable permissions)
 */

// Display names for UI (Admin shows as "Manager", User shows as "Staff")
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ADMIN]: 'Manager',
  [UserRole.USER]: 'Staff',
}

// Role descriptions for UI
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Full system access including all permissions. Cannot be modified.',
  [UserRole.ADMIN]: 'Configurable permissions for management tasks.',
  [UserRole.USER]: 'Configurable permissions for regular users.',
}

// Standard CRUD actions
export const CRUD_ACTIONS = ['create', 'read', 'update', 'delete'] as const
export type CrudAction = typeof CRUD_ACTIONS[number]

// Get display name for a role
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || role
}

// Get description for a role
export function getRoleDescription(role: UserRole): string {
  return ROLE_DESCRIPTIONS[role] || ''
}

// Check if user is super admin (always has all permissions)
export function isSuperAdmin(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN
}

// Check if user has at least admin-level role
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN
}

// Role hierarchy for comparison (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPER_ADMIN]: 3,
}

// Check if roleA has at least as much permission as roleB
export function hasAtLeastRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// Get all roles as array (useful for UI)
export function getAllRoles(): UserRole[] {
  return [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]
}

// Get action display name
export function getActionDisplayName(action: string): string {
  const actionNames: Record<string, string> = {
    create: 'Create',
    read: 'View',
    update: 'Edit',
    delete: 'Delete',
    publish: 'Publish',
    approve: 'Approve',
    export: 'Export',
    reset_password: 'Reset Password',
  }
  return actionNames[action] || action.charAt(0).toUpperCase() + action.slice(1)
}

// Permission code format: "module:action" e.g., "staff:create", "roster:read"
export function buildPermissionCode(module: string, action: string): string {
  return `${module}:${action}`
}

export function parsePermissionCode(code: string): { module: string; action: string } {
  const [module, action] = code.split(':')
  return { module, action }
}

// Route to permission mapping (for automatic route guarding)
// Maps route patterns to required permission codes
export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/admin/users': 'user:read',
  '/admin/roles': 'role_permission:read',
  '/admin/staff': 'staff:read',
  '/admin/staff-groups': 'staff_group:read',
  '/admin/roster-management': 'roster:read',
  '/admin/config': 'system_config:read',
}

// Check if a user can access a route based on their permissions
// This is used by the layout for route guarding
export function getRoutePermission(pathname: string): string | null {
  // Find matching route permission (exact match or prefix match)
  const routeKey = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
  
  return routeKey ? ROUTE_PERMISSIONS[routeKey] : null
}

