'use client'

import { useState, useTransition } from 'react'
import { UserRole } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Shield,
  ShieldCheck,
  User as UserIcon,
  Loader2,
} from 'lucide-react'
import {
  getRoleDisplayName,
  getRoleDescription,
  getActionDisplayName,
} from '@/lib/permissions'
import { toggleRolePermission } from '@/app/actions/permission.actions'
import { toast } from 'sonner'

interface Permission {
  id: string
  code: string
  name: string
  description: string | null
  action: string
}

interface Module {
  id: string
  code: string
  name: string
  description: string | null
  icon: string | null
  permissions: Permission[]
}

interface RolePermissionsViewProps {
  modules: Module[]
  permissionRoleMap: Record<string, UserRole[]>
}

const roleIcons: Record<UserRole, typeof Shield> = {
  [UserRole.SUPER_ADMIN]: ShieldCheck,
  [UserRole.ADMIN]: Shield,
  [UserRole.USER]: UserIcon,
}

const roles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]

export function RolePermissionsView({ modules, permissionRoleMap }: RolePermissionsViewProps) {
  const [localPermissionMap, setLocalPermissionMap] = useState(permissionRoleMap)
  const [isPending, startTransition] = useTransition()
  const [pendingCell, setPendingCell] = useState<string | null>(null)

  const hasPermission = (permissionId: string, role: UserRole) => {
    return localPermissionMap[permissionId]?.includes(role) ?? false
  }

  const handleToggle = async (permissionId: string, role: UserRole, currentlyGranted: boolean) => {
    // Super admin permissions cannot be changed
    if (role === UserRole.SUPER_ADMIN) {
      toast.error('Super Admin permissions cannot be modified')
      return
    }

    const cellKey = `${permissionId}-${role}`
    setPendingCell(cellKey)

    // Optimistic update
    setLocalPermissionMap(prev => {
      const currentRoles = prev[permissionId] || []
      if (currentlyGranted) {
        return { ...prev, [permissionId]: currentRoles.filter(r => r !== role) }
      } else {
        return { ...prev, [permissionId]: [...currentRoles, role] }
      }
    })

    startTransition(async () => {
      try {
        await toggleRolePermission(role, permissionId, !currentlyGranted)
        toast.success(`Permission ${currentlyGranted ? 'revoked' : 'granted'}`)
      } catch (error) {
        // Revert on error
        setLocalPermissionMap(prev => {
          const currentRoles = prev[permissionId] || []
          if (currentlyGranted) {
            return { ...prev, [permissionId]: [...currentRoles, role] }
          } else {
            return { ...prev, [permissionId]: currentRoles.filter(r => r !== role) }
          }
        })
        toast.error('Failed to update permission')
      } finally {
        setPendingCell(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Role Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => {
          const Icon = roleIcons[role]
          return (
            <Card key={role}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle className="text-lg">{getRoleDisplayName(role)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{getRoleDescription(role)}</CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Permission Matrix */}
      <Tabs defaultValue="matrix" className="w-full">
        <TabsList>
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="by-module">By Module</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>
                Click toggles to grant or revoke permissions. Super Admin permissions cannot be changed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Module</TableHead>
                    <TableHead className="w-[150px]">Permission</TableHead>
                    {roles.map((role) => (
                      <TableHead key={role} className="text-center w-[120px]">
                        {getRoleDisplayName(role)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => (
                    module.permissions.map((permission, permIndex) => (
                      <TableRow key={permission.id}>
                        {permIndex === 0 && (
                          <TableCell rowSpan={module.permissions.length} className="font-medium align-top">
                            <div className="flex flex-col">
                              <span>{module.name}</span>
                              {module.description && (
                                <span className="text-xs text-muted-foreground">{module.description}</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="outline">{getActionDisplayName(permission.action)}</Badge>
                        </TableCell>
                        {roles.map((role) => {
                          const isGranted = hasPermission(permission.id, role)
                          const cellKey = `${permission.id}-${role}`
                          const isLoading = pendingCell === cellKey
                          const isSuperAdmin = role === UserRole.SUPER_ADMIN
                          
                          return (
                            <TableCell key={role} className="text-center">
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              ) : (
                                <Switch
                                  checked={isGranted}
                                  disabled={isSuperAdmin || isPending}
                                  onCheckedChange={() => handleToggle(permission.id, role, isGranted)}
                                  className={isSuperAdmin ? 'cursor-not-allowed opacity-50' : ''}
                                />
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-module" className="mt-4">
          <div className="grid gap-4">
            {modules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <CardTitle>{module.name}</CardTitle>
                  {module.description && (
                    <CardDescription>{module.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Permission</TableHead>
                        {roles.map((role) => (
                          <TableHead key={role} className="text-center">
                            {getRoleDisplayName(role)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {module.permissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{permission.name}</span>
                              {permission.description && (
                                <span className="text-xs text-muted-foreground">{permission.description}</span>
                              )}
                            </div>
                          </TableCell>
                          {roles.map((role) => {
                            const isGranted = hasPermission(permission.id, role)
                            const cellKey = `${permission.id}-${role}`
                            const isLoading = pendingCell === cellKey
                            const isSuperAdmin = role === UserRole.SUPER_ADMIN
                            
                            return (
                              <TableCell key={role} className="text-center">
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                ) : (
                                  <Switch
                                    checked={isGranted}
                                    disabled={isSuperAdmin || isPending}
                                    onCheckedChange={() => handleToggle(permission.id, role, isGranted)}
                                    className={isSuperAdmin ? 'cursor-not-allowed opacity-50' : ''}
                                  />
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Super Admin</strong> always has all permissions and cannot be modified</li>
            <li>• Check/uncheck boxes to grant/revoke permissions for Manager and Staff roles</li>
            <li>• Changes are saved automatically</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
