import { z } from 'zod'

/**
 * Zod schemas for validating solver API requests and responses
 */

export const SolverConfigSchema = z.object({
  resources: z.array(z.string()).min(1),
  time_slots: z.number().positive(),
  states: z.array(z.number()),
  resource_attributes: z.record(z.string(), z.record(z.string(), z.any())).optional(),
})

export const PointConstraintSchema = z.object({
  type: z.literal('point'),
  resource: z.string(),
  time_slot: z.number().nonnegative(),
  state: z.number().nonnegative(),
})

export const VerticalSumConstraintSchema = z.object({
  type: z.literal('vertical_sum'),
  time_slot: z.union([z.number().nonnegative(), z.literal('ALL')]),
  target_state: z.number().nonnegative(),
  operator: z.enum(['>=', '<=', '==']),
  value: z.number().nonnegative(),
})

export const HorizontalSumConstraintSchema = z.object({
  type: z.literal('horizontal_sum'),
  resource: z.string(),
  time_slots: z.array(z.number().nonnegative()).min(1),
  target_state: z.number().nonnegative(),
  operator: z.enum(['>=', '<=', '==']),
  value: z.number().nonnegative(),
})

export const SlidingWindowConstraintSchema = z.object({
  type: z.literal('sliding_window'),
  resource: z.string(),
  work_days: z.number().positive(),
  rest_days: z.number().positive(),
  target_state: z.number().positive(),
})

export const AttributeVerticalSumConstraintSchema = z.object({
  type: z.literal('attribute_vertical_sum'),
  time_slot: z.union([z.number().nonnegative(), z.literal('ALL')]),
  target_state: z.number().nonnegative(),
  operator: z.enum(['>=', '<=', '==']),
  value: z.number().nonnegative(),
  attribute: z.string(),
  attribute_values: z.array(z.string()).min(1),
})

export const ResourceStateCountConstraintSchema = z.object({
  type: z.literal('resource_state_count'),
  resource: z.string(),
  time_slots: z.array(z.number().nonnegative()).min(1),
  target_state: z.number().nonnegative(),
  operator: z.enum(['>=', '<=', '==']),
  value: z.number().nonnegative(),
})

export const PatternBlockConstraintSchema = z.object({
  type: z.literal('pattern_block'),
  pattern: z.array(z.string()).length(2),
  resources: z.literal('ALL'),
  state_mapping: z.record(z.string(), z.number()).optional(),
})

export const SolverConstraintSchema = z.union([
  PointConstraintSchema,
  VerticalSumConstraintSchema,
  HorizontalSumConstraintSchema,
  SlidingWindowConstraintSchema,
  AttributeVerticalSumConstraintSchema,
  ResourceStateCountConstraintSchema,
  PatternBlockConstraintSchema,
])

export const SolverResponseSchema = z.object({
  status: z.enum(['OPTIMAL', 'FEASIBLE', 'INFEASIBLE', 'ERROR']),
  schedule: z.record(z.string(), z.array(z.number())).optional(),
  message: z.string().optional(),
  solve_time_ms: z.number().optional(),
})

export type SolverConfig = z.infer<typeof SolverConfigSchema>
export type PointConstraint = z.infer<typeof PointConstraintSchema>
export type VerticalSumConstraint = z.infer<typeof VerticalSumConstraintSchema>
export type HorizontalSumConstraint = z.infer<typeof HorizontalSumConstraintSchema>
export type SlidingWindowConstraint = z.infer<typeof SlidingWindowConstraintSchema>
export type AttributeVerticalSumConstraint = z.infer<typeof AttributeVerticalSumConstraintSchema>
export type ResourceStateCountConstraint = z.infer<typeof ResourceStateCountConstraintSchema>
export type PatternBlockConstraint = z.infer<typeof PatternBlockConstraintSchema>
export type SolverConstraint = z.infer<typeof SolverConstraintSchema>
export type SolverResponse = z.infer<typeof SolverResponseSchema>
