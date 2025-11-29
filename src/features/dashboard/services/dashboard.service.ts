import { z } from 'zod'
import { Gender } from '@prisma/client'

// ============================================================================
// Staff Schemas
// ============================================================================

export const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  rank: z.string().optional(),
  visibleId: z
    .string()
    .regex(/^[A-Z0-9]{3,20}$/, 'Staff ID must be 3-20 uppercase alphanumeric characters'),
  // FN/ADM/STF/007 - Extended attributes
  gender: z.nativeEnum(Gender).optional(),
  roleIds: z.array(z.string()).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

export type CreateStaffDto = z.infer<typeof createStaffSchema>

// ============================================================================
// Constraint Schemas
// ============================================================================

export const pointConstraintFormSchema = z.object({
  type: z.literal('point'),
  name: z.string().min(1, 'Name is required').max(100),
  staffId: z.string().min(1, 'Select a staff member'),
  timeSlot: z.number().int().min(0, 'Select a day'),
  state: z.number().int().min(0).max(2),
  description: z.string().optional(),
})

export const verticalSumConstraintFormSchema = z.object({
  type: z.literal('vertical_sum'),
  name: z.string().min(1, 'Name is required').max(100),
  timeSlotValue: z.union([z.number().int().min(0), z.literal(-1)]), // -1 represents "ALL"
  targetState: z.number().int().min(0).max(2),
  operator: z.enum(['>=', '<=', '==']),
  value: z.number().int().min(0),
  description: z.string().optional(),
})

export type PointConstraintFormDto = z.infer<typeof pointConstraintFormSchema>
export type VerticalSumConstraintFormDto = z.infer<typeof verticalSumConstraintFormSchema>

// ============================================================================
// Roster Generation Schema
// ============================================================================

export const generateRosterSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
  timeSlots: z.number().int().min(1).max(31),
  staffIds: z.array(z.string()).min(1),
  constraintIds: z.array(z.string()),
})

export type GenerateRosterDto = z.infer<typeof generateRosterSchema>

// ============================================================================
// Query Keys
// ============================================================================

export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: (filters: string) => [...staffKeys.lists(), { filters }] as const,
}

export const constraintKeys = {
  all: ['constraints'] as const,
  lists: () => [...constraintKeys.all, 'list'] as const,
}

export const rosterKeys = {
  all: ['roster'] as const,
  month: (month: string) => [...rosterKeys.all, { month }] as const,
  detail: (id: string) => [...rosterKeys.all, 'detail', id] as const,
}

export const staffGroupKeys = {
  all: ['staffGroups'] as const,
  lists: () => [...staffGroupKeys.all, 'list'] as const,
  detail: (id: string) => [...staffGroupKeys.all, 'detail', id] as const,
}
