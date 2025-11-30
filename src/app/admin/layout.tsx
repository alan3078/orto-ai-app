import { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { PermissionProvider } from '@/providers/permission-provider'
import { getRoutePermission, isSuperAdmin } from '@/lib/permissions'
import { headers } from 'next/headers'
import { getPermissionsForRole } from '@/app/actions/permission.actions'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  const userRole = session.user.role as UserRole
  
  // Fetch user's granted permissions from database
  const permissions = await getPermissionsForRole(userRole)
  const grantedPermissions = permissions.map(p => p.code)
  
  // Get current pathname from headers for route permission check
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  
  // Check if user has permission to access this route
  if (pathname) {
    const requiredPermission = getRoutePermission(pathname)
    if (requiredPermission) {
      // Super admin always has access
      const hasAccess = isSuperAdmin(userRole) || grantedPermissions.includes(requiredPermission)
      if (!hasAccess) {
        redirect('/admin/home')
      }
    }
  }

  return (
    <PermissionProvider role={userRole} grantedPermissions={grantedPermissions}>
      <div className="flex min-h-screen w-full">
        <Sidebar userRole={userRole} grantedPermissions={grantedPermissions} />
        <div className="flex flex-1 flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto bg-muted/40 p-6">
            {children}
          </main>
        </div>
      </div>
    </PermissionProvider>
  )
}
