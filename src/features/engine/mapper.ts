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
    default:
      console.warn(`[Mapper] Unknown policy type: ${type}`)
      return null
  }
}

/**
 * Nurse safety rules (max consecutive nights, night-to-day block).
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
    const limit = value.limit
    if (typeof limit !== 'number' || limit <= 0) {
      console.warn(`[Mapper] max_consecutive_nights has invalid limit: ${limit}`)
      return null
    }

    // Night state = 2; skip if not available in roster config
    const NIGHT_STATE = 2
    if (!availableStates.includes(NIGHT_STATE)) {
      console.log(`[Mapper] Skipping max_consecutive_nights: state ${NIGHT_STATE} not in available states ${availableStates}`)
      return null
    }

    // Generate one constraint per staff
    const constraints: SystemConstraint[] = staffList.map((staff) => ({
      name: `${label} (${staff.employeeId})`,
      type: 'horizontal_sum',
      config: {
        type: 'horizontal_sum',
        resource: staff.employeeId,
        time_slots: [0, 1, 2, 3, 4, 5, 6],
        target_state: NIGHT_STATE,
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

    // Pattern block constraint (custom type for solver)
    return {
      name: label,
      type: 'pattern_block',
      config: {
        type: 'pattern_block',
        pattern: ['NIGHT', 'DAY'], // Solver will map these to state codes
        resources: 'ALL',
      },
      priority,
      source: 'system',
    }
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
