import { ShiftDefinitionManagement } from '@/features/dashboard/components/shift-definition-management'

export default function ShiftSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shift Settings</h1>
        <p className="text-muted-foreground">
          Manage shift definitions (code, start time, duration)
        </p>
      </div>
      <ShiftDefinitionManagement />
    </div>
  )
}
