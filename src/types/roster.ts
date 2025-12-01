/**
 * Roster-related type definitions
 * These types are used across the app for roster management, shifts, and scheduling
 */

import type { RosterStatus, ShiftType, LeaveType, LeaveStatus } from '@prisma/client'
import type { Staff } from './staff'

/**
 * Resource attributes for solver
 */
export interface ResourceAttributes {
  gender?: string
  roles?: string[]
}

/**
 * Map of resource ID to attributes
 */
export type ResourceAttributesMap = Record<string, ResourceAttributes>

/**
 * State mapping for display (e.g., {'O': 0, 'A': 1, 'P': 2, 'N': 3})
 */
export type StateMapping = Record<string, number>

/**
 * Previous month assignment for cross-month constraint enforcement
 */
export interface PreviousMonthAssignment {
  resource: string
  offset_days: number
  state: number
}

/**
 * Shift record from database
 */
export interface Shift {
  id: string
  rosterId: string
  staffId: string
  staff?: Staff
  timeSlot: number
  state: number
  date: Date
  notes: string | null
  isIC: boolean
  createdAt: Date
}

/**
 * Leave record from database
 */
export interface Leave {
  id: string
  staffId: string
  staff?: Staff
  startDate: Date
  endDate: Date
  leaveType: LeaveType
  status: LeaveStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Roster with related data
 */
export interface Roster {
  id: string
  name: string
  startDate: Date
  endDate: Date
  status: RosterStatus
  shiftType: ShiftType
  solveTimeMs: number | null
  solverStatus: string | null
  errorMessage: string | null
  timeSlots: number
  states: number[]
  shifts?: Shift[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Roster with shifts organized by staff for grid display
 */
export interface RosterWithShiftsByStaff extends Roster {
  shiftsByStaff: Record<string, {
    staff: Staff
    shifts: Shift[]
  }>
}

import type { Prisma } from '@prisma/client'

/**
 * Constraint configuration from database
 */
export interface Constraint {
  id: string
  name: string
  description: string | null
  type: string
  config: Prisma.JsonValue
  isActive: boolean
  isRequired?: boolean
  priority: number
  shiftType: ShiftType | null
  createdAt: Date
  updatedAt: Date
}

/**
 * System constraint generated from policies
 */
export interface SystemConstraint {
  name?: string
  type: string
  config: Record<string, unknown>
  priority?: number
  source?: 'system'
  isRequired?: boolean
  is_required?: boolean
}
