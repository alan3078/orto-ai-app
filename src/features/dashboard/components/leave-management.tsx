'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
} from 'lucide-react';
import { useLeaves, useDeleteLeave, usePublicHolidays } from '../hooks/use-leaves';
import { CreateLeaveDialog } from './create-leave-dialog';
import { LEAVE_TYPE_CONFIG, LEAVE_STATUS_CONFIG, type LeaveType } from '@/lib/leave.types';
import { cn } from '@/lib/utils';
import {
  formatMonthISO,
  formatMonthDisplay,
  getMonthStart,
  getMonthEnd,
  FORMAT_DATE_ISO,
} from '@/lib/date-time.utils';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isWeekend,
} from 'date-fns';

// Type for leave record
interface LeaveRecord {
  id: string;
  staffId: string;
  startDate: Date | string;
  endDate: Date | string;
  leaveType: string;
  status: string;
  notes: string | null;
  staff?: {
    visibleId?: string;
    user?: { name?: string; email?: string | null } | null;
  } | null;
}

// Type for public holiday
interface PublicHoliday {
  id: string;
  date: Date | string;
  name: string;
  year: number;
}

export function LeaveManagement() {
  const [currentMonth, setCurrentMonth] = useState(() => formatMonthISO(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate date range for the current month
  const monthStart = getMonthStart(currentMonth);
  const monthEnd = getMonthEnd(currentMonth);

  // Fetch leaves for the current month
  const { data: leaves, isLoading: leavesLoading } = useLeaves({
    startDate: format(monthStart, FORMAT_DATE_ISO),
    endDate: format(monthEnd, FORMAT_DATE_ISO),
  });

  // Fetch public holidays for the current month
  const { data: holidays, isLoading: holidaysLoading } = usePublicHolidays({
    startDate: format(monthStart, FORMAT_DATE_ISO),
    endDate: format(monthEnd, FORMAT_DATE_ISO),
  });

  const deleteLeave = useDeleteLeave();

  // Filter leaves by type and search query
  const filteredLeaves = useMemo((): LeaveRecord[] => {
    if (!leaves) return [];
    return (leaves as LeaveRecord[]).filter((leave: LeaveRecord) => {
      // Type filter
      if (selectedLeaveType !== 'all' && leave.leaveType !== selectedLeaveType) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const staffName = leave.staff?.user?.name || leave.staff?.visibleId || '';
        return staffName.toLowerCase().includes(q) || leave.notes?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [leaves, selectedLeaveType, searchQuery]);

  const handlePrevMonth = () => {
    setCurrentMonth(formatMonthISO(subMonths(monthStart, 1)));
  };

  const handleNextMonth = () => {
    setCurrentMonth(formatMonthISO(addMonths(monthStart, 1)));
  };

  const handleDelete = (id: string, staffName: string) => {
    if (confirm(`Delete leave for ${staffName}? This cannot be undone.`)) {
      deleteLeave.mutate(id);
    }
  };

  const formatDateRange = (startDate: Date | string, endDate: Date | string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isSameDay(start, end)) {
      return format(start, 'MMM d, yyyy');
    }
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  // Calculate days in month for calendar view
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(monthStart),
    end: endOfMonth(monthStart),
  });

  // Build a map of date -> leaves for calendar view
  const leavesByDate = useMemo(() => {
    const map = new Map<string, LeaveRecord[]>();
    if (!leaves) return map;

    for (const leave of leaves) {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      const intervalStart = leaveStart < monthStart ? monthStart : leaveStart;
      const intervalEnd = leaveEnd > monthEnd ? monthEnd : leaveEnd;

      const days = eachDayOfInterval({
        start: intervalStart,
        end: intervalEnd,
      });
      for (const day of days) {
        const key = format(day, FORMAT_DATE_ISO);
        const existing = map.get(key) || [];
        map.set(key, [...existing, leave as LeaveRecord]);
      }
    }
    return map;
  }, [leaves, monthStart, monthEnd]);

  // Build a map of date -> holiday for calendar view
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, { name: string }>();
    if (!holidays) return map;
    for (const h of holidays as PublicHoliday[]) {
      const key = format(new Date(h.date), FORMAT_DATE_ISO);
      map.set(key, { name: h.name });
    }
    return map;
  }, [holidays]);

  return (
    <div className='space-y-6'>
      {/* Header with navigation */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' size='icon' onClick={handlePrevMonth}>
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <h2 className='text-xl font-semibold min-w-[180px] text-center'>
            {formatMonthDisplay(currentMonth)}
          </h2>
          <Button variant='outline' size='icon' onClick={handleNextMonth}>
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className='h-4 w-4 mr-2' />
          Add Leave
        </Button>
      </div>

      <Tabs defaultValue='calendar' className='w-full'>
        <TabsList>
          <TabsTrigger value='calendar'>
            <CalendarIcon className='h-4 w-4 mr-2' />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value='list'>
            <Sun className='h-4 w-4 mr-2' />
            List View
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value='calendar'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>Leave Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              {leavesLoading || holidaysLoading ? (
                <Skeleton className='h-[400px] w-full' />
              ) : (
                <div className='grid grid-cols-7 gap-1'>
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className='text-center text-sm font-medium text-muted-foreground py-2'
                    >
                      {day}
                    </div>
                  ))}

                  {/* Empty cells for days before the first of month */}
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-start-${i}`} className='h-24 border rounded-md bg-muted/20' />
                  ))}

                  {/* Days of the month */}
                  {daysInMonth.map((day) => {
                    const dateKey = format(day, FORMAT_DATE_ISO);
                    const dayLeaves = leavesByDate.get(dateKey) || [];
                    const holiday = holidaysByDate.get(dateKey);
                    const isToday = isSameDay(day, new Date());
                    const weekend = isWeekend(day);

                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          'h-24 border rounded-md p-1 overflow-hidden',
                          isToday && 'ring-2 ring-primary',
                          weekend && 'bg-muted/30',
                          holiday && 'bg-blue-50 dark:bg-blue-900/20'
                        )}
                      >
                        <div className='flex items-center justify-between mb-1'>
                          <span
                            className={cn(
                              'text-sm font-medium',
                              isToday && 'text-primary',
                              weekend && 'text-muted-foreground'
                            )}
                          >
                            {format(day, 'd')}
                          </span>
                          {holiday && (
                            <Badge
                              variant='outline'
                              className='text-[10px] px-1 py-0 bg-blue-100 text-blue-700 border-blue-200'
                              title={holiday.name}
                            >
                              PH
                            </Badge>
                          )}
                        </div>
                        <div className='space-y-0.5 overflow-y-auto max-h-[calc(100%-24px)]'>
                          {dayLeaves.slice(0, 3).map((leave: LeaveRecord, idx: number) => {
                            const config = LEAVE_TYPE_CONFIG[leave.leaveType as LeaveType];
                            return (
                              <div
                                key={`${leave.id}-${idx}`}
                                className={cn(
                                  'text-[10px] px-1 py-0.5 rounded truncate',
                                  config?.color || 'bg-gray-100'
                                )}
                                title={`${leave.staff?.user?.name || leave.staff?.visibleId}: ${config?.label}`}
                              >
                                {leave.staff?.user?.name?.split(' ')[0] || leave.staff?.visibleId}
                              </div>
                            );
                          })}
                          {dayLeaves.length > 3 && (
                            <div className='text-[10px] text-muted-foreground text-center'>
                              +{dayLeaves.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty cells for days after the last of month */}
                  {Array.from({ length: 6 - monthEnd.getDay() }).map((_, i) => (
                    <div key={`empty-end-${i}`} className='h-24 border rounded-md bg-muted/20' />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Public Holidays Card */}
          {holidays && holidays.length > 0 && (
            <Card className='mt-4'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <Sun className='h-5 w-5 text-blue-500' />
                  Public Holidays This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-2'>
                  {(holidays as PublicHoliday[]).map((h: PublicHoliday) => (
                    <Badge
                      key={h.id}
                      variant='outline'
                      className='bg-blue-50 text-blue-700 border-blue-200'
                    >
                      {format(new Date(h.date), 'MMM d')}: {h.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value='list'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex justify-between items-center'>
                <span>Leave Records</span>
                <div className='flex items-center gap-2'>
                  <Select
                    value={selectedLeaveType}
                    onValueChange={(v) => setSelectedLeaveType(v as LeaveType | 'all')}
                  >
                    <SelectTrigger className='h-8 w-36'>
                      <SelectValue placeholder='Leave Type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Types</SelectItem>
                      {Object.entries(LEAVE_TYPE_CONFIG).map(([type, config]) => (
                        <SelectItem key={type} value={type}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder='Search...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='h-8 w-40'
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leavesLoading ? (
                <div className='space-y-2'>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className='h-10 w-full' />
                  ))}
                </div>
              ) : filteredLeaves.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-8'>
                  No leaves found for this month.
                </p>
              ) : (
                <div className='max-h-[400px] overflow-y-auto border rounded-md'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeaves.map((leave: LeaveRecord) => {
                        const typeConfig = LEAVE_TYPE_CONFIG[leave.leaveType as LeaveType];
                        const statusConfig =
                          LEAVE_STATUS_CONFIG[leave.status as keyof typeof LEAVE_STATUS_CONFIG];
                        const staffName =
                          leave.staff?.user?.name || leave.staff?.visibleId || 'Unknown';

                        return (
                          <TableRow key={leave.id}>
                            <TableCell className='font-medium'>{staffName}</TableCell>
                            <TableCell>
                              <Badge variant='outline' className={cn('text-xs', typeConfig?.color)}>
                                {typeConfig?.abbr || leave.leaveType}
                              </Badge>
                            </TableCell>
                            <TableCell className='text-sm'>
                              {formatDateRange(leave.startDate, leave.endDate)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant='outline'
                                className={cn('text-xs', statusConfig?.color)}
                              >
                                {statusConfig?.label || leave.status}
                              </Badge>
                            </TableCell>
                            <TableCell className='text-sm text-muted-foreground max-w-[200px] truncate'>
                              {leave.notes || '—'}
                            </TableCell>
                            <TableCell className='text-right'>
                              <div className='flex justify-end gap-1'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-8 w-8 text-destructive hover:text-destructive'
                                  onClick={() => handleDelete(leave.id, staffName)}
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Leave Dialog */}
      <CreateLeaveDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
