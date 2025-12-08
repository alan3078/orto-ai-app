'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { UserRole } from '@prisma/client';
import { isSuperAdmin, isAdmin, getRoleDisplayName } from '@/lib/permissions';

// Permission from database
export interface PermissionData {
  code: string; // e.g., "staff:create"
  moduleCode: string;
  action: string;
}

interface PermissionContextValue {
  role: UserRole;
  permissions: Set<string>; // Set of permission codes
  /** Check if user has a specific permission by code (e.g., "staff:create") */
  hasPermission: (permissionCode: string) => boolean;
  /** Check if user can perform action on module (e.g., can("staff", "create")) */
  can: (module: string, action: string) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  roleDisplayName: string;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

interface PermissionProviderProps {
  children: ReactNode;
  role: UserRole;
  /** Granted permission codes from database */
  grantedPermissions?: string[];
}

export function PermissionProvider({
  children,
  role,
  grantedPermissions = [],
}: PermissionProviderProps) {
  const permissionSet = useMemo(() => new Set(grantedPermissions), [grantedPermissions]);
  const isSuperAdminRole = isSuperAdmin(role);

  const value: PermissionContextValue = useMemo(
    () => ({
      role,
      permissions: permissionSet,
      hasPermission: (permissionCode: string) => {
        // Super admin always has all permissions
        if (isSuperAdminRole) return true;
        return permissionSet.has(permissionCode);
      },
      can: (module: string, action: string) => {
        // Super admin always has all permissions
        if (isSuperAdminRole) return true;
        return permissionSet.has(`${module}:${action}`);
      },
      isSuperAdmin: isSuperAdminRole,
      isAdmin: isAdmin(role),
      roleDisplayName: getRoleDisplayName(role),
    }),
    [role, permissionSet, isSuperAdminRole]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Convenience hook for checking a specific permission
 * @example const canCreateStaff = useCanAccess('staff:create')
 */
export function useCanAccess(permissionCode: string): boolean {
  const { hasPermission } = usePermission();
  return hasPermission(permissionCode);
}

/**
 * Convenience hook for checking module/action permission
 * @example const canEdit = useCan('staff', 'update')
 */
export function useCan(module: string, action: string): boolean {
  const { can } = usePermission();
  return can(module, action);
}
