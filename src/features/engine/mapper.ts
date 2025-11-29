/**
 * System Config Mapper
 * Fetches active system config groups/items and transforms them into solver-ready constraints.
 */

import { prisma } from '@/lib/prisma'
import type { SystemConfigScope } from '@prisma/client'
import { ShiftType } from '@/types/enums'

export interface SystemPolicy {
  id: number
  groupCode: string
  scope: SystemConfigScope
  key: string
  label: string
  type: string
  value: unknown
  locked: boolean
  priority: number
}

export interface SystemConstraint {
  name: string
  type: string
  config: Record<string, unknown>
  priority: number
  source: 'system'
}

export interface ShiftTypeHoursConfig {
  shiftType: ShiftType
  minHoursPerMonth: number
  maxHoursPerMonth: number
  avgShiftDurationMinutes: number
}

interface FetchOptions {
  includeGlobal?: boolean
  includeRoster?: boolean
}

/**
 * Fetch active system policies (groups + items).
 */
export async function fetchSystemPolicies(
  options: FetchOptions = { includeGlobal: true, includeRoster: true }
): Promise<SystemPolicy[]> {
  const scopeFilter: SystemConfigScope[] = []
  if (options.includeGlobal) scopeFilter.push('GLOBAL')
  if (options.includeRoster) scopeFilter.push('ROSTER')

  if (scopeFilter.length === 0) return []

  const groups = await prisma.systemConfigGroup.findMany({
    where: {
      isActive: true,
      scope: { in: scopeFilter },
    },
    include: {
      items: {
        where: { isActive: true },
      },
    },
  })

  const policies: SystemPolicy[] = []
  for (const group of groups) {
    for (const item of group.items) {
      policies.push({
        id: item.id,
        groupCode: group.code,
        scope: group.scope,
        key: item.key,
        label: item.label,
        type: item.type,
        value: item.value,
        locked: item.locked,
        priority: item.priority,
      })
    }
  }

  return policies
}

/**
 * Fetch shift type configuration and calculate average shift duration.
 * Used for dynamic working hours constraints based on shift_type_config + shift_definition.
 * @param shiftType - The shift type to fetch config for (APN or SEVEN_E)
 */
export async function fetchShiftTypeHoursConfig(
  shiftType: ShiftType
): Promise<ShiftTypeHoursConfig | null> {
  const config = await prisma.shiftTypeConfig.findUnique({
    where: { shiftType },
  })

  if (!config || !config.isActive) {
    return null
  }

  // Fetch active shift definitions filtered by shift type pattern
  // 7E pattern uses codes '7' and 'E' (12h shifts)
  // APN pattern uses codes 'A', 'P', 'N' (8.5h shifts)
  const shiftCodes = shiftType === ShiftType.SEVEN_E 
    ? ['7', 'E'] 
    : ['A', 'P', 'N']
  
  const shiftDefs = await prisma.shiftDefinition.findMany({
    where: { 
      isActive: true, 
      deletedAt: null,
      code: { in: shiftCodes },
    },
    select: { durationMinutes: true },
  })

  if (shiftDefs.length === 0) {
    return null
  }

  // Calculate average shift duration for this shift type
  const totalMinutes = shiftDefs.reduce((sum, sd) => sum + sd.durationMinutes, 0)
  const avgShiftDurationMinutes = Math.round(totalMinutes / shiftDefs.length)

  return {
    shiftType: config.shiftType as unknown as ShiftType,
    minHoursPerMonth: config.minHoursPerMonth,
    maxHoursPerMonth: config.maxHoursPerMonth,
    avgShiftDurationMinutes,
  }
}

/**
 * Build working hours constraints from shift type config.
 * Converts min/max hours per month to min/max shifts per staff.
 * @param hoursConfig - Shift type hours configuration
 * @param staffList - List of staff with employeeId
 * @param timeSlots - Number of time slots (days) in the roster period
 */
export function buildWorkingHoursConstraints(
  hoursConfig: ShiftTypeHoursConfig,
  staffList: Array<{ employeeId: string }>,
  timeSlots: number
): SystemConstraint[] {
  const constraints: SystemConstraint[] = []
  
  const shiftDurationHours = hoursConfig.avgShiftDurationMinutes / 60
  
  // Calculate min/max shifts from hours
  // Min shifts = ceil(minHours / shiftDuration) to ensure at least minHours
  // Max shifts = floor(maxHours / shiftDuration) to not exceed maxHours
  const minShifts = Math.ceil(hoursConfig.minHoursPerMonth / shiftDurationHours)
  const maxShifts = Math.floor(hoursConfig.maxHoursPerMonth / shiftDurationHours)
  
  // Time slots array for the entire roster period
  const timeSlotArray = Array.from({ length: timeSlots }, (_, i) => i)
  
  for (const staff of staffList) {
    // Min work constraint: max OFF days = totalSlots - minShifts
    constraints.push({
      name: `Working Hours Min (${staff.employeeId})`,
      type: 'resource_state_count',
      config: {
        type: 'resource_state_count',
        resource: staff.employeeId,
        time_slots: timeSlotArray,
        target_state: 0, // OFF state
        operator: '<=',
        value: timeSlots - minShifts,
      },
      priority: 100, // High priority for working hours
      source: 'system',
    })
    
    // Max work constraint: min OFF days = totalSlots - maxShifts
    constraints.push({
      name: `Working Hours Max (${staff.employeeId})`,
      type: 'resource_state_count',
      config: {
        type: 'resource_state_count',
        resource: staff.employeeId,
        time_slots: timeSlotArray,
        target_state: 0, // OFF state
        operator: '>=',
        value: timeSlots - maxShifts,
      },
      priority: 100, // High priority for working hours
      source: 'system',
    })
  }
  
  return constraints
}

