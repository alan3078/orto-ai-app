'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlayCircle, Download, Loader2, CheckCircle } from 'lucide-react'
import { useStaff } from '../hooks/use-staff'
import { useConstraints } from '../hooks/use-constraints'
import { useGenerateRoster, useRoster } from '../hooks/use-roster'
import { format, startOfMonth, getDaysInMonth, subMonths } from 'date-fns'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { ValidationModal } from './validation-modal'

interface RosterControlsProps {
  selectedMonth: string
  onMonthChange: (month: string) => void
  selectedStaffGroupId?: string
}

export function RosterControls({ selectedMonth, onMonthChange, selectedStaffGroupId }: RosterControlsProps) {
  const { data: staff } = useStaff()
  const { data: constraints } = useConstraints()
  const generateRoster = useGenerateRoster()
  const { data: roster } = useRoster({ month: selectedMonth })
  const [shiftType, setShiftType] = useState<'APN' | 'DAY_NIGHT'>('APN')

  // Filter staff by selected staff group
  const filteredStaff = staff?.filter((s: any) => {
    if (!selectedStaffGroupId) return true // No filter, include all staff
    return s.staffGroupId === selectedStaffGroupId
  })

  // Generate list of last 3 months for selector
  const months = Array.from({ length: 3 }, (_, i) => {
    const date = subMonths(new Date(), i)
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    }
  })

  const handleGenerate = async () => {
    if (!filteredStaff || filteredStaff.length === 0) {
      if (selectedStaffGroupId) {
        toast.error('No staff members in the selected group')
      } else {
        toast.error('Please add at least one staff member before generating a roster')
      }
      return
    }

    const startDate = startOfMonth(new Date(selectedMonth + '-01'))
    const timeSlots = getDaysInMonth(startDate)

    try {
      await generateRoster.mutateAsync({
        name: `Roster - ${format(startDate, 'MMMM yyyy')}`,
        startDate: startDate.toISOString(),
        timeSlots,
        staffIds: filteredStaff.map((s: any) => s.id),
        constraintIds: (constraints || []).filter((c: any) => c.isActive).map((c: any) => c.id),
        shiftType,
      })
    } catch (error) {
      // Error handled by hook
    }
  }

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            Roster: {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
          </h2>
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generateRoster.isPending || !filteredStaff || filteredStaff.length === 0}
          >
            {generateRoster.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Generate Roster
              </>
            )}
          </Button>

          {roster && roster.status === 'COMPLETED' && (
            <ValidationModal rosterId={roster.id}>
              <Button variant="outline">
                <CheckCircle className="mr-2 h-4 w-4" />
                Validate Roster
              </Button>
            </ValidationModal>
          )}

          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="shift-type" className="text-sm font-medium">Shift Type:</Label>
          <Select value={shiftType} onValueChange={(value) => setShiftType(value as 'APN' | 'DAY_NIGHT')}>
            <SelectTrigger id="shift-type" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APN">A/P/N (Afternoon/PM/Night)</SelectItem>
              <SelectItem value="DAY_NIGHT">Day/Night</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
