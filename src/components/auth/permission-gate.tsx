'use client'

import { ReactNode } from 'react'
import { usePermission } from '@/providers/permission-provider'
import { redirect } from 'next/navigation'

interface PermissionGateProps {
  children: ReactNode
  /** Permission code to check (e.g., "staff:create") */
  permission?: string
  /** Module and action to check (alternative to permission code) */
  module?: string
  action?: string
  /** Only allow super admin */
  superAdminOnly?: boolean
  /** Fallback content when permission denied (if not provided, renders nothing) */
  fallback?: ReactNode
  /** Redirect path when permission denied (takes precedence over fallback) */
  redirectTo?: string
}

/**
 * Component to conditionally render content based on permissions
 * 
 * @example
 * // Using permission code
 * <PermissionGate permission="staff:create">
 *   <AddStaffButton />
 * </PermissionGate>
 * 
 * @example
 * // Using module and action
 * <PermissionGate module="staff" action="update">
 *   <EditStaffButton />
 * </PermissionGate>
 * 
 * @example
 * // Only show for super admin
 * <PermissionGate superAdminOnly>
 *   <SystemSettings />
 * </PermissionGate>
 * 
 * @example
 * // Show fallback when no permission
 * <PermissionGate permission="reports:read" fallback={<p>No access</p>}>
 *   <ReportsDashboard />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,
  module,
  action,
  superAdminOnly = false,
  fallback = null,
  redirectTo,
}: PermissionGateProps) {
  const { hasPermission, can, isSuperAdmin } = usePermission()

  let hasAccess = true

  if (superAdminOnly) {
    hasAccess = isSuperAdmin
  } else if (permission) {
    hasAccess = hasPermission(permission)
  } else if (module && action) {
    hasAccess = can(module, action)
  }

  if (!hasAccess) {
    if (redirectTo) {
      redirect(redirectTo)
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Component to hide content from users without permission
 * Simpler version that just hides content without fallback
 */
export function RequirePermission({
  children,
  permission,
  module,
  action,
}: {
  children: ReactNode
  permission?: string
  module?: string
  action?: string
}) {
  const { hasPermission, can } = usePermission()
  
  let hasAccess = false
  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (module && action) {
    hasAccess = can(module, action)
  }
  
  if (!hasAccess) {
    return null
  }
  
  return <>{children}</>
}

/**
 * Component to only show content to super admins
 */
export function SuperAdminOnly({ children }: { children: ReactNode }) {
  const { isSuperAdmin } = usePermission()
  
  if (!isSuperAdmin) {
    return null
  }
  
  return <>{children}</>
}

/**
 * Component to only show content to admins (ADMIN or SUPER_ADMIN)
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = usePermission()
  
  if (!isAdmin) {
    return null
  }
  
  return <>{children}</>
}

/**
 * Hook to check multiple permissions at once
 * @example const { canCreate, canEdit, canDelete } = usePermissions('staff')
 */
export function useModulePermissions(module: string) {
  const { can } = usePermission()
  
  return {
    canCreate: can(module, 'create'),
    canRead: can(module, 'read'),
    canUpdate: can(module, 'update'),
    canDelete: can(module, 'delete'),
  }
}
