'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Clock, Settings2, Calendar, Users, Wand2, CheckCircle2 } from 'lucide-react';
import { ShiftType } from '@/types/enums';

// Mock Data for Config Demo
const MOCK_CONFIGS = [
  {
    id: '1',
    shiftType: ShiftType.APN,
    name: 'Standard APN',
    description: 'Standard 8.5h shift pattern (Afternoon, PM, Night)',
    minHoursPerMonth: 160,
    maxHoursPerMonth: 190,
    isActive: true,
  },
  {
    id: '2',
    shiftType: ShiftType.SEVEN_E,
    name: '12-Hour Rotation',
    description: '12h shift pattern (Day 7am-7pm, Night 7pm-7am)',
    minHoursPerMonth: 150,
    maxHoursPerMonth: 180,
    isActive: true,
  },
];

// Mock Data for Roster Demo
const MOCK_ROSTER_DAYS = Array.from({ length: 7 }, (_, i) => i + 1);
const MOCK_STAFF = [
  {
    name: 'Sarah Chen',
    role: 'Senior Nurse',
    shifts: ['D', 'D', 'D', 'O', 'O', 'N', 'N'],
  },
  {
    name: 'James Wilson',
    role: 'Nurse',
    shifts: ['N', 'N', 'O', 'O', 'D', 'D', 'D'],
  },
  {
    name: 'Maria Garcia',
    role: 'Junior Nurse',
    shifts: ['O', 'O', 'A', 'A', 'A', 'O', 'O'],
  },
  {
    name: 'David Kim',
    role: 'Nurse',
    shifts: ['P', 'P', 'P', 'P', 'O', 'O', 'O'],
  },
];

export function AdminDemo() {
  const [activeTab, setActiveTab] = useState('roster');

  const getShiftTypeBadge = (shiftType: ShiftType) => {
    switch (shiftType) {
      case ShiftType.APN:
        return <Badge variant='default'>APN</Badge>;
      case ShiftType.SEVEN_E:
        return <Badge variant='secondary'>7E</Badge>;
    }
  };

  const getShiftBadge = (shift: string) => {
    const colors: Record<string, string> = {
      D: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      N: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      A: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      P: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
      O: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    };
    return (
      <div
        className={`w-8 h-8 rounded-md flex items-center justify-center font-medium text-sm ${colors[shift] || colors['O']}`}
      >
        {shift}
      </div>
    );
  };

  return (
    <section className='py-24 bg-slate-50 dark:bg-slate-900/50'>
      <div className='container px-4 md:px-6 mx-auto'>
        <div className='flex flex-col items-center justify-center space-y-4 text-center mb-12'>
          <div className='inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary'>
            Powerful Admin Tools
          </div>
          <h2 className='text-3xl font-bold tracking-tighter sm:text-5xl'>
            Complete Control Over Your Rosters
          </h2>
          <p className='max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed'>
            Manage staff, configure shift patterns, and generate AI-optimized schedules from a
            single intuitive dashboard.
          </p>
        </div>

        <div className='mx-auto max-w-5xl'>
          <Tabs defaultValue='roster' className='w-full' onValueChange={setActiveTab}>
            <div className='flex justify-center mb-8'>
              <TabsList className='grid w-full max-w-md grid-cols-2'>
                <TabsTrigger value='roster'>Roster Management</TabsTrigger>
                <TabsTrigger value='config'>Configuration</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value='roster' className='mt-0'>
              <Card className='border-2 shadow-xl overflow-hidden'>
                <CardHeader className='border-b bg-muted/40 p-4 sm:p-6'>
                  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                    <div className='space-y-1'>
                      <CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
                        <Calendar className='h-4 w-4 sm:h-5 sm:w-5 text-primary' />
                        November 2025 Roster
                      </CardTitle>
                      <CardDescription className='text-xs sm:text-sm'>
                        AI-generated schedule with 98% constraint satisfaction
                      </CardDescription>
                    </div>
                    <div className='flex gap-2'>
                      <Button variant='outline' size='sm' className='text-xs sm:text-sm'>
                        <Users className='mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                        Manage Staff
                      </Button>
                      <Button size='sm' className='text-xs sm:text-sm'>
                        <Wand2 className='mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='w-[120px] sm:w-[200px]'>Staff Member</TableHead>
                          {MOCK_ROSTER_DAYS.map((day) => (
                            <TableHead key={day} className='text-center w-10 sm:w-12'>
                              {day}
                            </TableHead>
                          ))}
                          <TableHead className='text-right'>Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MOCK_STAFF.map((staff, i) => (
                          <TableRow key={i}>
                            <TableCell className='p-2 sm:p-4'>
                              <div className='font-medium text-sm'>{staff.name}</div>
                              <div className='text-xs text-muted-foreground'>{staff.role}</div>
                            </TableCell>
                            {staff.shifts.map((shift, j) => (
                              <TableCell key={j} className='p-2'>
                                <div className='flex justify-center'>{getShiftBadge(shift)}</div>
                              </TableCell>
                            ))}
                            <TableCell className='text-right font-mono text-muted-foreground'>
                              42.5
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className='bg-muted/20 p-4 border-t flex items-center gap-4 text-sm text-muted-foreground'>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='h-4 w-4 text-green-500' />
                      <span>All shifts covered</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='h-4 w-4 text-green-500' />
                      <span>No rule violations</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='config' className='mt-0'>
              <Card className='border-2 shadow-xl'>
                <CardHeader className='border-b bg-muted/40'>
                  <div className='flex items-center gap-2'>
                    <Settings2 className='h-5 w-5 text-primary' />
                    <CardTitle>Shift Type Configuration</CardTitle>
                  </div>
                  <CardDescription>
                    Customize working hours and constraints for different shift patterns.
                  </CardDescription>
                </CardHeader>
                <CardContent className='p-0'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='pl-6'>Shift Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className='text-center'>Min Hours</TableHead>
                        <TableHead className='text-center'>Max Hours</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right pr-6'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MOCK_CONFIGS.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className='pl-6'>
                            {getShiftTypeBadge(config.shiftType)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className='font-medium'>{config.name}</div>
                              <div className='text-xs text-muted-foreground'>
                                {config.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className='text-center'>
                            <div className='flex items-center justify-center gap-1'>
                              <Clock className='h-4 w-4 text-muted-foreground' />
                              <span className='font-mono'>{config.minHoursPerMonth}</span>
                            </div>
                          </TableCell>
                          <TableCell className='text-center'>
                            <div className='flex items-center justify-center gap-1'>
                              <Clock className='h-4 w-4 text-muted-foreground' />
                              <span className='font-mono'>{config.maxHoursPerMonth}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant='outline'
                              className='text-green-600 border-green-600 bg-green-50 dark:bg-green-900/20'
                            >
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right pr-6'>
                            <Button variant='ghost' size='icon'>
                              <Edit className='h-4 w-4' />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className='p-6 bg-muted/20 border-t'>
                    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                      <div className='space-y-2'>
                        <Label>Global Constraints</Label>
                        <div className='text-sm text-muted-foreground'>
                          Configure rules that apply to all staff members regardless of their shift
                          type.
                        </div>
                      </div>
                      <div className='space-y-2'>
                        <Label>Auto-Scheduling</Label>
                        <div className='text-sm text-muted-foreground'>
                          Set preferences for the AI solver engine to prioritize fairness or
                          efficiency.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}
