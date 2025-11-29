'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStaff } from '../hooks/use-staff'
import { useAddConstraint } from '../hooks/use-constraints'
import {
  pointConstraintFormSchema,
  verticalSumConstraintFormSchema,
  type PointConstraintFormDto,
  type VerticalSumConstraintFormDto,
} from '../services/dashboard.service'

import { AIConstraintBuilder } from './ai-constraint-builder'

interface AddConstraintFormProps {
  type: 'point' | 'vertical_sum' | 'ai'
  onCancel: () => void
  onSuccess: () => void
}

export function AddConstraintForm({ type, onCancel, onSuccess }: AddConstraintFormProps) {
  const { data: staff } = useStaff()
  // addConstraint retained for legacy forms only
  // legacy hooks retained for point/vertical forms

  if (type === 'point') {
    return <PointConstraintForm staff={staff || []} onCancel={onCancel} onSuccess={onSuccess} />
  }
  if (type === 'vertical_sum') {
    return <VerticalSumConstraintForm onCancel={onCancel} onSuccess={onSuccess} />
  }
  if (type === 'ai') {
    return <AIConstraintBuilder onCancel={onCancel} onSuccess={onSuccess} />
  }
  return null
}

// Point Constraint Form
function PointConstraintForm({
  staff,
  onCancel,
  onSuccess,
}: {
  staff: Array<{ id: string; visibleId: string; name: string }>
  onCancel: () => void
  onSuccess: () => void
}) {
  const addConstraint = useAddConstraint()

  const form = useForm<PointConstraintFormDto>({
    resolver: zodResolver(pointConstraintFormSchema),
    defaultValues: {
      type: 'point',
      name: '',
      staffId: '',
      timeSlot: 0,
      state: 0,
      description: '',
    },
  })

  const onSubmit = async (data: PointConstraintFormDto) => {
    try {
      // Find staff to get visibleId
      const selectedStaff = staff.find((s) => s.id === data.staffId)
      if (!selectedStaff) throw new Error('Staff not found')

      await addConstraint.mutateAsync({
        name: data.name,
        type: 'point',
        config: {
          resource: selectedStaff.visibleId,
          time_slot: data.timeSlot,
          state: data.state,
        },
        description: data.description,
      })
      onSuccess()
    } catch {
      /* handled by hook */
    }
  }

  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle className="text-base">Add Point Constraint (Day Off)</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Constraint Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Alice Monday Off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.visibleId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeSlot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Day {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required State</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Off</SelectItem>
                      <SelectItem value="1">Work</SelectItem>
                      <SelectItem value="2">OnCall</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onCancel} size="sm">
                Cancel
              </Button>
              <Button type="submit" disabled={addConstraint.isPending} size="sm">
                {addConstraint.isPending ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// Vertical Sum Constraint Form
function VerticalSumConstraintForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void
  onSuccess: () => void
}) {
  const addConstraint = useAddConstraint()

  const form = useForm<VerticalSumConstraintFormDto>({
    resolver: zodResolver(verticalSumConstraintFormSchema),
    defaultValues: {
      type: 'vertical_sum',
      name: '',
      timeSlotValue: -1, // -1 represents "ALL"
      targetState: 1,
      operator: '>=',
      value: 2,
      description: '',
    },
  })

  const onSubmit = async (data: VerticalSumConstraintFormDto) => {
    try {
      await addConstraint.mutateAsync({
        name: data.name,
        type: 'vertical_sum',
        config: {
          time_slot: data.timeSlotValue === -1 ? 'ALL' : data.timeSlotValue,
          target_state: data.targetState,
          operator: data.operator,
          value: data.value,
        },
        description: data.description,
      })
      onSuccess()
    } catch {
      /* handled by hook */
    }
  }

  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle className="text-base">Add Vertical Sum Constraint (Min/Max Workers)</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Constraint Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Min 3 Workers Daily" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeSlotValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apply To</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="-1">All Days</SelectItem>
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Day {day} Only
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-2">
              <FormField
                control={form.control}
                name="operator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operator</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=">=">{'>='} At least</SelectItem>
                        <SelectItem value="<=">{'<='} At most</SelectItem>
                        <SelectItem value="==">== Exactly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Work</SelectItem>
                        <SelectItem value="2">OnCall</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onCancel} size="sm">
                Cancel
              </Button>
              <Button type="submit" disabled={addConstraint.isPending} size="sm">
                {addConstraint.isPending ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
