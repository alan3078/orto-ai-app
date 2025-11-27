/**
 * Validation schemas for Roster Validator (Audit Mode)
 * Part of FN/BE/ENG/002
 */

import { z } from 'zod'

export const ConstraintValidationResultSchema = z.object({
  constraint_index: z.number(),
  constraint_type: z.string(),
  constraint_name: z.string().nullable().optional(),
  status: z.enum(['PASS', 'FAIL']),
  details: z.string().nullable().optional(),
  violations: z.array(z.record(z.string(), z.any())).optional(),
})

export const VerticalSummarySchema = z.object({
  time_slot: z.number(),
  date: z.string().nullable().optional(),
  counts: z.record(z.string(), z.number()),
  ic_count: z.number().default(0),
})

export const HorizontalSummarySchema = z.object({
  resource: z.string(),
  counts: z.record(z.string(), z.number()),
  ic_count: z.number().default(0),
})

export const ScheduleSummarySchema = z.object({
  vertical_summary: z.array(VerticalSummarySchema).default([]),
  horizontal_summary: z.array(HorizontalSummarySchema).default([]),
  total_ic_count: z.number().default(0),
})

export const ValidateResponseSchema = z.object({
  overall_status: z.enum(['PASS', 'FAIL']),
  total_constraints: z.number(),
  passed_constraints: z.number(),
  failed_constraints: z.number(),
  results: z.array(ConstraintValidationResultSchema),
  summary: ScheduleSummarySchema.nullable().optional(),
  validation_time_ms: z.number().nullable().optional(),
})

export type ConstraintValidationResult = z.infer<typeof ConstraintValidationResultSchema>
export type VerticalSummary = z.infer<typeof VerticalSummarySchema>
export type HorizontalSummary = z.infer<typeof HorizontalSummarySchema>
export type ScheduleSummary = z.infer<typeof ScheduleSummarySchema>
export type ValidateResponse = z.infer<typeof ValidateResponseSchema>
