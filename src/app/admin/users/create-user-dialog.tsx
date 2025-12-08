'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createUserAction, fetchStaffForLinking } from '@/app/actions/user.actions';
import { UserRole } from '@prisma/client';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Staff = {
  id: string;
  visibleId: string;
  name: string;
  email: string;
  userId: string | null;
};

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchStaffForLinking().then(setStaff).catch(console.error);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (selectedStaffId && selectedStaffId !== 'none') {
      formData.set('staffId', selectedStaffId);
    }

    startTransition(async () => {
      const result = await createUserAction(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('User created successfully');
        onOpenChange(false);
        onSuccess();
      }
    });
  };

  const availableStaff = staff.filter((s) => !s.userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user account. They will be required to reset their password on first login.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='username'>Username *</Label>
            <Input
              id='username'
              name='username'
              type='text'
              required
              placeholder='johndoe'
              disabled={isPending}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='email'>Email (for password reset)</Label>
            <Input
              id='email'
              name='email'
              type='email'
              placeholder='user@example.com'
              disabled={isPending}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='name'>Display Name</Label>
            <Input id='name' name='name' type='text' placeholder='John Doe' disabled={isPending} />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='password'>Initial Password *</Label>
            <Input
              id='password'
              name='password'
              type='password'
              required
              minLength={8}
              placeholder='Min 8 characters'
              disabled={isPending}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='role'>Role *</Label>
            <Select name='role' defaultValue={UserRole.USER} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder='Select role' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin (System access)</SelectItem>
                <SelectItem value={UserRole.ADMIN}>Manager (Full access)</SelectItem>
                <SelectItem value={UserRole.USER}>Staff (Limited access)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='staffId'>Link to Staff (Optional)</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder='Select staff member' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>No link</SelectItem>
                {availableStaff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.visibleId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground'>
              Link this user to a staff record to associate them with scheduling data.
            </p>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
