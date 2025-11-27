import { prisma } from '@/lib/prisma'
import {
  SolverConfigSchema,
  SolverConstraintSchema,
  SolverResponseSchema,
  type SolverResponse,
  type SolverConstraint,
} from '@/lib/validations/solver'
import { ValidateResponseSchema, type ValidateResponse } from '@/lib/validations/validator'
import { ConstraintType } from '@/types/enums'

/**
 * Solver Integration Service
 * Orchestrates the complete workflow: DB → Python API → DB
 */
export class SolverIntegrationService {
  private readonly engineUrl: string

  constructor(engineUrl = process.env.SOLVER_ENGINE_URL || 'http://localhost:8000') {
    this.engineUrl = engineUrl
  }

  /**
   * Generate a roster using the Python solver engine
   * @param rosterName Human-readable name for the roster
   * @param startDate Start date of the schedule period
   * @param timeSlots Number of time slots (e.g., 7 days)
   * @param staffIds Array of staff IDs to include
   * @param constraintIds Array of constraint IDs to apply
   * @param systemConstraints Optional array of system-derived constraints to merge
   * @param resourceAttributes Optional resource attributes map (gender, roles, monthly hours) - FN/ADM/STF/007
   * @param shiftType Shift type configuration: APN or DAY_NIGHT
   */
  async generateRoster(
    rosterName: string,
    startDate: Date,
    timeSlots: number,
    staffIds: string[],
    constraintIds: string[],
    systemConstraints: Array<{ type: string; config: Record<string, unknown> }> = [],
    resourceAttributes: Record<string, any> = {},
    shiftType: 'APN' | 'DAY_NIGHT' = 'APN'
  ): Promise<{ rosterId: string; status: string }> {
    // Step 1: Fetch staff and constraints from database
    console.log(`[SolverIntegration] Received ${staffIds.length} staffIds to process`)
    
    const staff = await prisma.staff.findMany({
      where: { id: { in: staffIds }, isActive: true },
      include: { staffRoles: { include: { role: true } } },
    })

    console.log(`[SolverIntegration] Found ${staff.length} active staff in DB:`, staff.map(s => ({ id: s.id, employeeId: s.employeeId, name: s.name })))

    // Fetch constraints filtered by shiftType:
    // - Include constraints matching the specific shiftType (APN or DAY_NIGHT)
    // - Include GLOBAL constraints (shiftType is null)
    const constraints = await prisma.constraint.findMany({
      where: { 
        id: { in: constraintIds }, 
        isActive: true,
        OR: [
          { shiftType: shiftType },   // Specific to this shift type
          { shiftType: null },        // GLOBAL constraints
        ],
      },
    })

    console.log(`[SolverIntegration] Filtered ${constraints.length} constraints for shiftType=${shiftType} (includes GLOBAL)`)

    if (staff.length === 0) {
      throw new Error('No active staff found')
    }

    // Step 2: Create Roster record with SOLVING status
    // Determine states based on shift type
    const states = shiftType === 'APN' ? [0, 1, 2, 3] : [0, 1, 2]
    
    const roster = await prisma.roster.create({
      data: {
        name: rosterName,
        startDate,
        endDate: new Date(startDate.getTime() + timeSlots * 24 * 60 * 60 * 1000),
        status: 'SOLVING',
        shiftType,
        timeSlots,
        states,
        constraints: {
          connect: constraints.map((c: any) => ({ id: c.id })),
        },
      },
    })

    try {
      // Step 3: Transform data for Python API
      const solverRequest = this.buildSolverRequest(staff, constraints, timeSlots, systemConstraints, resourceAttributes, states)

      // Step 4: Call Python solver
      const solverResponse = await this.callSolverApi(solverRequest)

      // Step 5: Handle response and save results
      await this.saveSolverResults(roster.id, staff, solverResponse, startDate, timeSlots, shiftType)

      return {
        rosterId: roster.id,
        status: solverResponse.status,
      }
    } catch (error) {
      // Update roster with error status
      await prisma.roster.update({
        where: { id: roster.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      throw error
    }
  }

  /**
   * Build solver request payload from database models
   */
  private buildSolverRequest(
    staff: Array<{ id: string; employeeId: string; gender?: string | null; staffRoles?: { role: { name: string } }[] }>,
    constraints: Array<{ type: string; config: unknown }>,
    timeSlots: number,
    systemConstraints: Array<{ type: string; config: Record<string, unknown> }> = [],
    resourceAttributes: Record<string, any> = {},
    states: number[] = [0, 1, 2]
  ) {
    // Map database constraint config to solver format
    const solverConstraints: SolverConstraint[] = constraints.map((c) => {
      const config = c.config as Record<string, unknown>
      switch (c.type) {
        case ConstraintType.POINT:
          return {
            type: ConstraintType.POINT,
            resource: config.resource as string,
            time_slot: config.time_slot as number,
            state: config.state as number,
          }
        case ConstraintType.VERTICAL_SUM:
          return {
            type: ConstraintType.VERTICAL_SUM,
            time_slot: config.time_slot as number | 'ALL',
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
          }
        case ConstraintType.HORIZONTAL_SUM:
          return {
            type: ConstraintType.HORIZONTAL_SUM,
            resource: config.resource as string,
            time_slots: (config.time_slots as number[]) || [],
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
          }
        case ConstraintType.SLIDING_WINDOW:
          return {
            type: ConstraintType.SLIDING_WINDOW,
            resource: config.resource as string,
            work_days: config.work_days as number,
            rest_days: config.rest_days as number,
            target_state: config.target_state as number,
          }
        case ConstraintType.ATTRIBUTE_VERTICAL_SUM:
          return {
            type: ConstraintType.ATTRIBUTE_VERTICAL_SUM as any,
            time_slot: config.time_slot as number | 'ALL',
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
            attribute: config.attribute as string,
            attribute_values: config.attribute_values as string[],
          } as any
        case ConstraintType.RESOURCE_STATE_COUNT:
          return {
            type: ConstraintType.RESOURCE_STATE_COUNT as any,
            resource: config.resource as string,
            time_slots: (config.time_slots as number[]) || [],
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
          } as any
        case ConstraintType.PATTERN_BLOCK:
          return {
            type: ConstraintType.PATTERN_BLOCK as any,
            pattern: config.pattern as string[],
            resources: 'ALL',
            state_mapping: config.state_mapping as Record<string, number> | undefined,
          } as any
        case ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM:
          return {
            type: ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM as any,
            time_slot: config.time_slot as number | 'ALL',
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
            attribute_filters: config.attribute_filters as Record<string, string[]>,
          } as any
        default:
          throw new Error(`Unsupported constraint type: ${c.type}`)
      }
    })

    // Merge system constraints (already in solver format)
    const systemSolverConstraints = systemConstraints
      .map((sc) => {
        const config = sc.config
        switch (sc.type) {
          case ConstraintType.POINT:
            return {
              type: ConstraintType.POINT,
              resource: config.resource as string,
              time_slot: config.time_slot as number,
              state: config.state as number,
            }
          case ConstraintType.VERTICAL_SUM:
            return {
              type: ConstraintType.VERTICAL_SUM,
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            }
          case ConstraintType.HORIZONTAL_SUM:
            return {
              type: ConstraintType.HORIZONTAL_SUM,
              resource: config.resource as string,
              time_slots: (config.time_slots as number[]) || [],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            }
          case ConstraintType.SLIDING_WINDOW:
            return {
              type: ConstraintType.SLIDING_WINDOW,
              resource: config.resource as string,
              work_days: config.work_days as number,
              rest_days: config.rest_days as number,
              target_state: config.target_state as number,
            }
          case ConstraintType.RESOURCE_STATE_COUNT:
            return {
              type: ConstraintType.RESOURCE_STATE_COUNT,
              resource: config.resource as string,
              time_slots: (config.time_slots as number[]) || [],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            }
          case ConstraintType.PATTERN_BLOCK:
            return {
              type: ConstraintType.PATTERN_BLOCK,
              pattern: config.pattern as string[],
              resources: 'ALL',
              state_mapping: config.state_mapping as Record<string, number> | undefined,
            }
          case ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM:
            return {
              type: ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM,
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
              attribute_filters: config.attribute_filters as Record<string, string[]>,
            }
          default:
            console.warn(`[SolverIntegration] Skipping unsupported system constraint type: ${sc.type}`)
            return null
        }
      })
      .filter((c) => c !== null)

    const allConstraints = [...solverConstraints, ...systemSolverConstraints]
    console.log(`[SolverIntegration] Merged ${solverConstraints.length} user + ${systemSolverConstraints.length} system constraints`)

    const resourceList = staff.map((s) => s.employeeId)
    console.log(`[SolverIntegration] Building payload with ${resourceList.length} resources:`, resourceList)

    const payload: any = {
      config: {
        resources: resourceList,
        time_slots: timeSlots,
        // Use dynamic states based on shift type (APN or DAY_NIGHT)
        states,
        resource_attributes: Object.fromEntries(
          staff.map(s => [s.employeeId, {
            gender: s.gender,
            roles: (s.staffRoles || []).map(r => r.role.name)
          }])
        ),
      },
      constraints: allConstraints,
    }

    // Include resource_attributes if present (FN/ADM/STF/007)
    if (Object.keys(resourceAttributes).length > 0) {
      payload.resource_attributes = resourceAttributes
      console.log(`[SolverIntegration] Including resource_attributes for ${Object.keys(resourceAttributes).length} resources`)
    }

    // Validate before sending
    // Basic validation for known types; new extended types may be validated server-side
    try {
      SolverConfigSchema.parse({ resources: payload.config.resources, time_slots: payload.config.time_slots, states: payload.config.states })
      payload.constraints.forEach((c: any) => {
        if (['point','vertical_sum','horizontal_sum','sliding_window'].includes(c.type)) {
          SolverConstraintSchema.parse(c)
        }
      })
    } catch (e) {
      console.warn('[SolverIntegration] Validation warning:', (e as Error).message)
    }

    return payload
  }

  /**
   * Call Python solver API
   */
  private async callSolverApi(request: unknown): Promise<SolverResponse> {
    const response = await fetch(`${this.engineUrl}/api/v1/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Solver API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()

    // Validate response
    return SolverResponseSchema.parse(data)
  }

  /**
   * Save solver results to database
   */
  private async saveSolverResults(
    rosterId: string,
    staff: Array<{ id: string; employeeId: string; staffRoles?: { role: { name: string } }[] }>,
    solverResponse: SolverResponse,
    startDate: Date,
    timeSlots: number,
    shiftType: 'APN' | 'DAY_NIGHT' = 'APN'
  ) {
    const { status, schedule, solve_time_ms, message } = solverResponse

    // Create employeeId -> staffId map
    const employeeIdToStaffId = new Map(staff.map((s) => [s.employeeId, s.id]))
    
    // Create employeeId -> hasICRole map for IC assignment
    const employeeIdHasICRole = new Map(
      staff.map((s) => [
        s.employeeId, 
        (s.staffRoles || []).some((sr) => sr.role.name === 'IC')
      ])
    )

    if (status === 'INFEASIBLE') {
      // No solution found
      await prisma.roster.update({
        where: { id: rosterId },
        data: {
          status: 'INFEASIBLE',
          solverStatus: status,
          errorMessage: message || 'No feasible solution found',
        },
      })
      return
    }

    if (!schedule) {
      throw new Error('Solver returned success but no schedule data')
    }

    // Debug: Log what the solver returned
    const scheduleEmployeeIds = Object.keys(schedule)
    console.log(`[SolverIntegration] Solver returned schedule for ${scheduleEmployeeIds.length} employees:`, scheduleEmployeeIds)
    console.log(`[SolverIntegration] Staff map has ${staff.length} entries:`, staff.map(s => s.employeeId))

    // Determine IC states based on shift type
    // For DAY_NIGHT: Day=1, Night=2; For APN: A=1, P=2, N=3
    const icWorkStates = shiftType === 'DAY_NIGHT' ? [1, 2] : [1, 2, 3]

    // Build schedule lookup for IC assignment: timeSlot -> state -> list of employeeIds with IC role
    const timeSlotStateICStaff: Map<number, Map<number, string[]>> = new Map()
    for (let t = 0; t < timeSlots; t++) {
      const stateMap = new Map<number, string[]>()
      for (const state of icWorkStates) {
        stateMap.set(state, [])
      }
      timeSlotStateICStaff.set(t, stateMap)
    }

    // Populate IC-eligible staff per time slot per state
    for (const [employeeId, stateArray] of Object.entries(schedule)) {
      const hasICRole = employeeIdHasICRole.get(employeeId)
      if (!hasICRole) continue

      for (let t = 0; t < timeSlots; t++) {
        const state = stateArray[t]
        if (icWorkStates.includes(state)) {
          timeSlotStateICStaff.get(t)?.get(state)?.push(employeeId)
        }
      }
    }

    // Track IC assignments per staff for round-robin fairness
    const icAssignmentCount = new Map<string, number>()
    for (const employeeId of scheduleEmployeeIds) {
      icAssignmentCount.set(employeeId, 0)
    }

    // Assign IC for each time slot and each working state (round-robin among eligible staff)
    const icAssignments = new Map<string, Set<number>>() // employeeId -> Set of timeSlots with IC
    for (let t = 0; t < timeSlots; t++) {
      for (const state of icWorkStates) {
        const eligibleStaff = timeSlotStateICStaff.get(t)?.get(state) || []
        if (eligibleStaff.length === 0) continue

        // Sort by IC assignment count for round-robin fairness
        eligibleStaff.sort((a, b) => 
          (icAssignmentCount.get(a) || 0) - (icAssignmentCount.get(b) || 0)
        )

        // Assign IC to the staff with fewest IC assignments
        const selectedEmployeeId = eligibleStaff[0]
        icAssignmentCount.set(selectedEmployeeId, (icAssignmentCount.get(selectedEmployeeId) || 0) + 1)
        
        if (!icAssignments.has(selectedEmployeeId)) {
          icAssignments.set(selectedEmployeeId, new Set())
        }
        icAssignments.get(selectedEmployeeId)!.add(t)
      }
    }

    console.log(`[SolverIntegration] IC assignments:`, Object.fromEntries(
      Array.from(icAssignments.entries()).map(([emp, slots]) => [emp, Array.from(slots)])
    ))

    // Transform schedule matrix to Shift records with IC assignments
    const shifts = []
    for (const [employeeId, stateArray] of Object.entries(schedule)) {
      const staffId = employeeIdToStaffId.get(employeeId)
      if (!staffId) {
        console.warn(`[SolverIntegration] No staffId found for employeeId: ${employeeId}`)
        continue
      }

      const employeeICSlots = icAssignments.get(employeeId) || new Set()

      for (let t = 0; t < timeSlots; t++) {
        const state = stateArray[t]
        // Mark as IC if this employee is assigned IC for this slot AND they are working (not OFF)
        const isIC = employeeICSlots.has(t) && state !== 0
        
        shifts.push({
          rosterId,
          staffId,
          timeSlot: t,
          state,
          date: new Date(startDate.getTime() + t * 24 * 60 * 60 * 1000),
          isIC,
        })
      }
    }

    // Atomic transaction: update roster + insert shifts
    await prisma.$transaction([
      prisma.roster.update({
        where: { id: rosterId },
        data: {
          status: 'COMPLETED',
          solverStatus: status,
          solveTimeMs: solve_time_ms,
        },
      }),
      prisma.shift.createMany({
        data: shifts,
      }),
    ])
  }

  /**
   * Validate an existing roster against constraints (FN/BE/ENG/002)
   * @param rosterId Database ID of the roster to validate
   */
  async validateRoster(rosterId: string): Promise<ValidateResponse> {
    // Step 1: Fetch roster with shifts and constraints from database
    const roster = await prisma.roster.findUnique({
      where: { id: rosterId },
      include: {
        shifts: {
          include: { staff: true },
          orderBy: [{ staffId: 'asc' }, { timeSlot: 'asc' }],
        },
        constraints: { where: { isActive: true } },
      },
    })

    if (!roster) {
      throw new Error(`Roster ${rosterId} not found`)
    }

    if (!roster.shifts || roster.shifts.length === 0) {
      throw new Error(`Roster ${rosterId} has no shifts to validate`)
    }

    // Step 2: Rebuild schedule matrix and IC assignments from shifts
    const schedule: Record<string, number[]> = {}
    const icAssignments: Record<string, number[]> = {} // employeeId -> [time_slots with IC]
    const staffMap = new Map<string, string>() // staffId -> employeeId

    for (const shift of roster.shifts) {
      const employeeId = shift.staff.employeeId
      staffMap.set(shift.staffId, employeeId)
      
      if (!schedule[employeeId]) {
        schedule[employeeId] = []
        icAssignments[employeeId] = []
      }
      schedule[employeeId][shift.timeSlot] = shift.state
      
      // Track IC assignments (cast to access isIC field)
      if ((shift as any).isIC) {
        icAssignments[employeeId].push(shift.timeSlot)
      }
    }

    // Step 3: Get staff details for resource_attributes
    const staffIds = Array.from(staffMap.keys())
    const staff = await prisma.staff.findMany({
      where: { id: { in: staffIds } },
      include: {
        staffRoles: { include: { role: true } },
      },
    })

    const resourceAttributes = Object.fromEntries(
      staff.map((s: any) => [
        s.employeeId,
        {
          gender: s.gender,
          roles: s.staffRoles.map((sr: any) => sr.role.name),
        },
      ])
    )

    // Step 4: Build validation request
    const constraintNames = roster.constraints.map((c: any) => c.name || 'Unnamed Constraint')
    
    // Build state mapping based on shift type for summary display
    // DAY_NIGHT: O=Off, 7=Day Shift (0700-1900), E=Night Shift (1900-0700)
    const stateMapping = roster.shiftType === 'DAY_NIGHT'
      ? { 'O': 0, '7': 1, 'E': 2 }
      : { 'O': 0, 'A': 1, 'P': 2, 'N': 3 }
    
    const validateRequest = {
      config: {
        resources: Object.keys(schedule),
        time_slots: roster.timeSlots,
        states: roster.states,
        resource_attributes: resourceAttributes,
      },
      schedule,
      constraint_names: constraintNames,
      ic_assignments: icAssignments,
      state_mapping: stateMapping,
      constraints: roster.constraints.map((c: any) => {
        const config = c.config as Record<string, unknown>
        // Transform DB constraint to solver format (same logic as generateRoster)
        switch (c.type) {
          case ConstraintType.POINT:
            return {
              type: ConstraintType.POINT,
              resource: config.resource as string,
              time_slot: config.time_slot as number,
              state: config.state as number,
            }
          case ConstraintType.VERTICAL_SUM:
            return {
              type: ConstraintType.VERTICAL_SUM,
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            }
          case ConstraintType.HORIZONTAL_SUM:
            return {
              type: ConstraintType.HORIZONTAL_SUM,
              resource: config.resource as string,
              time_slots: config.time_slots as number[],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            }
          case ConstraintType.SLIDING_WINDOW:
            return {
              type: ConstraintType.SLIDING_WINDOW,
              resource: config.resource as string,
              work_days: config.work_days as number,
              rest_days: config.rest_days as number,
              target_state: config.target_state as number,
            }
          case ConstraintType.PATTERN_BLOCK:
            return {
              type: ConstraintType.PATTERN_BLOCK,
              pattern: config.pattern as string[],
              resources: 'ALL',
              state_mapping: config.state_mapping as Record<string, number>,
            }
          case ConstraintType.ATTRIBUTE_VERTICAL_SUM:
            return {
              type: ConstraintType.ATTRIBUTE_VERTICAL_SUM,
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
              attribute: config.attribute as string,
              attribute_values: config.attribute_values as string[],
            }
          case ConstraintType.RESOURCE_STATE_COUNT:
            return {
              type: ConstraintType.RESOURCE_STATE_COUNT,
              resource: config.resource as string,
              time_slots: config.time_slots as number[],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            }
          case ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM:
            return {
              type: ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM,
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
              attribute_filters: config.attribute_filters as Record<string, string[]>,
            }
          default:
            throw new Error(`Unsupported constraint type: ${c.type}`)
        }
      }),
    }

    // Step 5: Call Python validation API
    return this.callValidationApi(validateRequest)
  }

  /**
   * Call Python validation API
   */
  private async callValidationApi(request: unknown): Promise<ValidateResponse> {
    const response = await fetch(`${this.engineUrl}/api/v1/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Validation API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()

    // Validate response
    return ValidateResponseSchema.parse(data)
  }
}
