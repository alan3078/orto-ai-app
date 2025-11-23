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
  violations: z.array(z.record(z.any())).optional(),
})

export const ValidateResponseSchema = z.object({
  overall_status: z.enum(['PASS', 'FAIL']),
  total_constraints: z.number(),
  passed_constraints: z.number(),
  failed_constraints: z.number(),
  results: z.array(ConstraintValidationResultSchema),
  validation_time_ms: z.number().nullable().optional(),
})

export type ConstraintValidationResult = z.infer<typeof ConstraintValidationResultSchema>
export type ValidateResponse = z.infer<typeof ValidateResponseSchema>