/**
 * Build system constraints from policies + staff list.
 * @param availableStates - Array of available states in the roster config (e.g., [0, 1] or [0, 1, 2])
 */
export async function buildSystemConstraints(
  policies: SystemPolicy[],
  staffList: Array<{ employeeId: string }>,
  availableStates: number[] = [0, 1]
): Promise<SystemConstraint[]> {
  const constraints: SystemConstraint[] = []

  for (const policy of policies) {
    try {
      const derived = deriveConstraint(policy, staffList, availableStates)
      if (derived) {
        if (Array.isArray(derived)) {
          constraints.push(...derived)
        } else {
          constraints.push(derived)
        }
      }
    } catch (err) {
      // Skip policies that fail to derive constraints
    }
  }

  return constraints
}

/**
 * Build resource attributes map for solver (FN/ADM/STF/007)
 * @param staffList - Staff with extended attributes (gender, roles, monthly hours)
 */
export function buildResourceAttributes(
  staffList: Array<{
    employeeId: string
    gender?: string | null
    monthlyMaxHours?: number | null
    staffRoles?: Array<{ role: { name: string; order: number } }>
  }>
): Record<string, { gender?: string; rolesOrdered?: string[]; monthlyMaxHours?: number }> {
  const attributes: Record<string, any> = {}

  for (const staff of staffList) {
    const attr: any = {}

    if (staff.gender) {
      attr.gender = staff.gender
    }

    if (staff.staffRoles && staff.staffRoles.length > 0) {
      // Already ordered by role.order ASC from query
      attr.rolesOrdered = staff.staffRoles.map((sr) => sr.role.name)
    }

    if (staff.monthlyMaxHours !== null && staff.monthlyMaxHours !== undefined) {
      attr.monthlyMaxHours = staff.monthlyMaxHours
    }

    // Only include if at least one attribute present
    if (Object.keys(attr).length > 0) {
      attributes[staff.employeeId] = attr
    }
  }

  return attributes
}

/**
 * Derive constraint object(s) from a single policy.
 */
function deriveConstraint(
  policy: SystemPolicy,
  staffList: Array<{ employeeId: string }>,
  availableStates: number[]
): SystemConstraint | SystemConstraint[] | null {
  const { type, key, label, value, priority } = policy

  // Validate value is object
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const val = value as Record<string, unknown>

  switch (type) {
    case 'nurse_safety':
      return deriveNurseSafety(key, label, val, priority, staffList, availableStates)
    case 'coverage':
      return deriveCoverage(key, label, val, priority)
    case 'fairness':
      return deriveFairness(key, label, val, priority, staffList, availableStates)
    default:
      return null
  }
}

/**
 * Nurse safety rules (max consecutive nights, night-to-day block, post-night rest).
 */
