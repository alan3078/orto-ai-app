'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { SystemConfigGroup, SystemConfigItem } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Lock, Unlock, Edit, Clock, Settings } from 'lucide-react';
import { updateSystemConfigItemAction, toggleSystemConfigItemAction } from './actions';
import { ROUTES } from '@/lib/routes';

type GroupWithItems = SystemConfigGroup & { items: SystemConfigItem[] };

interface Props {
  initialGroups: GroupWithItems[];
}

export function SystemConfigPage({ initialGroups }: Props) {
  const [groups] = useState(initialGroups);
  const [editingItem, setEditingItem] = useState<SystemConfigItem | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleEdit = (item: SystemConfigItem) => {
    setEditingItem(item);
    setEditValue(JSON.stringify(item.value, null, 2));
  };

  const handleSave = () => {
    if (!editingItem) return;

    startTransition(async () => {
      const result = await updateSystemConfigItemAction({
        itemId: editingItem.id,
        value: editValue,
      });

      if (result.success) {
        toast.success('Configuration updated');
        setEditingItem(null);
        // Optionally refresh page or optimistically update state
        window.location.reload();
      } else {
        toast.error(result.error || 'Failed to update');
      }
    });
  };

  const handleToggle = (item: SystemConfigItem) => {
    if (item.locked) {
      toast.error('Cannot toggle locked item');
      return;
    }

    startTransition(async () => {
      const result = await toggleSystemConfigItemAction({ itemId: item.id });
      if (result.success) {
        toast.success(item.isActive ? 'Deactivated' : 'Activated');
        window.location.reload();
      } else {
        toast.error(result.error || 'Failed to toggle');
      }
    });
  };

  const globalGroup = groups.find((g) => g.scope === 'GLOBAL');
  const rosterGroup = groups.find((g) => g.scope === 'ROSTER');

  return (
    <div className='space-y-6 p-6'>
      <div>
        <h1 className='text-3xl font-bold'>System Configuration</h1>
        <p className='text-muted-foreground mt-2'>
          Manage global and roster-specific scheduling policies
        </p>
      </div>

      {/* Config Navigation Tabs */}
      <div className='flex gap-2 border-b pb-2'>
        <Link href={ROUTES.ADMIN.CONFIG}>
          <Button variant='default' size='sm' className='gap-2'>
            <Settings className='h-4 w-4' />
            Scheduling Policies
          </Button>
        </Link>
        <Link href={ROUTES.ADMIN.SHIFT_SETTINGS}>
          <Button variant='outline' size='sm' className='gap-2'>
            <Clock className='h-4 w-4' />
            Shift Settings
          </Button>
        </Link>
      </div>

      {/* Global Policies */}
      {globalGroup && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              {globalGroup.name}
              <Badge variant='secondary'>GLOBAL</Badge>
            </CardTitle>
            <CardDescription>
              System-wide policies that apply to all rosters (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfigTable
              items={globalGroup.items}
              onEdit={handleEdit}
              onToggle={handleToggle}
              isPending={isPending}
            />
          </CardContent>
        </Card>
      )}

      {/* Roster Management Policies */}
      {rosterGroup && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              {rosterGroup.name}
              <Badge variant='outline'>ROSTER</Badge>
            </CardTitle>
            <CardDescription>Roster-specific policies that can be customized</CardDescription>
          </CardHeader>
          <CardContent>
            <ConfigTable
              items={rosterGroup.items}
              onEdit={handleEdit}
              onToggle={handleToggle}
              isPending={isPending}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Edit Configuration Value</DialogTitle>
            <DialogDescription>{editingItem?.label}</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div>
              <label className='text-sm font-medium'>JSON Value</label>
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className='mt-2 font-mono text-sm'
                rows={8}
                placeholder='{"key": "value"}'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditingItem(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfigTable({
  items,
  onEdit,
  onToggle,
  isPending,
}: {
  items: SystemConfigItem[];
  onEdit: (item: SystemConfigItem) => void;
  onToggle: (item: SystemConfigItem) => void;
  isPending: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Label</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead className='text-center'>Active</TableHead>
          <TableHead className='text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className='font-medium'>
              <div className='flex items-center gap-2'>
                {item.label}
                {item.locked && <Lock className='h-3 w-3 text-muted-foreground' />}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant='outline' className='text-xs'>
                {item.type}
              </Badge>
            </TableCell>
            <TableCell className='font-mono text-xs max-w-md truncate'>
              {JSON.stringify(item.value)}
            </TableCell>
            <TableCell>{item.priority}</TableCell>
            <TableCell className='text-center'>
              <Switch
                checked={item.isActive}
                onCheckedChange={() => onToggle(item)}
                disabled={item.locked || isPending}
              />
            </TableCell>
            <TableCell className='text-right'>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => onEdit(item)}
                disabled={item.locked || isPending}
              >
                {item.locked ? <Lock className='h-4 w-4' /> : <Edit className='h-4 w-4' />}
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className='text-center text-muted-foreground'>
              No configuration items
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
