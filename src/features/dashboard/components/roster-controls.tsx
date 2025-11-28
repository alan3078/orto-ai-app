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
  getMonthStart,
  getDaysInMonthFromISO,
  getPreviousMonths,
  generateRosterName,
} from '@/lib/date-time.utils';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { ShiftType } from '@/types/enums';

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
  const filteredStaff = staff?.filter((s: any) => {
    if (!selectedStaffGroupId) return true; // No filter, include all staff
    return s.staffGroupId === selectedStaffGroupId;
  });

  // Debug logging
  console.log('[RosterControls] Total staff from useStaff:', staff?.length);
  console.log('[RosterControls] selectedStaffGroupId:', selectedStaffGroupId);
  console.log('[RosterControls] Filtered staff count:', filteredStaff?.length);
  if (staff?.length && staff.length > 0) {
    console.log('[RosterControls] Staff sample:', staff.slice(0, 3).map((s: any) => ({ id: s.id, name: s.name, staffGroupId: s.staffGroupId })));
  }

  // Generate list of last 3 months for selector
  const months = getPreviousMonths(3);

  const handleGenerate = async () => {
    if (!filteredStaff || filteredStaff.length === 0) {
      if (selectedStaffGroupId) {
        toast.error('No staff members in the selected group');
      } else {
        toast.error('Please add at least one staff member before generating a roster');
      }
      return;
    }

    const startDate = getMonthStart(selectedMonth);
    const timeSlots = getDaysInMonthFromISO(selectedMonth);

    try {
      await generateRoster.mutateAsync({
        name: generateRosterName(startDate),
        startDate: startDate.toISOString(),
        timeSlots,
        staffIds: filteredStaff.map((s: any) => s.id),
        constraintIds: (constraints || []).filter((c: any) => c.isActive).map((c: any) => c.id),
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