function deriveNurseSafety(
  key: string,
  label: string,
  value: Record<string, unknown>,
  priority: number,
  staffList: Array<{ employeeId: string }>,
  availableStates: number[]
): SystemConstraint | SystemConstraint[] | null {
  if (key === 'max_consecutive_nights') {
    // Horizontal sum per staff
    const limit = typeof value.limit === 'number' ? value.limit : Number(value.limit)
    if (!Number.isFinite(limit) || limit <= 0) {
      return null
    }

    if (availableStates.length === 0) {
      return null
    }

    // Night is ALWAYS the max state: APN=3 (N), 7E=2 (E)
    const nightState = Math.max(...availableStates)

    // Build the time slot horizon to inspect for consecutive nights
    let timeSlots: number[] | null = null
    if (Array.isArray((value as any).time_slots)) {
      const arr = (value as any).time_slots
      if (arr.every((t: unknown) => typeof t === 'number')) {
        timeSlots = arr as number[]
      }
    }

    if (!timeSlots) {
      const horizon = typeof (value as any).time_slot_count === 'number' ? (value as any).time_slot_count : 30
      timeSlots = Array.from({ length: Math.max(1, horizon) }, (_, i) => i)
    }

    // Generate one constraint per staff
    const constraints: SystemConstraint[] = staffList.map((staff) => ({
      name: `${label} (${staff.employeeId})`,
      type: 'horizontal_sum',
      config: {
        type: 'horizontal_sum',
        resource: staff.employeeId,
        time_slots: timeSlots,
        target_state: nightState!,
        operator: '<=',
        value: limit,
      },
      priority,
      source: 'system',
    }))

    return constraints
  }

  if (key === 'night_to_day_block') {
    const enabled = value.enabled
    if (enabled !== true) return null

    // Attempt to respect configured state mapping overrides
    const stateMapping = (value as any).state_mapping && typeof (value as any).state_mapping === 'object'
      ? (value as any).state_mapping as Record<string, number>
      : undefined

    // Pattern block constraint (custom type for solver)
    return {
      name: label,
      type: 'pattern_block',
      config: {
        type: 'pattern_block',
        pattern: ['NIGHT', 'DAY'], // Solver will map these to state codes
        resources: 'ALL',
        state_mapping: stateMapping,
      },
      priority,
      source: 'system',
    }
  }

  if (key === 'post_night_rest') {
    // Rule #7: After a night block, require rest days
    const enabled = value.enabled
    if (enabled !== true) return null

    const workDays = typeof value.work_days === 'number' ? value.work_days : 3
    const restDays = typeof value.rest_days === 'number' ? value.rest_days : 2
    // Night is ALWAYS the max state: APN=3 (N), 7E=2 (E)
    // Ignore seed target_state since it may not match current shift type
    const nightState = Math.max(...availableStates)

    // Generate sliding_window constraint per staff
    const constraints: SystemConstraint[] = staffList.map((staff) => ({
      name: `${label} (${staff.employeeId})`,
      type: 'sliding_window',
      config: {
        type: 'sliding_window',
        resource: staff.employeeId,
        work_days: workDays,
        rest_days: restDays,
        target_state: nightState!,
      },
      priority,
      source: 'system',
    }))

    return constraints
  }

  return null
}

/**
 * Coverage rules (minimum daily staffing).
 */
function deriveCoverage(
  key: string,
  label: string,
  value: Record<string, unknown>,
  priority: number
): SystemConstraint | null {
  if (key === 'min_daily_coverage') {
    const min = value.min
    const targetState = value.target_state

    if (typeof min !== 'number' || typeof targetState !== 'number') {
      return null
    }

    return {
      name: label,
      type: 'vertical_sum',
      config: {
        type: 'vertical_sum',
        time_slot: 'ALL',
        target_state: targetState,
        operator: '>=',
        value: min,
      },
      priority,
      source: 'system',
    }
  }

  return null
}

/**
 * Fairness rules (night distribution, total shift cap).
 */
function deriveFairness(
  key: string,
  label: string,
  value: Record<string, unknown>,
  priority: number,
  staffList: Array<{ employeeId: string }>,
  availableStates: number[]
): SystemConstraint | SystemConstraint[] | null {
  if (key === 'night_distribution') {
    // Rule #5: Each person should work 4-6 night shifts over the month
    const enabled = value.enabled
    if (enabled !== true) return null

    const minNights = typeof value.min_nights === 'number' ? value.min_nights : 4
    const maxNights = typeof value.max_nights === 'number' ? value.max_nights : 6
    // Night is ALWAYS the max state: APN=3 (N), 7E=2 (E)
    // Ignore seed target_state since it may not match current shift type
    const nightState = Math.max(...availableStates)

    // Get time slots from config or default to 30 days
    let timeSlots: number[] = Array.from({ length: 30 }, (_, i) => i)
    if (Array.isArray(value.time_slots)) {
      timeSlots = value.time_slots as number[]
    }

    // Generate two constraints per staff: min >= 4 and max <= 6
    const constraints: SystemConstraint[] = []

    for (const staff of staffList) {
      // Minimum night shifts
      constraints.push({
        name: `${label} Min (${staff.employeeId})`,
        type: 'resource_state_count',
        config: {
          type: 'resource_state_count',
          resource: staff.employeeId,
          time_slots: timeSlots,
          target_state: nightState!,
          operator: '>=',
          value: minNights,
        },
        priority,
        source: 'system',
      })

      // Maximum night shifts
      constraints.push({
        name: `${label} Max (${staff.employeeId})`,
        type: 'resource_state_count',
        config: {
          type: 'resource_state_count',
          resource: staff.employeeId,
          time_slots: timeSlots,
          target_state: nightState!,
          operator: '<=',
          value: maxNights,
        },
        priority,
        source: 'system',
      })
    }

    return constraints
  }

  // NOTE: dayoff_distribution is a placeholder - days off are determined by coverage requirements
  // The solver assigns OFF state to remaining slots after satisfying coverage constraints.
  // Future: Could add soft optimization objective to balance dayoffs across staff.

  // NOTE: total_shift_cap is now handled dynamically via buildWorkingHoursConstraints()
  // using shift_type_config min/max hours per month and shift_definition duration

  return null
}
