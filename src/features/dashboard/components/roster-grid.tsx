'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRoster } from '../hooks/use-roster';
import { StateBadge, APN_STATE_CONFIG, SEVEN_E_STATE_CONFIG } from './state-badge';
import { ROSTER_GRID_COLORS } from '../constants/roster-colors';
import { addDays, formatDateShort, FORMAT_DATE_ISO } from '@/lib/date-time.utils';
import { ShiftType } from '@/types/enums';
import { cn } from '@/lib/utils';
import { LEAVE_TYPE_CONFIG, type LeaveType } from '@/lib/leave.types';
import { format, eachDayOfInterval } from 'date-fns';

interface RosterGridProps {
  month: string; // "2025-11"
}

export function RosterGrid({ month }: RosterGridProps) {
  const { data: roster, isLoading } = useRoster({ month });

  // Build leave map for quick lookup (FN/ADM/LVE/001)
  // Key: `${staffId}-${dateISO}` -> leave info
  // NOTE: useMemo must be called before any early returns (Rules of Hooks)
  const leaveMap = useMemo(() => {
    const map = new Map<string, { leaveType: LeaveType; notes: string | null }>();
    if (!roster?.leaves || !roster?.startDate || !roster?.endDate) {
      return map;
    }

    const leaves = roster.leaves || [];

    for (const leave of leaves) {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      const rosterStart = new Date(roster.startDate);
      const rosterEnd = new Date(roster.endDate);

      // Clamp leave dates to roster period
      const intervalStart = leaveStart < rosterStart ? rosterStart : leaveStart;
      const intervalEnd = leaveEnd > rosterEnd ? rosterEnd : leaveEnd;

      if (intervalStart <= intervalEnd) {
        const days = eachDayOfInterval({
          start: intervalStart,
          end: intervalEnd,
        });
        for (const day of days) {
          const key = `${leave.staffId}-${format(day, FORMAT_DATE_ISO)}`;
          map.set(key, {
            leaveType: leave.leaveType as LeaveType,
            notes: leave.notes,
          });
        }
      }
    }
    return map;
  }, [roster?.leaves, roster?.startDate, roster?.endDate]);

  // Group shifts by staff (also needs to be before early returns for consistent hook order)
  const shiftsByStaff = useMemo(() => {
    if (!roster?.shifts) return {};
    return (roster.shifts || []).reduce((acc: any, shift: any) => {
      if (!acc[shift.staffId]) {
        acc[shift.staffId] = {
          staff: shift.staff,
          shifts: Array(roster.timeSlots).fill(null),
        };
      }
      acc[shift.staffId].shifts[shift.timeSlot] = shift;
      return acc;
    }, {});
  }, [roster?.shifts, roster?.timeSlots]);

  // Get shift type from roster (default to SEVEN_E if not present)
  const shiftType = useMemo(() => {
    return roster && 'shiftType' in roster && roster.shiftType
      ? (roster.shiftType as ShiftType)
      : ShiftType.SEVEN_E;
  }, [roster]);

  // Loading or SOLVING state
  if (isLoading || roster?.status === 'SOLVING') {
    return (
      <Card>
        <CardHeader>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-4 w-72' />
        </CardHeader>
        <CardContent className='p-6'>
          <Skeleton className='h-[400px] w-full' />
          {roster?.status === 'SOLVING' && (
            <p className='text-sm text-muted-foreground text-center mt-4'>
              Generating roster... This may take a few seconds.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // No roster exists
  if (!roster) {
    return (
      <Card className='flex flex-col items-center justify-center h-[400px] border-dashed'>
        <CalendarIcon className='h-16 w-16 text-muted-foreground mb-4' />
        <p className='text-lg font-medium'>No roster generated</p>
        <p className='text-sm text-muted-foreground mt-2'>
          Add staff and constraints, then click "Generate Roster"
        </p>
      </Card>
    );
  }

  // Failed state
  if (roster.status === 'FAILED') {
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

  // Infeasible state
  if (roster.status === 'INFEASIBLE') {
    return (
      <Alert>
        <AlertTriangle className='h-4 w-4' />
        <AlertTitle>No Feasible Solution</AlertTitle>
        <AlertDescription>
          The constraints cannot be satisfied. Try adjusting or removing some rules.
        </AlertDescription>
      </Alert>
    );
  }

  const getShiftConfig = (state: number) => {
    const config = shiftType === ShiftType.APN ? APN_STATE_CONFIG : SEVEN_E_STATE_CONFIG;
    return config[state as keyof typeof config] || config[0];
  };

  return (
    <Card className='border-2 shadow-sm overflow-hidden'>
      <CardHeader className='border-b bg-muted/40 py-4'>
        <div className='flex items-center justify-between'>
          <div className='space-y-1'>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <CalendarIcon className='h-5 w-5 text-primary' />
              Roster Schedule
            </CardTitle>
            <CardDescription>
              {roster.solverStatus === 'OPTIMAL' ? 'Optimal solution found' : roster.solverStatus} •{' '}
              {(roster.constraints || []).length} constraints applied
            </CardDescription>
          </div>
          <div className='flex items-center gap-2 text-sm text-muted-foreground bg-background px-3 py-1 rounded-md border'>
            <Clock className='h-4 w-4' />
            <span>{roster.solveTimeMs ? `${roster.solveTimeMs.toFixed(0)}ms` : '0ms'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-0'>
        <Table className='table-fixed'>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='sticky left-0 z-20 bg-background w-[80px] min-w-[80px] font-semibold pl-4'>
                Rank
              </TableHead>
              <TableHead className='sticky left-[80px] z-20 bg-background w-[180px] min-w-[180px] font-semibold border-r shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)]'>
                Staff Name
              </TableHead>
              {Array.from({ length: roster.timeSlots || 0 }).map((_, i) => {
                const date = addDays(new Date(roster.startDate!), i);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <TableHead
                    key={i}
                    className={cn(
                      'text-center w-[50px] min-w-[50px] p-1 h-auto',
                      isWeekend && 'bg-muted/30'
                    )}
                  >
                    <div className='flex flex-col items-center justify-center py-2'>
                      <span className='text-xs font-medium text-muted-foreground'>
                        {formatDateShort(date).split(' ')[0]}
                      </span>
                      <span className={cn('text-sm font-bold', isWeekend && 'text-primary')}>
                        {formatDateShort(date).split(' ')[1]}
                      </span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(shiftsByStaff).map(({ staff, shifts }: any) => (
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
                {shifts.map((shift: any, i: number) => {
                  const date = addDays(new Date(roster.startDate!), i);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const config = shift ? getShiftConfig(shift.state) : null;

                  // Check for leave on this day (FN/ADM/LVE/001)
                  const dateKey = format(date, FORMAT_DATE_ISO);
                  const leaveKey = `${staff.id}-${dateKey}`;
                  const leave = leaveMap.get(leaveKey);
                  const leaveConfig = leave ? LEAVE_TYPE_CONFIG[leave.leaveType] : null;

                  return (
                    <TableCell
                      key={i}
                      className={cn(
                        'p-1 text-center border-l border-dashed',
                        isWeekend && 'bg-muted/30',
                        shift?.isIC && !leave && 'bg-green-100 dark:bg-green-900/30'
                      )}
                    >
                      {leave ? (
                        // Display leave type badge (FN/ADM/LVE/001)
                        <div className='flex justify-center'>
                          <div
                            className={cn(
                              'w-8 h-8 rounded-md flex items-center justify-center font-bold text-[10px] shadow-sm transition-all hover:scale-110 cursor-default border',
                              leaveConfig?.color || 'bg-gray-100 text-gray-700'
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
                              config?.text
                            )}
                            title={`${config?.label}${shift.isIC ? ' (IC)' : ''}`}
                          >
                            {config?.icon}
                          </div>
                        </div>
                      ) : (
                        <span className='text-muted-foreground/30'>-</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>

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

          <div className='flex items-center gap-2 pl-6 border-l ml-2'>
            <div className='w-6 h-6 rounded bg-green-100 dark:bg-green-900/30 border flex items-center justify-center'></div>
            <span className='text-muted-foreground'>In-Charge (IC)</span>
          </div>

          {/* Leave Types Legend (FN/ADM/LVE/001) */}
          <div className='flex items-center gap-2 pl-6 border-l ml-2'>
            <span className='text-muted-foreground font-medium'>Leave:</span>
            {Object.entries(LEAVE_TYPE_CONFIG)
              .slice(0, 4)
              .map(([type, config]) => (
                <div key={type} className='flex items-center gap-1'>
                  <div
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center font-bold text-[9px] border',
                      config.color
                    )}
                  >
                    {config.abbr}
                  </div>
                </div>
              ))}
          </div>

          <div className='ml-auto flex items-center gap-2 text-green-600'>
            <CheckCircle2 className='h-4 w-4' />
            <span className='font-medium'>All constraints satisfied</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
