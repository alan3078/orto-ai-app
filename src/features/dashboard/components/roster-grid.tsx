'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useRoster } from '../hooks/use-roster';
import { StateBadge, APN_STATE_CONFIG, DAY_NIGHT_STATE_CONFIG } from './state-badge';
import { format, addDays } from 'date-fns';

interface RosterGridProps {
  month: string; // "2025-11"
}

export function RosterGrid({ month }: RosterGridProps) {
  const { data: roster, isLoading } = useRoster({ month });

  // Loading or SOLVING state
  if (isLoading || roster?.status === 'SOLVING') {
    return (
      <Card>
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
      <Card className='flex flex-col items-center justify-center h-[400px]'>
        <Calendar className='h-16 w-16 text-muted-foreground mb-4' />
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

  // Success state - Group shifts by staff
  const shiftsByStaff = roster.shifts.reduce((acc: any, shift: any) => {
    if (!acc[shift.staffId]) {
      acc[shift.staffId] = {
        staff: shift.staff,
        shifts: Array(roster.timeSlots).fill(null),
      };
    }
    acc[shift.staffId].shifts[shift.timeSlot] = shift;
    return acc;
  }, {});

  // Type assertion for roster with shiftType (TypeScript may need regeneration)
  const rosterWithShiftType = roster as typeof roster & { shiftType?: 'APN' | 'DAY_NIGHT' };
  const shiftType = rosterWithShiftType.shiftType || 'DAY_NIGHT';

  return (
    <Card>
      <CardContent className='p-6'>
        <div className='overflow-x-auto'>
          <table className='w-full border-collapse'>
            <thead>
              <tr>
                <th className='sticky left-0 bg-background p-3 text-left border font-medium'>
                  Staff
                </th>
                {Array.from({ length: roster.timeSlots }).map((_, i) => (
                  <th
                    key={i}
                    className='p-3 text-center border min-w-[80px] font-medium'>
                    <div>Day {i}</div>
                    <div className='text-xs text-muted-foreground font-normal'>
                      {format(addDays(new Date(roster.startDate), i), 'MMM d')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(shiftsByStaff).map(({ staff, shifts }: any) => (
                <tr
                  key={staff.id}
                  className='hover:bg-accent/50'>
                  <td className='sticky left-0 bg-background p-3 font-medium border'>
                    <div>
                      <div className='font-medium'>{staff.name}</div>
                      <div className='text-xs text-muted-foreground'>{staff.employeeId}</div>
                    </div>
                  </td>
                  {shifts.map((shift: any, i: number) => (
                    <td
                      key={i}
                      className='p-3 text-center border'>
                      {shift ? (
                        <div className='flex justify-center'>
                          <StateBadge state={shift.state} shiftType={shiftType} />
                        </div>
                      ) : (
                        <span className='text-muted-foreground'>-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend for StateBadge icons - Dynamic based on shift type */}
        <div className='mt-4 flex gap-6 items-center text-sm'>
          {shiftType === 'APN' ? (
            <>
              <div className='flex items-center gap-2'>
                <StateBadge state={0} shiftType="APN" /> <span>Off</span>
              </div>
              <div className='flex items-center gap-2'>
                <StateBadge state={1} shiftType="APN" /> <span>Afternoon (A)</span>
              </div>
              <div className='flex items-center gap-2'>
                <StateBadge state={2} shiftType="APN" /> <span>PM (P)</span>
              </div>
              <div className='flex items-center gap-2'>
                <StateBadge state={3} shiftType="APN" /> <span>Night (N)</span>
              </div>
            </>
          ) : (
            <>
              <div className='flex items-center gap-2'>
                <StateBadge state={0} shiftType="DAY_NIGHT" /> <span>Off</span>
              </div>
              <div className='flex items-center gap-2'>
                <StateBadge state={1} shiftType="DAY_NIGHT" /> <span>Day</span>
              </div>
              <div className='flex items-center gap-2'>
                <StateBadge state={2} shiftType="DAY_NIGHT" /> <span>Night</span>
              </div>
            </>
          )}
        </div>

        {/* Metadata */}
        <div className='mt-6 pt-4 border-t text-sm text-muted-foreground flex justify-between items-center'>
          <div>
            <span className='font-medium'>Status:</span> {roster.solverStatus || 'N/A'}
          </div>
          {roster.solveTimeMs && (
            <div>
              <span className='font-medium'>Generated in:</span> {roster.solveTimeMs.toFixed(0)}ms
            </div>
          )}
          <div>
            <span className='font-medium'>Constraints Applied:</span> {roster.constraints.length}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
