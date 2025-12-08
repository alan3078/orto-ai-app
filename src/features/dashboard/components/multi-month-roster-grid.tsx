'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRoster } from '../hooks/use-roster';
import { StateBadge, APN_STATE_CONFIG, SEVEN_E_STATE_CONFIG } from './state-badge';
import {
  addDays,
  formatDateShort,
  FORMAT_DATE_ISO,
  formatMonthDisplay,
  subMonths,
  addMonths,
  formatMonthISO,
  parseMonthISO,
} from '@/lib/date-time.utils';
import { ShiftType } from '@/types/enums';
import { cn } from '@/lib/utils';
import { LEAVE_TYPE_CONFIG, type LeaveType } from '@/lib/leave.types';
import { format, eachDayOfInterval, getDaysInMonth, startOfMonth } from 'date-fns';

interface MultiMonthRosterGridProps {
  month: string; // "2025-11" - the primary/current month
  showPreviousMonthDays?: number; // Number of days from previous month to show (default: 3)
  showNextMonthDays?: number; // Number of days from next month to show (default: 3)
}

export function MultiMonthRosterGrid({
  month,
  showPreviousMonthDays = 3,
  showNextMonthDays = 3,
}: MultiMonthRosterGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentMonthRef = useRef<HTMLTableCellElement>(null);

  // Calculate previous and next month strings (using safe parseMonthISO)
  const currentDate = parseMonthISO(month);
  const previousMonth = formatMonthISO(subMonths(currentDate, 1));
  const nextMonth = formatMonthISO(addMonths(currentDate, 1));

  // Fetch all three months
  const { data: prevRoster, isLoading: prevLoading } = useRoster({
    month: previousMonth,
  });
  const { data: currentRoster, isLoading: currentLoading } = useRoster({
    month,
  });
  const { data: nextRoster, isLoading: nextLoading } = useRoster({
    month: nextMonth,
  });

  const isLoading = prevLoading || currentLoading || nextLoading;
  const roster = currentRoster; // Primary roster for status display

  // Build combined staff list from all rosters
  const allStaff = useMemo(() => {
    const staffMap = new Map<string, any>();

    // Collect staff from all rosters
    [prevRoster, currentRoster, nextRoster].forEach((r) => {
      if (r?.shifts) {
        r.shifts.forEach((shift: any) => {
          if (!staffMap.has(shift.staffId)) {
            staffMap.set(shift.staffId, shift.staff);
          }
        });
      }
    });

    return Array.from(staffMap.values()).sort(
      (a, b) =>
        (a.rank || '').localeCompare(b.rank || '') ||
        (a.visibleId || '').localeCompare(b.visibleId || '')
    );
  }, [prevRoster, currentRoster, nextRoster]);

  // Build combined date columns
  const dateColumns = useMemo(() => {
    const columns: Array<{
      date: Date;
      monthType: 'previous' | 'current' | 'next';
      dayIndex: number; // Index within that month's roster
      roster: any;
    }> = [];

    // Previous month - last N days
    if (prevRoster?.startDate && prevRoster?.timeSlots) {
      const prevStart = new Date(prevRoster.startDate);
      const prevDays = prevRoster.timeSlots;
      const startIndex = Math.max(0, prevDays - showPreviousMonthDays);

      for (let i = startIndex; i < prevDays; i++) {
        columns.push({
          date: addDays(prevStart, i),
          monthType: 'previous',
          dayIndex: i,
          roster: prevRoster,
        });
      }
    } else if (showPreviousMonthDays > 0) {
      // No previous roster, but show placeholder dates
      const prevMonthDate = subMonths(currentDate, 1);
      const daysInPrev = getDaysInMonth(prevMonthDate);
      const prevStart = startOfMonth(prevMonthDate);

      for (let i = daysInPrev - showPreviousMonthDays; i < daysInPrev; i++) {
        columns.push({
          date: addDays(prevStart, i),
          monthType: 'previous',
          dayIndex: i,
          roster: null,
        });
      }
    }

    // Current month - all days
    if (currentRoster?.startDate && currentRoster?.timeSlots) {
      const currentStart = new Date(currentRoster.startDate);
      for (let i = 0; i < currentRoster.timeSlots; i++) {
        columns.push({
          date: addDays(currentStart, i),
          monthType: 'current',
          dayIndex: i,
          roster: currentRoster,
        });
      }
    }

    // Next month - first N days
    if (nextRoster?.startDate && nextRoster?.timeSlots) {
      const nextStart = new Date(nextRoster.startDate);
      const daysToShow = Math.min(showNextMonthDays, nextRoster.timeSlots);

      for (let i = 0; i < daysToShow; i++) {
        columns.push({
          date: addDays(nextStart, i),
          monthType: 'next',
          dayIndex: i,
          roster: nextRoster,
        });
      }
    } else if (showNextMonthDays > 0) {
      // No next roster, but show placeholder dates
      const nextMonthDate = addMonths(currentDate, 1);
      const nextStart = startOfMonth(nextMonthDate);

      for (let i = 0; i < showNextMonthDays; i++) {
        columns.push({
          date: addDays(nextStart, i),
          monthType: 'next',
          dayIndex: i,
          roster: null,
        });
      }
    }

    return columns;
  }, [
    prevRoster,
    currentRoster,
    nextRoster,
    showPreviousMonthDays,
    showNextMonthDays,
    currentDate,
  ]);

  // Build shift lookup by staff and date
  const shiftLookup = useMemo(() => {
    const lookup = new Map<string, any>(); // key: `${staffId}-${dateISO}`

    [prevRoster, currentRoster, nextRoster].forEach((r) => {
      if (r?.shifts && r?.startDate) {
        const startDate = new Date(r.startDate);
        r.shifts.forEach((shift: any) => {
          const date = addDays(startDate, shift.timeSlot);
          const key = `${shift.staffId}-${format(date, FORMAT_DATE_ISO)}`;
          lookup.set(key, shift);
        });
      }
    });

    return lookup;
  }, [prevRoster, currentRoster, nextRoster]);

  // Build leave lookup
  const leaveLookup = useMemo(() => {
    const lookup = new Map<string, { leaveType: LeaveType; notes: string | null }>();

    [prevRoster, currentRoster, nextRoster].forEach((r) => {
      if (r?.leaves && r?.startDate && r?.endDate) {
        const rosterStart = new Date(r.startDate);
        const rosterEnd = new Date(r.endDate);

        r.leaves.forEach((leave: any) => {
          const leaveStart = new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate);

          const intervalStart = leaveStart < rosterStart ? rosterStart : leaveStart;
          const intervalEnd = leaveEnd > rosterEnd ? rosterEnd : leaveEnd;

          if (intervalStart <= intervalEnd) {
            const days = eachDayOfInterval({
              start: intervalStart,
              end: intervalEnd,
            });
            days.forEach((day) => {
              const key = `${leave.staffId}-${format(day, FORMAT_DATE_ISO)}`;
              lookup.set(key, {
                leaveType: leave.leaveType as LeaveType,
                notes: leave.notes,
              });
            });
          }
        });
      }
    });

    return lookup;
  }, [prevRoster, currentRoster, nextRoster]);

  // Get shift type from current roster
  const shiftType = useMemo(() => {
    return currentRoster && 'shiftType' in currentRoster && currentRoster.shiftType
      ? (currentRoster.shiftType as ShiftType)
      : ShiftType.SEVEN_E;
  }, [currentRoster]);

  const getShiftConfig = (state: number) => {
    const config = shiftType === ShiftType.APN ? APN_STATE_CONFIG : SEVEN_E_STATE_CONFIG;
    return config[state as keyof typeof config] || config[0];
  };

  // Scroll to current month on mount
  useEffect(() => {
    if (currentMonthRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = currentMonthRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Scroll so current month starts near the left (with some padding)
      const scrollLeft = element.offsetLeft - 280; // Account for sticky columns
      container.scrollLeft = Math.max(0, scrollLeft);
    }
  }, [dateColumns]);

  // Loading state
  if (isLoading && !currentRoster) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-4 w-72' />
        </CardHeader>
        <CardContent className='p-6'>
          <Skeleton className='h-[400px] w-full' />
        </CardContent>
      </Card>
    );
  }

  // No roster exists for current month
  if (!currentRoster) {
    return (
      <Card className='flex flex-col items-center justify-center h-[400px] border-dashed'>
        <CalendarIcon className='h-16 w-16 text-muted-foreground mb-4' />
        <p className='text-lg font-medium'>No roster generated for {formatMonthDisplay(month)}</p>
        <p className='text-sm text-muted-foreground mt-2'>
          Add staff and constraints, then click "Generate Roster"
        </p>
      </Card>
    );
  }

  // Failed state
  if (roster?.status === 'FAILED') {
    return (
      <Alert variant='destructive'>
        <AlertCircle className='h-4 w-4' />
        <AlertTitle>Generation Failed</AlertTitle>
        <AlertDescription>
          {roster.errorMessage || 'An error occurred while generating the roster.'}
        </AlertDescription>
      </Alert>
    );
  }

  // Find the index of first current month column
  const firstCurrentMonthIndex = dateColumns.findIndex((col) => col.monthType === 'current');

  return (
    <Card className='border-2 shadow-sm overflow-hidden'>
      <CardHeader className='border-b bg-muted/40 py-4'>
        <div className='flex items-center justify-between'>
          <div className='space-y-1'>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <CalendarIcon className='h-5 w-5 text-primary' />
              Multi-Month Roster View
            </CardTitle>
            <CardDescription className='flex items-center gap-2'>
              <span className='px-2 py-0.5 rounded bg-muted text-xs'>
                {formatMonthDisplay(previousMonth)}
              </span>
              <ChevronRight className='h-3 w-3' />
              <span className='px-2 py-0.5 rounded bg-primary/10 text-primary font-medium text-xs'>
                {formatMonthDisplay(month)}
              </span>
              <ChevronRight className='h-3 w-3' />
              <span className='px-2 py-0.5 rounded bg-muted text-xs'>
                {formatMonthDisplay(nextMonth)}
              </span>
            </CardDescription>
          </div>
          <div className='flex items-center gap-2 text-sm text-muted-foreground bg-background px-3 py-1 rounded-md border'>
            <Clock className='h-4 w-4' />
            <span>{roster?.solveTimeMs ? `${roster.solveTimeMs.toFixed(0)}ms` : '0ms'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-0'>
        <div
          ref={scrollContainerRef}
          className='overflow-x-auto'
          style={{ scrollBehavior: 'smooth' }}
        >
          <Table className='table-fixed'>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='sticky left-0 z-20 bg-background w-[80px] min-w-[80px] font-semibold pl-4'>
                  Rank
                </TableHead>
                <TableHead className='sticky left-[80px] z-20 bg-background w-[180px] min-w-[180px] font-semibold border-r shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)]'>
                  Staff Name
                </TableHead>
                {dateColumns.map((col, i) => {
                  const isWeekend = col.date.getDay() === 0 || col.date.getDay() === 6;
                  const isFirstOfCurrentMonth = i === firstCurrentMonthIndex;
                  const isMonthBoundary = i > 0 && dateColumns[i - 1].monthType !== col.monthType;

                  return (
                    <TableHead
                      key={i}
                      ref={isFirstOfCurrentMonth ? currentMonthRef : undefined}
                      className={cn(
                        'text-center w-[50px] min-w-[50px] p-1 h-auto',
                        isWeekend && 'bg-muted/30',
                        col.monthType === 'previous' && 'bg-orange-50/50 dark:bg-orange-950/20',
                        col.monthType === 'next' && 'bg-blue-50/50 dark:bg-blue-950/20',
                        isMonthBoundary && 'border-l-2 border-primary'
                      )}
                    >
                      <div className='flex flex-col items-center justify-center py-2'>
                        <span className='text-xs font-medium text-muted-foreground'>
                          {formatDateShort(col.date).split(' ')[0]}
                        </span>
                        <span
                          className={cn(
                            'text-sm font-bold',
                            isWeekend && 'text-primary',
                            col.monthType !== 'current' && 'opacity-60'
                          )}
                        >
                          {formatDateShort(col.date).split(' ')[1]}
                        </span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allStaff.map((staff: any) => (
                <TableRow key={staff.id} className='hover:bg-muted/50 transition-colors'>
                  <TableCell className='sticky left-0 z-10 bg-background w-[80px] min-w-[80px] font-medium text-muted-foreground pl-4'>
                    {staff.rank || '-'}
                  </TableCell>
                  <TableCell className='sticky left-[80px] z-10 bg-background w-[180px] min-w-[180px] font-medium border-r shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)]'>
                    <div
                      className='truncate max-w-[160px]'
                      title={staff.user?.name || staff.visibleId}
                    >
                      {staff.user?.name || staff.visibleId}
                    </div>
                  </TableCell>
                  {dateColumns.map((col, i) => {
                    const isWeekend = col.date.getDay() === 0 || col.date.getDay() === 6;
                    const isMonthBoundary = i > 0 && dateColumns[i - 1].monthType !== col.monthType;
                    const dateKey = format(col.date, FORMAT_DATE_ISO);
                    const shiftKey = `${staff.id}-${dateKey}`;
                    const shift = shiftLookup.get(shiftKey);
                    const leave = leaveLookup.get(shiftKey);
                    const config = shift ? getShiftConfig(shift.state) : null;
                    const leaveConfig = leave ? LEAVE_TYPE_CONFIG[leave.leaveType] : null;

                    return (
                      <TableCell
                        key={i}
                        className={cn(
                          'p-1 text-center border-l border-dashed',
                          isWeekend && 'bg-muted/30',
                          col.monthType === 'previous' && 'bg-orange-50/50 dark:bg-orange-950/20',
                          col.monthType === 'next' && 'bg-blue-50/50 dark:bg-blue-950/20',
                          shift?.isIC && !leave && 'bg-green-100 dark:bg-green-900/30',
                          isMonthBoundary && 'border-l-2 border-primary'
                        )}
                      >
                        {leave ? (
                          <div className='flex justify-center'>
                            <div
                              className={cn(
                                'w-8 h-8 rounded-md flex items-center justify-center font-bold text-[10px] shadow-sm transition-all hover:scale-110 cursor-default border',
                                leaveConfig?.color || 'bg-gray-100 text-gray-700',
                                col.monthType !== 'current' && 'opacity-60'
                              )}
                              title={`${leaveConfig?.label || leave.leaveType}${leave.notes ? `: ${leave.notes}` : ''}`}
                            >
                              {leaveConfig?.abbr || leave.leaveType}
                            </div>
                          </div>
                        ) : shift ? (
                          <div className='flex justify-center'>
                            <div
                              className={cn(
                                'w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm shadow-sm transition-all hover:scale-110 cursor-default',
                                config?.bg,
                                config?.text,
                                col.monthType !== 'current' && 'opacity-60'
                              )}
                              title={`${config?.label}${shift.isIC ? ' (IC)' : ''}`}
                            >
                              {config?.icon}
                            </div>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              'text-muted-foreground/30',
                              col.monthType !== 'current' && 'opacity-40'
                            )}
                          >
                            -
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer / Legend */}
        <div className='bg-muted/20 p-4 border-t flex flex-wrap items-center gap-6 text-sm'>
          <div className='font-medium text-muted-foreground mr-2'>Legend:</div>

          {shiftType === ShiftType.APN ? (
            <>
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border'>
                  O
                </div>
                <span className='text-muted-foreground'>Off</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs border'>
                  A
                </div>
                <span className='text-muted-foreground'>Afternoon</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 rounded bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs border'>
                  P
                </div>
                <span className='text-muted-foreground'>PM</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs border'>
                  N
                </div>
                <span className='text-muted-foreground'>Night</span>
              </div>
            </>
          ) : (
            <>
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border'>
                  O
                </div>
                <span className='text-muted-foreground'>Day Off</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border'>
                  7
                </div>
                <span className='text-muted-foreground'>7 Shift</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs border'>
                  E
                </div>
                <span className='text-muted-foreground'>E Shift</span>
              </div>
            </>
          )}

          <div className='flex items-center gap-4 pl-6 border-l ml-2'>
            <div className='flex items-center gap-2'>
              <div className='w-6 h-6 rounded bg-orange-50 border-2 border-orange-200'></div>
              <span className='text-muted-foreground text-xs'>Previous Month</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-6 h-6 rounded bg-blue-50 border-2 border-blue-200'></div>
              <span className='text-muted-foreground text-xs'>Next Month</span>
            </div>
          </div>

          {roster?.status === 'COMPLETED' && (
            <div className='ml-auto flex items-center gap-2 text-green-600'>
              <CheckCircle2 className='h-4 w-4' />
              <span className='font-medium'>All constraints satisfied</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
