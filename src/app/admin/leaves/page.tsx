import { LeaveManagement } from '@/features/dashboard/components/leave-management'

export default function LeavesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-muted-foreground">Manage staff leaves and view public holidays</p>
      </div>
      <LeaveManagement />
    </div>
  )
}
