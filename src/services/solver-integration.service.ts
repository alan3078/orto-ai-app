import { prisma } from '@/lib/prisma'
import {
  SolverConfigSchema,
  SolverConstraintSchema,
  SolverResponseSchema,
  type SolverResponse,
  type SolverConstraint,
} from '@/lib/validations/solver'
import { ValidateResponseSchema, type ValidateResponse } from '@/lib/validations/validator'

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
    const staff = await prisma.staff.findMany({
      where: { id: { in: staffIds }, isActive: true },
      include: { staffRoles: { include: { role: true } } },
    })

    const constraints = await prisma.constraint.findMany({
      where: { id: { in: constraintIds }, isActive: true },
    })

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
      await this.saveSolverResults(roster.id, staff, solverResponse, startDate, timeSlots)

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
        case 'point':
          return {
            type: 'point',
            resource: config.resource as string,
            time_slot: config.time_slot as number,
            state: config.state as number,
          }
        case 'vertical_sum':
          return {
            type: 'vertical_sum',
            time_slot: config.time_slot as number | 'ALL',
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
          }
        case 'horizontal_sum':
          return {
            type: 'horizontal_sum',
            resource: config.resource as string,
            time_slots: (config.time_slots as number[]) || [],
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
          }
        case 'sliding_window':
          return {
            type: 'sliding_window',
            resource: config.resource as string,
            work_days: config.work_days as number,
            rest_days: config.rest_days as number,
            target_state: config.target_state as number,
          }
        case 'attribute_vertical_sum':
          return {
            type: 'attribute_vertical_sum' as any,
            time_slot: config.time_slot as number | 'ALL',
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
            attribute: config.attribute as string,
            attribute_values: config.attribute_values as string[],
          } as any
        case 'resource_state_count':
          return {
            type: 'resource_state_count' as any,
            resource: config.resource as string,
            time_slots: (config.time_slots as number[]) || [],
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
          } as any
        case 'pattern_block':
          return {
            type: 'pattern_block' as any,
            pattern: config.pattern as string[],
            resources: 'ALL',
            state_mapping: config.state_mapping as Record<string, number> | undefined,
          } as any
        default:
          throw new Error(`Unsupported constraint type: ${c.type}`)
      }
    })

    // Merge system constraints (already in solver format)
    const systemSolverConstraints = systemConstraints
      .filter(sc => sc.type !== 'pattern_block') // Filter out custom types not yet supported
      .map((sc) => {
        const config = sc.config
        switch (sc.type) {
          case 'point':
            return {
              type: 'point',
              resource: config.resource as string,
              time_slot: config.time_slot as number,
              state: config.state as number,
            }
          case 'vertical_sum':
            return {
              type: 'vertical_sum',
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            }
          case 'horizontal_sum':
            return {
              type: 'horizontal_sum',
              resource: config.resource as string,
              time_slots: (config.time_slots as number[]) || [],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            }
          case 'sliding_window':
            return {
              type: 'sliding_window',
              resource: config.resource as string,
              work_days: config.work_days as number,
              rest_days: config.rest_days as number,
              target_state: config.target_state as number,
            }
          default:
            console.warn(`[SolverIntegration] Skipping unsupported system constraint type: ${sc.type}`)
            return null
        }
      })
      .filter((c) => c !== null)

    const allConstraints = [...solverConstraints, ...systemSolverConstraints]
    console.log(`[SolverIntegration] Merged ${solverConstraints.length} user + ${systemSolverConstraints.length} system constraints`)

    const payload: any = {
      config: {
        resources: staff.map((s) => s.employeeId),
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
    staff: Array<{ id: string; employeeId: string }>,
    solverResponse: SolverResponse,
    startDate: Date,
    timeSlots: number
  ) {
    const { status, schedule, solve_time_ms, message } = solverResponse

    // Create employeeId -> staffId map
    const employeeIdToStaffId = new Map(staff.map((s) => [s.employeeId, s.id]))

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

    // Transform schedule matrix to Shift records
    const shifts = []
    for (const [employeeId, stateArray] of Object.entries(schedule)) {
      const staffId = employeeIdToStaffId.get(employeeId)
      if (!staffId) continue

      for (let t = 0; t < timeSlots; t++) {
        shifts.push({
          rosterId,
          staffId,
          timeSlot: t,
          state: stateArray[t],
          date: new Date(startDate.getTime() + t * 24 * 60 * 60 * 1000),
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

    // Step 2: Rebuild schedule matrix from shifts
    const schedule: Record<string, number[]> = {}
    const staffMap = new Map<string, string>() // staffId -> employeeId

    for (const shift of roster.shifts) {
      const employeeId = shift.staff.employeeId
      staffMap.set(shift.staffId, employeeId)
      
      if (!schedule[employeeId]) {
        schedule[employeeId] = []
      }
      schedule[employeeId][shift.timeSlot] = shift.state
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
    
    const validateRequest = {
      config: {
        resources: Object.keys(schedule),
        time_slots: roster.timeSlots,
        states: roster.states,
        resource_attributes: resourceAttributes,
      },
      schedule,
      constraint_names: constraintNames,
      constraints: roster.constraints.map((c: any) => {
        const config = c.config as Record<string, unknown>
        // Transform DB constraint to solver format (same logic as generateRoster)
        switch (c.type) {
          case 'point':
            return {
              type: 'point',
              resource: config.resource as string,
              time_slot: config.time_slot as number,
              state: config.state as number,
            }
          case 'vertical_sum':
            return {
              type: 'vertical_sum',
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            }
          case 'horizontal_sum':
            return {
              type: 'horizontal_sum',
              resource: config.resource as string,
              time_slots: config.time_slots as number[],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            }
          case 'sliding_window':
            return {
              type: 'sliding_window',
              resource: config.resource as string,
              work_days: config.work_days as number,
              rest_days: config.rest_days as number,
              target_state: config.target_state as number,
            }
          case 'pattern_block':
            return {
              type: 'pattern_block',
              pattern: config.pattern as string[],
              resources: 'ALL',
              state_mapping: config.state_mapping as Record<string, number>,
            }
          case 'attribute_vertical_sum':
            return {
              type: 'attribute_vertical_sum',
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
              attribute: config.attribute as string,
              attribute_values: config.attribute_values as string[],
            }
          case 'resource_state_count':
            return {
              type: 'resource_state_count',
              resource: config.resource as string,
              time_slots: config.time_slots as number[],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
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
