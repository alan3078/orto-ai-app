'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { StaffGroupSelector } from '@/features/dashboard/components/staff-group-selector'
import { ConstraintBuilder } from '@/features/dashboard/components/constraint-builder'
import { RosterControls } from '@/features/dashboard/components/roster-controls'
import { RosterGrid } from '@/features/dashboard/components/roster-grid'
import { ValidationResults } from '@/features/dashboard/components/validation-results'
import { useRoster } from '@/features/dashboard/hooks/use-roster'

interface StaffGroup {
  id: string
  name: string
  description?: string | null
  memberCount: number
  isActive?: boolean
}

export default function RosterManagementPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedStaffGroup, setSelectedStaffGroup] = useState<StaffGroup | null>(null)
  const [shiftType, setShiftType] = useState<'APN' | 'DAY_NIGHT'>('APN')
  const { data: roster } = useRoster({ month: selectedMonth })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roster Management</h1>
        <p className="text-muted-foreground">Select a staff group, manage active constraints, then view the roster.</p>
      </div>
      <StaffGroupSelector onSelect={setSelectedStaffGroup} />
      <ConstraintBuilder shiftType={shiftType} />
      <RosterControls 
        selectedMonth={selectedMonth} 
        onMonthChange={setSelectedMonth}
        selectedStaffGroupId={selectedStaffGroup?.id}
        shiftType={shiftType}
        onShiftTypeChange={setShiftType}
      />
      <RosterGrid month={selectedMonth} />
      {roster?.id && roster.status === 'COMPLETED' && (
        <ValidationResults rosterId={roster.id} />
      )}
    </div>
  )
}
