import Link from 'next/link'
import { ShiftDefinitionManagement } from '@/features/dashboard/components/shift-definition-management'
import { ShiftTypeConfigManagement } from '@/features/dashboard/components/shift-type-config-management'
import { Button } from '@/components/ui/button'
import { Clock, Settings } from 'lucide-react'
import { ROUTES } from '@/lib/routes'

export default function ShiftSettingsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shift Settings</h1>
        <p className="text-muted-foreground">
          Manage shift definitions and working hour configurations
        </p>
      </div>

      {/* Config Navigation Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Link href={ROUTES.ADMIN.CONFIG}>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Scheduling Policies
          </Button>
        </Link>
        <Link href={ROUTES.ADMIN.SHIFT_SETTINGS}>
          <Button variant="default" size="sm" className="gap-2">
            <Clock className="h-4 w-4" />
            Shift Settings
          </Button>
        </Link>
      </div>
      
      {/* Shift Type Working Hours Configuration */}
      <ShiftTypeConfigManagement />
      
      {/* Shift Definitions (code, start time, duration) */}
      <ShiftDefinitionManagement />
    </div>
  )
}

