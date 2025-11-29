'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useUpdateStaff } from '../hooks/use-staff'
import { getRolesAction } from '@/app/actions/role.actions'
import { Gender } from '@prisma/client'

const editStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  rank: z.string().optional(),
  visibleId: z.string().regex(/^[A-Z0-9]{3,20}$/, 'Staff ID must be 3-20 uppercase alphanumeric characters'),
  gender: z.nativeEnum(Gender).optional(),
  roleIds: z.array(z.string()).optional(),
})

type EditStaffDto = z.infer<typeof editStaffSchema>

interface StaffData {
  id: string
  visibleId: string
  rank: string | null
  gender: Gender | null
  user?: {
    name: string | null
    email: string | null
  } | null
  staffRoles?: Array<{ role: { id: string; name: string } }>
}

interface EditStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffData
}

export function EditStaffDialog({ open, onOpenChange, staff }: EditStaffDialogProps) {
  const updateStaff = useUpdateStaff()
  const [roles, setRoles] = useState<Array<{ id: string; name: string; order: number }>>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const form = useForm<EditStaffDto>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      name: staff.user?.name || '',
      email: staff.user?.email || '',
      rank: staff.rank || '',
      visibleId: staff.visibleId,
      gender: staff.gender || undefined,
      roleIds: [],
    },
  })

  useEffect(() => {
    if (open) {
      getRolesAction().then((result) => {
        if (result.success) setRoles(result.roles)
      })
      // Set initial selected roles
      const staffRoleIds = staff.staffRoles?.map(sr => sr.role.id) || []
      setSelectedRoles(staffRoleIds)
      
      // Reset form with staff data
      form.reset({
        name: staff.user?.name || '',
        email: staff.user?.email || '',
        rank: staff.rank || '',
        visibleId: staff.visibleId,
        gender: staff.gender || undefined,
        roleIds: staffRoleIds,
      })
    }
  }, [open, staff, form])

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    )
    form.setValue('roleIds', selectedRoles.includes(roleId)
      ? selectedRoles.filter((id) => id !== roleId)
      : [...selectedRoles, roleId]
    )
  }

  const onSubmit = async (data: EditStaffDto) => {
    try {
      await updateStaff.mutateAsync({
        id: staff.id,
        ...data,
        roleIds: selectedRoles,
      })
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the hook with toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>
            Update staff member details.
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
              name="rank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rank (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rank" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SNO">SNO</SelectItem>
                      <SelectItem value="SRN">SRN</SelectItem>
                      <SelectItem value="RN">RN</SelectItem>
                      <SelectItem value="RN-CW">RN-CW</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visible ID</FormLabel>
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateStaff.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateStaff.isPending}>
                {updateStaff.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
