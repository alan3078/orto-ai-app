'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const roleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(10, 'Name must be 10 characters or less')
    .regex(/^[A-Z0-9_]+$/, 'Name must be uppercase letters, numbers, or underscores'),
  order: z
    .number({ message: 'Order must be a number' })
    .int('Order must be an integer')
    .min(1, 'Order must be at least 1')
    .max(100, 'Order must be 100 or less'),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: { id: string; name: string; order: number } | null;
  onSubmit: (data: { name: string; order: number }) => void;
  isPending: boolean;
}

export function RoleDialog({ open, onOpenChange, role, onSubmit, isPending }: RoleDialogProps) {
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      order: 1,
    },
  });

  useEffect(() => {
    if (open && role) {
      form.reset({
        name: role.name,
        order: role.order,
      });
    } else if (open && !role) {
      form.reset({
        name: '',
        order: 1,
      });
    }
  }, [open, role, form]);

  const handleSubmit = (data: RoleFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role ? 'Edit Role' : 'Create Role'}</DialogTitle>
          <DialogDescription>
            {role
              ? 'Update the role name or priority order.'
              : 'Add a new role with a unique name and priority order.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='IC'
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>Uppercase letters, numbers, or underscores only</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='order'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority Order</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='1'
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                      }
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Lower numbers = higher priority (1 is highest)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending ? 'Saving...' : role ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
