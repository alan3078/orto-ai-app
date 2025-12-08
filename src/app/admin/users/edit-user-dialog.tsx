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
import { updateUserAction, fetchStaffForLinking } from '@/app/actions/user.actions';
import { UserRole } from '@prisma/client';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user: {
    id: string;
    username: string;
    email: string | null;
    name: string | null;
    role: UserRole;
    staff: { id: string; visibleId: string } | null;
  };
}

type Staff = {
  id: string;
  visibleId: string;
  name: string;
  email: string;
  userId: string | null;
};

export function EditUserDialog({ open, onOpenChange, onSuccess, user }: EditUserDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(user.staff?.id || 'none');

  useEffect(() => {
    if (open) {
      fetchStaffForLinking().then(setStaff).catch(console.error);
      setSelectedStaffId(user.staff?.id || 'none');
    }
  }, [open, user.staff?.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('id', user.id);

    if (selectedStaffId && selectedStaffId !== 'none') {
      formData.set('staffId', selectedStaffId);
    } else {
      formData.delete('staffId');
    }

    startTransition(async () => {
      const result = await updateUserAction(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('User updated successfully');
        onOpenChange(false);
        onSuccess();
      }
    });
  };

  // Include current linked staff + unlinked staff
  const availableStaff = staff.filter((s) => !s.userId || s.id === user.staff?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user account details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='edit-username'>Username *</Label>
            <Input
              id='edit-username'
              name='username'
              type='text'
              required
              defaultValue={user.username}
              disabled={isPending}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='edit-email'>Email (for password reset)</Label>
            <Input
              id='edit-email'
              name='email'
              type='email'
              defaultValue={user.email || ''}
              disabled={isPending}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='edit-name'>Display Name</Label>
            <Input
              id='edit-name'
              name='name'
              type='text'
              defaultValue={user.name || ''}
              placeholder='John Doe'
              disabled={isPending}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='edit-role'>Role *</Label>
            <Select name='role' defaultValue={user.role} disabled={isPending}>
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
            <Label htmlFor='edit-staffId'>Link to Staff (Optional)</Label>
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
