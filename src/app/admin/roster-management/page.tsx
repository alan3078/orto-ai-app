'use client'

import { useState } from 'react'
import { getCurrentMonthISO } from '@/lib/date-time.utils'
import { ShiftType } from '@/types/enums'
import { StaffGroupSelector } from '@/features/dashboard/components/staff-group-selector'
import { ConstraintBuilder } from '@/features/dashboard/components/constraint-builder'
import { RosterControls } from '@/features/dashboard/components/roster-controls'
import { RosterGrid } from '@/features/dashboard/components/roster-grid'
import { MultiMonthRosterGrid } from '@/features/dashboard/components/multi-month-roster-grid'
import { ValidationResults } from '@/features/dashboard/components/validation-results'
import { useRoster } from '@/features/dashboard/hooks/use-roster'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface StaffGroup {
  id: string
  name: string
  description?: string | null
  memberCount: number
  isActive?: boolean
}

export default function RosterManagementPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthISO())
  const [selectedStaffGroup, setSelectedStaffGroup] = useState<StaffGroup | null>(null)
  const [shiftType, setShiftType] = useState<ShiftType>(ShiftType.APN)
  const [multiMonthView, setMultiMonthView] = useState(false)
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
      
      {/* View Toggle */}
      <div className="flex items-center space-x-2">
        <Switch 
          id="multi-month-view" 
          checked={multiMonthView}
          onCheckedChange={setMultiMonthView}
        />
        <Label htmlFor="multi-month-view" className="text-sm font-medium">
          Multi-month view (swipe to see month boundaries)
        </Label>
      </div>
      
      {/* Roster Grid */}
      {multiMonthView ? (
        <MultiMonthRosterGrid 
          month={selectedMonth}
        />
      ) : (
        <RosterGrid month={selectedMonth} />
      )}
      
      {roster?.id && roster.status === 'COMPLETED' && (
        <ValidationResults rosterId={roster.id} />
      )}
    </div>
  )
}
