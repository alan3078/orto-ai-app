/**
 * System Config Mapper
 * Fetches active system config groups/items and transforms them into solver-ready constraints.
 */

import { prisma } from '@/lib/prisma'
import type { SystemConfigScope } from '@prisma/client'

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
      console.warn(`[Mapper] Failed to derive constraint from policy ${policy.key}:`, err)
    }
  }

  console.log(`[Mapper] Generated ${constraints.length} system constraints from ${policies.length} policies (states: ${availableStates})`)
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

  console.log(`[Mapper] Built resource attributes for ${Object.keys(attributes).length} staff members`)
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
    console.warn(`[Mapper] Policy ${key} has invalid value type; expected object`)
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
      console.warn(`[Mapper] Unknown policy type: ${type}`)
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
      console.warn(`[Mapper] max_consecutive_nights has invalid limit: ${limit}`)
      return null
    }

    // Determine which state represents "night" for this roster
    let nightState: number | null = null
    if (typeof value.target_state === 'number') {
      nightState = value.target_state
    } else if (typeof (value as any).state === 'number') {
      nightState = (value as any).state
    }

    if (availableStates.length === 0) {
      console.warn('[Mapper] No available states provided; skipping max_consecutive_nights policy')
      return null
    }

    if (nightState === null || !availableStates.includes(nightState)) {
      // Fallback: prefer highest numbered state as night, else abort
      const fallbackState = Math.max(...availableStates)
      nightState = fallbackState
    }

    if (!availableStates.includes(nightState)) {
      console.log(`[Mapper] Skipping max_consecutive_nights: derived night state ${nightState} not in available states ${availableStates}`)
      return null
    }

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
    let nightState = typeof value.target_state === 'number' ? value.target_state : null

    if (nightState === null || !availableStates.includes(nightState)) {
      nightState = Math.max(...availableStates)
    }

    if (!availableStates.includes(nightState)) {
      console.log(`[Mapper] Skipping post_night_rest: night state ${nightState} not in available states`)
      return null
    }

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

    console.log(`[Mapper] Generated ${constraints.length} post_night_rest constraints (${workDays} nights → ${restDays} days off)`)
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
      console.warn(`[Mapper] min_daily_coverage has invalid config:`, value)
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
    let nightState = typeof value.target_state === 'number' ? value.target_state : null

    if (nightState === null || !availableStates.includes(nightState)) {
      nightState = Math.max(...availableStates)
    }

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

    console.log(`[Mapper] Generated ${constraints.length} night_distribution constraints (${minNights}-${maxNights} nights per person)`)
    return constraints
  }

  if (key === 'total_shift_cap') {
    // Rule #8: 13-16 total shifts per person per month
    const enabled = value.enabled
    if (enabled !== true) return null

    const minShifts = typeof value.min_shifts === 'number' ? value.min_shifts : 13
    const maxShifts = typeof value.max_shifts === 'number' ? value.max_shifts : 16
    
    // Work states are states that count as "working" (not OFF)
    // For APN: [1, 2, 3] = Afternoon, PM, Night
    // For DAY_NIGHT: [1, 2] = Day, Night
    let workStates: number[] = []
    if (Array.isArray(value.work_states)) {
      workStates = (value.work_states as number[]).filter(s => availableStates.includes(s))
    } else {
      // Default: all states except 0 (OFF)
      workStates = availableStates.filter(s => s !== 0)
    }

    if (workStates.length === 0) {
      console.warn('[Mapper] total_shift_cap: no valid work states found')
      return null
    }

    // Get time slots from config or default to 30 days
    let timeSlots: number[] = Array.from({ length: 30 }, (_, i) => i)
    if (Array.isArray(value.time_slots)) {
      timeSlots = value.time_slots as number[]
    }

    // For total shift cap, we need to count multiple states (any work state)
    // Use resource_state_count for each work state and sum them
    // However, this is complex - we'll generate constraints for each work state
    // and the solver would need a combined constraint
    
    // Alternative approach: Use horizontal_sum with total work count
    // For now, we'll generate a constraint per staff that counts OFF days
    // and requires: (total_slots - off_days) >= min_shifts AND <= max_shifts
    // Which is equivalent to: off_days <= total_slots - min_shifts AND >= total_slots - max_shifts
    
    const constraints: SystemConstraint[] = []
    const totalSlots = timeSlots.length

    for (const staff of staffList) {
      // Max OFF days = totalSlots - minShifts (so at least minShifts working)
      constraints.push({
        name: `${label} Min Work (${staff.employeeId})`,
        type: 'resource_state_count',
        config: {
          type: 'resource_state_count',
          resource: staff.employeeId,
          time_slots: timeSlots,
          target_state: 0, // OFF state
          operator: '<=',
          value: totalSlots - minShifts, // e.g., 30 - 13 = 17 max off days
        },
        priority,
        source: 'system',
      })

      // Min OFF days = totalSlots - maxShifts (so at most maxShifts working)
      constraints.push({
        name: `${label} Max Work (${staff.employeeId})`,
        type: 'resource_state_count',
        config: {
          type: 'resource_state_count',
          resource: staff.employeeId,
          time_slots: timeSlots,
          target_state: 0, // OFF state
          operator: '>=',
          value: totalSlots - maxShifts, // e.g., 30 - 16 = 14 min off days
        },
        priority,
        source: 'system',
      })
    }

    console.log(`[Mapper] Generated ${constraints.length} total_shift_cap constraints (${minShifts}-${maxShifts} shifts = ${totalSlots - maxShifts}-${totalSlots - minShifts} off days)`)
    return constraints
  }

  return null
}
