'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Edit, Clock, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { getShiftTypeConfigsAction, updateShiftTypeConfigAction } from '@/app/admin/config/actions';
import { ShiftType } from '@/types/enums';

interface ShiftTypeConfig {
  id: string;
  shiftType: ShiftType;
  name: string;
  description: string | null;
  minHoursPerMonth: number;
  maxHoursPerMonth: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function ShiftTypeConfigManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ShiftTypeConfig | null>(null);
  const [minHours, setMinHours] = useState<number>(160);
  const [maxHours, setMaxHours] = useState<number>(190);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['shift-type-configs'],
    queryFn: async () => {
      const result = await getShiftTypeConfigsAction();
      if (!result.success) throw new Error(result.error);
      return result.configs as ShiftTypeConfig[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      minHoursPerMonth: number;
      maxHoursPerMonth: number;
    }) => {
      const result = await updateShiftTypeConfigAction(params);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-type-configs'] });
      toast.success('Shift type configuration updated');
      setDialogOpen(false);
      setEditingConfig(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleEdit = (config: ShiftTypeConfig) => {
    setEditingConfig(config);
    setMinHours(config.minHoursPerMonth);
    setMaxHours(config.maxHoursPerMonth);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingConfig) return;

    updateMutation.mutate({
      id: editingConfig.id,
      minHoursPerMonth: minHours,
      maxHoursPerMonth: maxHours,
    });
  };

  const getShiftTypeBadge = (shiftType: ShiftType) => {
    switch (shiftType) {
      case ShiftType.APN:
        return <Badge variant='default'>APN</Badge>;
      case ShiftType.SEVEN_E:
        return <Badge variant='secondary'>7E</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='h-4 w-72' />
        </CardHeader>
        <CardContent>
          <Skeleton className='h-48 w-full' />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <Settings2 className='h-5 w-5 text-muted-foreground' />
            <CardTitle>Shift Type Working Hours</CardTitle>
          </div>
          <CardDescription>
            Configure minimum and maximum working hours per month for each shift type. These
            settings apply as defaults when creating rosters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className='text-center'>Min Hours/Month</TableHead>
                <TableHead className='text-center'>Max Hours/Month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs?.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>{getShiftTypeBadge(config.shiftType)}</TableCell>
                  <TableCell>
                    <div>
                      <div className='font-medium'>{config.name}</div>
                      {config.description && (
                        <div className='text-xs text-muted-foreground'>{config.description}</div>
                      )}
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
                    {config.isActive ? (
                      <Badge variant='outline' className='text-green-600 border-green-600'>
                        Active
                      </Badge>
                    ) : (
                      <Badge variant='outline' className='text-gray-400 border-gray-400'>
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleEdit(config)}
                      title='Edit working hours'
                    >
                      <Edit className='h-4 w-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!configs || configs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className='text-center text-muted-foreground'>
                    No shift type configurations found. Run database seed to create defaults.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Working Hours - {editingConfig?.name}</DialogTitle>
            <DialogDescription>
              Configure the minimum and maximum working hours per month for this shift type.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='minHours'>Minimum Hours per Month</Label>
              <Input
                id='minHours'
                type='number'
                min={0}
                max={744}
                value={minHours}
                onChange={(e) => setMinHours(parseInt(e.target.value) || 0)}
                placeholder='e.g., 160'
              />
              <p className='text-xs text-muted-foreground'>
                The minimum number of working hours required per month
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='maxHours'>Maximum Hours per Month</Label>
              <Input
                id='maxHours'
                type='number'
                min={0}
                max={744}
                value={maxHours}
                onChange={(e) => setMaxHours(parseInt(e.target.value) || 0)}
                placeholder='e.g., 190'
              />
              <p className='text-xs text-muted-foreground'>
                The maximum number of working hours allowed per month
              </p>
            </div>

            {minHours > maxHours && (
              <p className='text-sm text-destructive'>Minimum hours cannot exceed maximum hours</p>
            )}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending || minHours > maxHours}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
