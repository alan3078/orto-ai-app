'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaff } from '../hooks/use-staff';
import { useCreateLeave } from '../hooks/use-leaves';
import { usePermission } from '@/providers/permission-provider';
import {
  LEAVE_TYPE_CONFIG,
  LEAVE_STATUS_CONFIG,
  type LeaveType,
  type LeaveStatus,
} from '@/lib/leave.types';
import { format, parse, differenceInDays } from 'date-fns';

interface CreateLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLeaveDialog({ open, onOpenChange }: CreateLeaveDialogProps) {
  const { data: session } = useSession();
  const { isSuperAdmin } = usePermission();
  // Only super admins need the staff list to select from all staff
  const { data: staff, isLoading: staffLoading } = useStaff();
  const createLeave = useCreateLeave();

  // Get current user info from session
  const currentUserStaffId = session?.user?.staffId;
  const currentUserName = session?.user?.name;

  // Get available staff based on role (only used by super admins)
  const availableStaff = useMemo(() => {
    if (!isSuperAdmin) return [];
    return staff?.filter((s) => s.isActive) || [];
  }, [staff, isSuperAdmin]);

  const [formData, setFormData] = useState({
    staffId: '',
    selectedDates: [] as Date[],
    leaveType: 'AL' as LeaveType,
    status: 'PENDING' as LeaveStatus, // Default to PENDING for approval workflow
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select staff for non-super-admin users
  useEffect(() => {
    if (!isSuperAdmin && currentUserStaffId) {
      setFormData((prev) => ({ ...prev, staffId: currentUserStaffId }));
    }
  }, [isSuperAdmin, currentUserStaffId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.staffId || formData.selectedDates.length === 0) {
      return;
    }

    setIsSubmitting(true);

    // Sort dates
    const sortedDates = [...formData.selectedDates].sort((a, b) => a.getTime() - b.getTime());

    // Group into ranges
    const ranges: { start: Date; end: Date }[] = [];
    if (sortedDates.length > 0) {
      let currentStart = sortedDates[0];
      let currentEnd = sortedDates[0];

      for (let i = 1; i < sortedDates.length; i++) {
        const date = sortedDates[i];
        const diff = differenceInDays(date, currentEnd);

        if (diff === 1) {
          // Contiguous
          currentEnd = date;
        } else {
          // Gap found, push current range and start new one
          ranges.push({ start: currentStart, end: currentEnd });
          currentStart = date;
          currentEnd = date;
        }
      }
      ranges.push({ start: currentStart, end: currentEnd });
    }

    // Submit all ranges
    try {
      await Promise.all(
        ranges.map((range) =>
          createLeave.mutateAsync({
            staffId: formData.staffId,
            startDate: format(range.start, 'yyyy-MM-dd'),
            endDate: format(range.end, 'yyyy-MM-dd'),
            leaveType: formData.leaveType,
            status: isSuperAdmin ? formData.status : 'PENDING', // Non-super-admins always create PENDING
            notes: formData.notes || undefined,
          })
        )
      );

      // Reset form and close dialog
      setFormData({
        staffId: isSuperAdmin ? '' : currentUserStaffId || '',
        selectedDates: [],
        leaveType: 'AL',
        status: 'PENDING',
        notes: '',
      });
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in mutation hook
      console.error('Failed to create leaves', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Create Leave</DialogTitle>
          <DialogDescription>Add a new leave record for a staff member.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='grid gap-4 py-4'>
            {/* Staff Selection - Only show selector for super admins */}
            {isSuperAdmin ? (
              <div className='grid gap-2'>
                <Label htmlFor='staff'>Staff Member *</Label>
                {staffLoading ? (
                  <Skeleton className='h-9 w-full' />
                ) : (
                  <Select
                    value={formData.staffId}
                    onValueChange={(v) => setFormData({ ...formData, staffId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select staff member' />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStaff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.user?.name || s.visibleId} ({s.visibleId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              // Non-super-admins see their own name from session (no extra API call needed)
              <div className='grid gap-2'>
                <Label>Staff Member</Label>
                <div className='flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm'>
                  {currentUserName || session?.user?.username || 'You'}
                </div>
                <p className='text-xs text-muted-foreground'>
                  You can only add leave for yourself.
                </p>
              </div>
            )}

            {/* Leave Type */}
            <div className='grid gap-2'>
              <Label htmlFor='leaveType'>Leave Type *</Label>
              <Select
                value={formData.leaveType}
                onValueChange={(v) => setFormData({ ...formData, leaveType: v as LeaveType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select leave type' />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAVE_TYPE_CONFIG).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      {config.abbr} - {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className='grid gap-2'>
              <Label>Select Dates *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      formData.selectedDates.length === 0 && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className='mr-2 h-4 w-4' />
                    {formData.selectedDates.length > 0 ? (
                      <span>{formData.selectedDates.length} days selected</span>
                    ) : (
                      <span>Pick dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto p-0' align='start'>
                  <Calendar
                    mode='multiple'
                    selected={formData.selectedDates}
                    onSelect={(dates) => setFormData({ ...formData, selectedDates: dates || [] })}
                    disabled={(date) =>
                      !isSuperAdmin && date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {formData.selectedDates.length > 0 && (
                <p className='text-xs text-muted-foreground'>
                  Selected:{' '}
                  {formData.selectedDates
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((d) => format(d, 'MMM d'))
                    .join(', ')}
                </p>
              )}
            </div>

            {/* Status - Only visible to super admins for approval workflow */}
            {isSuperAdmin && (
              <div className='grid gap-2'>
                <Label htmlFor='status'>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as LeaveStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select status' />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAVE_STATUS_CONFIG).map(([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className='grid gap-2'>
              <Label htmlFor='notes'>Notes (optional)</Label>
              <Textarea
                id='notes'
                placeholder='Add any additional notes...'
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting || !formData.staffId}>
              {isSubmitting ? 'Creating...' : 'Create Leave'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
