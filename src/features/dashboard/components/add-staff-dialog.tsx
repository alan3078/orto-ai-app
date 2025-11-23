'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { useAddStaff } from '../hooks/use-staff'
import { getRolesAction } from '@/app/actions/role.actions'
import { createStaffSchema, type CreateStaffDto } from '../services/dashboard.service'

interface AddStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddStaffDialog({ open, onOpenChange }: AddStaffDialogProps) {
  const addStaff = useAddStaff()
  const [roles, setRoles] = useState<Array<{ id: string; name: string; order: number }>>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const form = useForm<CreateStaffDto>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: '',
      employeeId: '',
      email: '',
      gender: undefined,
      roleIds: [],
      monthlyMinHours: undefined,
      monthlyMaxHours: undefined,
    },
  })

  useEffect(() => {
    if (open) {
      getRolesAction().then((result) => {
        if (result.success) setRoles(result.roles)
      })
    }
  }, [open])

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    )
    form.setValue('roleIds', selectedRoles.includes(roleId)
      ? selectedRoles.filter((id) => id !== roleId)
      : [...selectedRoles, roleId]
    )
  }

  const onSubmit = async (data: CreateStaffDto) => {
    try {
      await addStaff.mutateAsync({ ...data, roleIds: selectedRoles })
      form.reset()
      setSelectedRoles([])
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the hook with toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>
            Add a new staff member to the scheduling system.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="EMP001"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="M">Male</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Roles (Optional)</FormLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.map((role) => (
                  <Badge
                    key={role.id}
                    variant={selectedRoles.includes(role.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleRoleToggle(role.id)}
                  >
                    {role.name}
                    {selectedRoles.includes(role.id) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
              <FormDescription className="text-xs mt-1">
                Click to toggle roles (ordered by priority)
              </FormDescription>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyMinHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Monthly Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="120"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthlyMaxHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Monthly Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="180"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={addStaff.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addStaff.isPending}>
                {addStaff.isPending ? 'Adding...' : 'Add Staff'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
