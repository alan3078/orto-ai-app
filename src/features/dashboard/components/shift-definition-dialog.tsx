'use client'

import { useEffect } from 'react'
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

const shiftDefinitionSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(4, 'Code must be 4 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters or numbers'),
  startMinutes: z
    .number()
    .int('Start time must be an integer')
    .min(0, 'Start time must be 0 or greater')
    .max(1439, 'Start time must be 1439 or less (23:59)'),
  durationMinutes: z
    .number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(1440, 'Duration must be 1440 minutes or less (24 hours)'),
})

type ShiftDefinitionFormData = z.infer<typeof shiftDefinitionSchema>

interface ShiftDefinitionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift?: {
    id: string
    code: string
    startMinutes: number
    durationMinutes: number
  } | null
  onSubmit: (data: {
    code: string
    startMinutes: number
    durationMinutes: number
  }) => void
  isPending: boolean
}

export function ShiftDefinitionDialog({
  open,
  onOpenChange,
  shift,
  onSubmit,
  isPending,
}: ShiftDefinitionDialogProps) {
  const form = useForm<ShiftDefinitionFormData>({
    resolver: zodResolver(shiftDefinitionSchema),
    defaultValues: {
      code: '',
      startMinutes: 0,
      durationMinutes: 480,
    },
  })

  useEffect(() => {
    if (open && shift) {
      form.reset({
        code: shift.code,
        startMinutes: shift.startMinutes,
        durationMinutes: shift.durationMinutes,
      })
    } else if (open && !shift) {
      form.reset({
        code: '',
        startMinutes: 0,
        durationMinutes: 480,
      })
    }
  }, [open, shift, form])

  const handleSubmit = (data: ShiftDefinitionFormData) => {
    onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {shift ? 'Edit Shift Definition' : 'Create Shift Definition'}
          </DialogTitle>
          <DialogDescription>
            {shift
              ? 'Update the shift code, start time, or duration.'
              : 'Define a new shift with code, start time (minutes from midnight), and duration.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="N"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      maxLength={4}
                    />
                  </FormControl>
                  <FormDescription>
                    1-4 uppercase letters or numbers (e.g., N, E, A, 7)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time (minutes from midnight)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1380"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    0-1439 (e.g., 1380 = 23:00, 420 = 07:00)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="480"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    1-1440 (e.g., 480 = 8 hours, 600 = 10 hours)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : shift ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
