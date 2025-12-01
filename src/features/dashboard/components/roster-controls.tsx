'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlayCircle, Download, Loader2, CheckCircle } from 'lucide-react';
import { useStaff } from '../hooks/use-staff';
import { useConstraints } from '../hooks/use-constraints';
import { useGenerateRoster, useRoster } from '../hooks/use-roster';
import {
  formatMonthDisplay,
  getMonthStartNoon,
  getDaysInMonthFromISO,
  getPreviousMonths,
  generateRosterName,
} from '@/lib/date-time.utils';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { ShiftType } from '@/types/enums';
import type { Staff } from '@/types/staff';
import type { Constraint } from '@/types/roster';

interface RosterControlsProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  selectedStaffGroupId?: string;
  shiftType: ShiftType;
  onShiftTypeChange: (shiftType: ShiftType) => void;
}

export function RosterControls({
  selectedMonth,
  onMonthChange,
  selectedStaffGroupId,
  shiftType,
  onShiftTypeChange,
}: RosterControlsProps) {
  const { data: staff } = useStaff();
  const { data: constraints } = useConstraints();
  const generateRoster = useGenerateRoster();
  const { data: roster } = useRoster({ month: selectedMonth });

  // Filter staff by selected staff group
  const filteredStaff = staff?.filter((s: Staff) => {
    if (!selectedStaffGroupId) return true; // No filter, include all staff
    return s.staffGroupId === selectedStaffGroupId;
  });

  // Generate list of months for selector (1 ahead + 3 behind = 4 months total)
  const months = getPreviousMonths(4);

  const handleGenerate = async () => {
    if (!filteredStaff || filteredStaff.length === 0) {
      if (selectedStaffGroupId) {
        toast.error('No staff members in the selected group');
      } else {
        toast.error('Please add at least one staff member before generating a roster');
      }
      return;
    }

    // Use noon date to avoid timezone shift issues when ISO string crosses UTC midnight
    const startDate = getMonthStartNoon(selectedMonth);
    const timeSlots = getDaysInMonthFromISO(selectedMonth);

    try {
      await generateRoster.mutateAsync({
        name: generateRosterName(startDate),
        startDate: startDate.toISOString(),
        timeSlots,
        staffIds: filteredStaff.map((s: Staff) => s.id),
        constraintIds: (constraints || []).filter((c: Constraint) => c.isActive).map((c: Constraint) => c.id),
        shiftType,
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <div className='flex flex-col gap-4 mb-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div className='flex items-center gap-4'>
          <h2 className='text-2xl font-bold'>
            Roster: {formatMonthDisplay(selectedMonth)}
          </h2>
          <Select
            value={selectedMonth}
            onValueChange={onMonthChange}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem
                  key={month.value}
                  value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex gap-2'>
          <Button
            onClick={handleGenerate}
            disabled={generateRoster.isPending || !filteredStaff || filteredStaff.length === 0}>
            {generateRoster.isPending ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Generating...
              </>
            ) : (
              <>
                <PlayCircle className='mr-2 h-4 w-4' />
                Generate Roster
              </>
            )}
          </Button>

          <Button
            variant='outline'
            disabled>
            <Download className='mr-2 h-4 w-4' />
            Export CSV
          </Button>
        </div>
      </div>

      <div className='flex items-center gap-4'>
        <div className='flex items-center gap-2'>
          <Label
            htmlFor='shift-type'
            className='text-sm font-medium'>
            Shift Type:
          </Label>
          <Select
            value={shiftType}
            onValueChange={(value) => onShiftTypeChange(value as ShiftType)}>
            <SelectTrigger
              id='shift-type'
              className='w-[200px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ShiftType.APN}>A/P/N (Afternoon/PM/Night)</SelectItem>
              <SelectItem value={ShiftType.SEVEN_E}>7E (Day/Night 12h)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
