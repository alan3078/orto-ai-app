/**
 * Validation schemas for Roster Validator (Audit Mode)
 * Part of FN/BE/ENG/002
 */

import { z } from 'zod';
import { ValidationStatus } from '@/types/enums';

// Violation schema for constraint validation results
export const ViolationSchema = z.object({
  resource: z.string().optional(),
  time_slot: z.number().optional(),
  expected: z.union([z.string(), z.number()]).optional(),
  actual: z.union([z.string(), z.number()]).optional(),
  target_state: z.number().optional(),
  pattern: z.array(z.string()).optional(),
  issue: z.string().optional(),
  start_time_slot: z.number().optional(),
  end_time_slot: z.number().optional(),
  time_slots: z.array(z.number()).optional(),
  attribute_filter: z.string().optional(),
  attribute_filters: z.record(z.string(), z.array(z.string())).optional(),
  filtered_resources: z.array(z.string()).optional(),
});

export const ConstraintValidationResultSchema = z.object({
  constraint_index: z.number(),
  constraint_type: z.string(),
  constraint_name: z.string().nullable().optional(),
  status: z.nativeEnum(ValidationStatus),
  details: z.string().nullable().optional(),
  violations: z.array(ViolationSchema).optional(),
});

export const VerticalSummarySchema = z.object({
  time_slot: z.number(),
  date: z.string().nullable().optional(),
  counts: z.record(z.string(), z.number()),
  ic_count: z.number().default(0),
});

export const HorizontalSummarySchema = z.object({
  resource: z.string(),
  counts: z.record(z.string(), z.number()),
  ic_count: z.number().default(0),
});

export const ScheduleSummarySchema = z.object({
  vertical_summary: z.array(VerticalSummarySchema).default([]),
  horizontal_summary: z.array(HorizontalSummarySchema).default([]),
  total_ic_count: z.number().default(0),
});

export const ValidateResponseSchema = z.object({
  overall_status: z.nativeEnum(ValidationStatus),
  total_constraints: z.number(),
  passed_constraints: z.number(),
  failed_constraints: z.number(),
  results: z.array(ConstraintValidationResultSchema),
  summary: ScheduleSummarySchema.nullable().optional(),
  validation_time_ms: z.number().nullable().optional(),
});

export type ConstraintValidationResult = z.infer<typeof ConstraintValidationResultSchema>;
export type VerticalSummary = z.infer<typeof VerticalSummarySchema>;
export type HorizontalSummary = z.infer<typeof HorizontalSummarySchema>;
export type ScheduleSummary = z.infer<typeof ScheduleSummarySchema>;
export type ValidateResponse = z.infer<typeof ValidateResponseSchema>;
