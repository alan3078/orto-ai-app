import { RoleManagement } from '@/features/dashboard/components/role-management'

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground">
          Manage staff roles and their priority ordering
        </p>
      </div>
      <RoleManagement />
    </div>
  )
}
