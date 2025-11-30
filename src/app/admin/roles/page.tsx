import { RolePermissionsView } from './role-permissions-view'
import { getPermissionMatrix } from '@/app/actions/permission.actions'

export default async function RolesPage() {
  const { modules, permissionRoleMap } = await getPermissionMatrix()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Role & Permission Management</h1>
        <p className="text-muted-foreground">
          Configure permissions for each role. Changes are saved automatically.
        </p>
      </div>

      <RolePermissionsView 
        modules={modules} 
        permissionRoleMap={permissionRoleMap} 
      />
    </div>
  )
}
