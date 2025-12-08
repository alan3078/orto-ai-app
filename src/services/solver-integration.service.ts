import { prisma } from '@/lib/prisma';
import {
  SolverConfigSchema,
  SolverConstraintSchema,
  SolverResponseSchema,
  type SolverResponse,
  type SolverConstraint,
} from '@/lib/validations/solver';
import { ValidateResponseSchema, type ValidateResponse } from '@/lib/validations/validator';
import { ConstraintType, ShiftType } from '@/types/enums';
import type {
  ResourceAttributesMap,
  PreviousMonthAssignment,
  SystemConstraint,
} from '@/types/roster';

/**
 * Staff with roles from database query
 */
interface StaffWithRoles {
  id: string;
  visibleId: string;
  gender?: string | null;
  staffRoles?: Array<{ role: { name: string } }>;
  user?: { name: string; email: string | null };
}

/**
 * Constraint from database
 */
interface DbConstraint {
  id: string;
  name: string;
  type: string;
  config: unknown;
  isRequired?: boolean;
  isActive: boolean;
  shiftType?: string | null;
}

/**
 * Solver Integration Service
 * Orchestrates the complete workflow: DB → Python API → DB
 */
export class SolverIntegrationService {
  private readonly engineUrl: string;

  constructor(engineUrl = process.env.SOLVER_ENGINE_URL || 'http://localhost:8000') {
    this.engineUrl = engineUrl;
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
   * @param shiftType Shift type configuration: APN or SEVEN_E (7E pattern)
   * @param previousMonthAssignments Optional previous month assignments for cross-month constraint enforcement
   */
  async generateRoster(
    rosterName: string,
    startDate: Date,
    timeSlots: number,
    staffIds: string[],
    constraintIds: string[],
    systemConstraints: SystemConstraint[] = [],
    resourceAttributes: ResourceAttributesMap = {},
    shiftType: ShiftType = ShiftType.APN,
    previousMonthAssignments: PreviousMonthAssignment[] = []
  ): Promise<{ rosterId: string; status: string }> {
    // Step 1: Fetch staff and constraints from database
    console.log(`[SolverIntegration] Received ${staffIds.length} staffIds to process`);

    const staff = await prisma.staff.findMany({
      where: { id: { in: staffIds }, isActive: true, deletedAt: null },
      include: {
        staffRoles: { include: { role: true } },
        user: { select: { name: true, email: true } },
      },
    });

    console.log(
      `[SolverIntegration] Found ${staff.length} active staff in DB:`,
      staff.map((s) => ({
        id: s.id,
        visibleId: s.visibleId,
        name: s.user.name,
      }))
    );

    // Fetch constraints filtered by shiftType:
    // - Include constraints matching the specific shiftType (APN or SEVEN_E)
    // - Include GLOBAL constraints (shiftType is null)
    const constraints = await prisma.constraint.findMany({
      where: {
        id: { in: constraintIds },
        isActive: true,
        OR: [
          { shiftType: shiftType }, // Specific to this shift type
          { shiftType: null }, // GLOBAL constraints
        ],
      },
    });

    console.log(
      `[SolverIntegration] Filtered ${constraints.length} constraints for shiftType=${shiftType} (includes GLOBAL)`
    );

    if (staff.length === 0) {
      throw new Error('No active staff found');
    }

    // Step 2: Create Roster record with SOLVING status
    // Determine states based on shift type
    const states = shiftType === ShiftType.APN ? [0, 1, 2, 3] : [0, 1, 2];

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
          connect: constraints.map((c: DbConstraint) => ({ id: c.id })),
        },
      },
    });

    try {
      // Step 3: Transform data for Python API
      const solverRequest = this.buildSolverRequest(
        staff,
        constraints,
        timeSlots,
        systemConstraints,
        resourceAttributes,
        states,
        previousMonthAssignments
      );

      // Step 4: Call Python solver
      const solverResponse = await this.callSolverApi(solverRequest);

      // Step 5: Handle response and save results
      await this.saveSolverResults(
        roster.id,
        staff,
        solverResponse,
        startDate,
        timeSlots,
        shiftType
      );

      return {
        rosterId: roster.id,
        status: solverResponse.status,
      };
    } catch (error) {
      // Update roster with error status
      await prisma.roster.update({
        where: { id: roster.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Build solver request payload from database models
   */
  private buildSolverRequest(
    staff: StaffWithRoles[],
    constraints: DbConstraint[],
    timeSlots: number,
    systemConstraints: SystemConstraint[] = [],
    resourceAttributes: ResourceAttributesMap = {},
    states: number[] = [0, 1, 2],
    previousMonthAssignments: PreviousMonthAssignment[] = []
  ) {
    // Map database constraint config to solver format
    const solverConstraints: SolverConstraint[] = constraints.map((c) => {
      const config = c.config as Record<string, unknown>;
      const is_required = c.isRequired ?? true; // Default to hard constraint
      switch (c.type) {
        case ConstraintType.POINT:
          return {
            type: ConstraintType.POINT,
            resource: config.resource as string,
            time_slot: config.time_slot as number,
            state: config.state as number,
            is_required,
          };
        case ConstraintType.VERTICAL_SUM:
          return {
            type: ConstraintType.VERTICAL_SUM,
            time_slot: config.time_slot as number | 'ALL',
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
            is_required,
          };
        case ConstraintType.HORIZONTAL_SUM:
          return {
            type: ConstraintType.HORIZONTAL_SUM,
            resource: config.resource as string,
            time_slots: (config.time_slots as number[]) || [],
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
            is_required,
          };
        case ConstraintType.SLIDING_WINDOW:
          return {
            type: ConstraintType.SLIDING_WINDOW,
            resource: config.resource as string,
            work_days: config.work_days as number,
            rest_days: config.rest_days as number,
            target_state: config.target_state as number,
            is_required,
          };
        case ConstraintType.ATTRIBUTE_VERTICAL_SUM:
          return {
            type: ConstraintType.ATTRIBUTE_VERTICAL_SUM as any,
            time_slot: config.time_slot as number | 'ALL',
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
            attribute: config.attribute as string,
            attribute_values: config.attribute_values as string[],
            is_required,
          } as any;
        case ConstraintType.RESOURCE_STATE_COUNT:
          return {
            type: ConstraintType.RESOURCE_STATE_COUNT as any,
            resource: config.resource as string,
            time_slots: (config.time_slots as number[]) || [],
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
            is_required,
          } as any;
        case ConstraintType.PATTERN_BLOCK:
          return {
            type: ConstraintType.PATTERN_BLOCK as any,
            pattern: config.pattern as string[],
            resources: 'ALL',
            state_mapping: config.state_mapping as Record<string, number> | undefined,
            is_required,
          } as any;
        case ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM:
          return {
            type: ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM as any,
            time_slot: config.time_slot as number | 'ALL',
            target_state: config.target_state as number,
            operator: config.operator as '>=' | '<=' | '==',
            value: config.value as number,
            attribute_filters: config.attribute_filters as Record<string, string[]>,
            is_required,
          } as any;
        default:
          throw new Error(`Unsupported constraint type: ${c.type}`);
      }
    });

    // Merge system constraints (already in solver format)
    const systemSolverConstraints = systemConstraints
      .map((sc) => {
        const config = sc.config;
        const is_required = sc.isRequired ?? true; // System constraints default to hard
        switch (sc.type) {
          case ConstraintType.POINT:
            return {
              type: ConstraintType.POINT,
              resource: config.resource as string,
              time_slot: config.time_slot as number,
              state: config.state as number,
              is_required,
            };
          case ConstraintType.VERTICAL_SUM:
            return {
              type: ConstraintType.VERTICAL_SUM,
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
              is_required,
            };
          case ConstraintType.HORIZONTAL_SUM:
            return {
              type: ConstraintType.HORIZONTAL_SUM,
              resource: config.resource as string,
              time_slots: (config.time_slots as number[]) || [],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
              is_required,
            };
          case ConstraintType.SLIDING_WINDOW:
            return {
              type: ConstraintType.SLIDING_WINDOW,
              resource: config.resource as string,
              work_days: config.work_days as number,
              rest_days: config.rest_days as number,
              target_state: config.target_state as number,
              is_required,
            };
          case ConstraintType.RESOURCE_STATE_COUNT:
            return {
              type: ConstraintType.RESOURCE_STATE_COUNT,
              resource: config.resource as string,
              time_slots: (config.time_slots as number[]) || [],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
              is_required,
            };
          case ConstraintType.PATTERN_BLOCK:
            return {
              type: ConstraintType.PATTERN_BLOCK,
              pattern: config.pattern as string[],
              resources: 'ALL',
              state_mapping: config.state_mapping as Record<string, number> | undefined,
              is_required,
            };
          case ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM:
            return {
              type: ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM,
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
              attribute_filters: config.attribute_filters as Record<string, string[]>,
              is_required,
            };
          case 'post_block_rest':
            return {
              type: 'post_block_rest',
              resource: config.resource as string,
              target_state: config.target_state as number,
              rest_days: config.rest_days as number,
              is_required,
            };
          case 'min_consecutive':
            return {
              type: 'min_consecutive',
              resource: config.resource as string,
              time_slots: (config.time_slots as number[]) || [],
              target_state: config.target_state as number,
              min_block: config.min_block as number,
              is_required,
            };
          case 'max_consecutive':
            return {
              type: 'max_consecutive',
              resource: config.resource as string,
              time_slots: (config.time_slots as number[]) || [],
              target_state: config.target_state as number,
              max_block: config.max_block as number,
              is_required,
            };
          case 'night_block_gap':
            return {
              type: 'night_block_gap',
              resource: config.resource as string,
              time_slots: (config.time_slots as number[]) || [],
              target_state: config.target_state as number,
              min_gap_days: config.min_gap_days as number,
              is_required,
            };
          default:
            console.warn(
              `[SolverIntegration] Skipping unsupported system constraint type: ${sc.type}`
            );
            return null;
        }
      })
      .filter((c) => c !== null);

    const allConstraints = [...solverConstraints, ...systemSolverConstraints];
    console.log(
      `[SolverIntegration] Merged ${solverConstraints.length} user + ${systemSolverConstraints.length} system constraints`
    );

    const resourceList = staff.map((s) => s.visibleId);
    console.log(
      `[SolverIntegration] Building payload with ${resourceList.length} resources:`,
      resourceList
    );

    const payload = {
      config: {
        resources: resourceList,
        time_slots: timeSlots,
        // Use dynamic states based on shift type (APN or SEVEN_E)
        states,
        resource_attributes: Object.fromEntries(
          staff.map((s) => [
            s.visibleId,
            {
              gender: s.gender,
              roles: (s.staffRoles || []).map((r) => r.role.name),
            },
          ])
        ),
      },
      constraints: allConstraints,
      resource_attributes: undefined as ResourceAttributesMap | undefined,
      previous_month_assignments: undefined as PreviousMonthAssignment[] | undefined,
    };

    // Include resource_attributes if present (FN/ADM/STF/007)
    if (Object.keys(resourceAttributes).length > 0) {
      payload.resource_attributes = resourceAttributes;
      console.log(
        `[SolverIntegration] Including resource_attributes for ${Object.keys(resourceAttributes).length} resources`
      );
    }

    // Include previous month assignments if present (FN/ADM/RST/002)
    if (previousMonthAssignments.length > 0) {
      payload.previous_month_assignments = previousMonthAssignments;
      console.log(
        `[SolverIntegration] Including ${previousMonthAssignments.length} previous month assignments for cross-month constraints`
      );
    }

    // Validate before sending
    // Basic validation for known types; new extended types may be validated server-side
    try {
      SolverConfigSchema.parse({
        resources: payload.config.resources,
        time_slots: payload.config.time_slots,
        states: payload.config.states,
      });
      for (const c of payload.constraints) {
        if (['point', 'vertical_sum', 'horizontal_sum', 'sliding_window'].includes(c.type)) {
          SolverConstraintSchema.parse(c);
        }
      }
    } catch (e) {
      console.warn('[SolverIntegration] Validation warning:', (e as Error).message);
    }

    return payload;
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Solver API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Validate response
    return SolverResponseSchema.parse(data);
  }

  /**
   * Save solver results to database
   */
  private async saveSolverResults(
    rosterId: string,
    staff: StaffWithRoles[],
    solverResponse: SolverResponse,
    startDate: Date,
    timeSlots: number,
    shiftType: ShiftType = ShiftType.APN
  ) {
    const { status, schedule, solve_time_ms, message } = solverResponse;

    // Create visibleId -> staffId map
    const visibleIdToStaffId = new Map(staff.map((s) => [s.visibleId, s.id]));

    // Create visibleId -> hasICRole map for IC assignment
    const visibleIdHasICRole = new Map(
      staff.map((s) => [s.visibleId, (s.staffRoles || []).some((sr) => sr.role.name === 'IC')])
    );

    if (status === 'INFEASIBLE') {
      // No solution found
      await prisma.roster.update({
        where: { id: rosterId },
        data: {
          status: 'INFEASIBLE',
          solverStatus: status,
          errorMessage: message || 'No feasible solution found',
        },
      });
      return;
    }

    if (!schedule) {
      throw new Error('Solver returned success but no schedule data');
    }

    // Debug: Log what the solver returned
    const scheduleVisibleIds = Object.keys(schedule);
    console.log(
      `[SolverIntegration] Solver returned schedule for ${scheduleVisibleIds.length} staff:`,
      scheduleVisibleIds
    );
    console.log(
      `[SolverIntegration] Staff map has ${staff.length} entries:`,
      staff.map((s) => s.visibleId)
    );

    // Determine IC states based on shift type
    // For SEVEN_E: 7=1, E=2; For APN: A=1, P=2, N=3
    const icWorkStates = shiftType === ShiftType.SEVEN_E ? [1, 2] : [1, 2, 3];

    // Build schedule lookup for IC assignment: timeSlot -> state -> list of visibleIds with IC role
    const timeSlotStateICStaff: Map<number, Map<number, string[]>> = new Map();
    for (let t = 0; t < timeSlots; t++) {
      const stateMap = new Map<number, string[]>();
      for (const state of icWorkStates) {
        stateMap.set(state, []);
      }
      timeSlotStateICStaff.set(t, stateMap);
    }

    // Populate IC-eligible staff per time slot per state
    for (const [visibleId, stateArray] of Object.entries(schedule)) {
      const hasICRole = visibleIdHasICRole.get(visibleId);
      if (!hasICRole) continue;

      for (let t = 0; t < timeSlots; t++) {
        const state = stateArray[t];
        if (icWorkStates.includes(state)) {
          timeSlotStateICStaff.get(t)?.get(state)?.push(visibleId);
        }
      }
    }

    // Track IC assignments per staff for round-robin fairness
    const icAssignmentCount = new Map<string, number>();
    for (const visibleId of scheduleVisibleIds) {
      icAssignmentCount.set(visibleId, 0);
    }

    // Assign IC for each time slot and each working state (round-robin among eligible staff)
    const icAssignments = new Map<string, Set<number>>(); // visibleId -> Set of timeSlots with IC
    for (let t = 0; t < timeSlots; t++) {
      for (const state of icWorkStates) {
        const eligibleStaff = timeSlotStateICStaff.get(t)?.get(state) || [];
        if (eligibleStaff.length === 0) continue;

        // Sort by IC assignment count for round-robin fairness
        eligibleStaff.sort(
          (a, b) => (icAssignmentCount.get(a) || 0) - (icAssignmentCount.get(b) || 0)
        );

        // Assign IC to the staff with fewest IC assignments
        const selectedVisibleId = eligibleStaff[0];
        icAssignmentCount.set(
          selectedVisibleId,
          (icAssignmentCount.get(selectedVisibleId) || 0) + 1
        );

        if (!icAssignments.has(selectedVisibleId)) {
          icAssignments.set(selectedVisibleId, new Set());
        }
        icAssignments.get(selectedVisibleId)!.add(t);
      }
    }

    console.log(
      `[SolverIntegration] IC assignments:`,
      Object.fromEntries(
        Array.from(icAssignments.entries()).map(([vis, slots]) => [vis, Array.from(slots)])
      )
    );

    // Transform schedule matrix to Shift records with IC assignments
    const shifts = [];
    for (const [visibleId, stateArray] of Object.entries(schedule)) {
      const staffId = visibleIdToStaffId.get(visibleId);
      if (!staffId) {
        console.warn(`[SolverIntegration] No staffId found for visibleId: ${visibleId}`);
        continue;
      }

      const staffICSlots = icAssignments.get(visibleId) || new Set();

      for (let t = 0; t < timeSlots; t++) {
        const state = stateArray[t];
        // Mark as IC if this staff is assigned IC for this slot AND they are working (not OFF)
        const isIC = staffICSlots.has(t) && state !== 0;

        shifts.push({
          rosterId,
          staffId,
          timeSlot: t,
          state,
          date: new Date(startDate.getTime() + t * 24 * 60 * 60 * 1000),
          isIC,
        });
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
    ]);
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
    });

    if (!roster) {
      throw new Error(`Roster ${rosterId} not found`);
    }

    if (!roster.shifts || roster.shifts.length === 0) {
      throw new Error(`Roster ${rosterId} has no shifts to validate`);
    }

    // Step 2: Rebuild schedule matrix and IC assignments from shifts
    const schedule: Record<string, number[]> = {};
    const icAssignments: Record<string, number[]> = {}; // visibleId -> [time_slots with IC]
    const staffMap = new Map<string, string>(); // staffId -> visibleId

    for (const shift of roster.shifts) {
      const staffWithVisibleId = shift.staff as { visibleId: string };
      const visibleId = staffWithVisibleId.visibleId;
      staffMap.set(shift.staffId, visibleId);

      if (!schedule[visibleId]) {
        schedule[visibleId] = [];
        icAssignments[visibleId] = [];
      }
      schedule[visibleId][shift.timeSlot] = shift.state;

      // Track IC assignments
      if (shift.isIC) {
        icAssignments[visibleId].push(shift.timeSlot);
      }
    }

    // Step 3: Get staff details for resource_attributes
    const staffIds = Array.from(staffMap.keys());
    const staff = await prisma.staff.findMany({
      where: { id: { in: staffIds } },
      include: {
        staffRoles: { include: { role: true } },
      },
    });

    const resourceAttributes = Object.fromEntries(
      staff.map((s) => [
        s.visibleId,
        {
          gender: s.gender,
          roles: s.staffRoles.map((sr) => sr.role.name),
        },
      ])
    );

    // Step 4: Build validation request
    const constraintNames = roster.constraints.map((c) => c.name || 'Unnamed Constraint');

    // Build state mapping based on shift type for summary display
    // SEVEN_E: O=Off, 7=Day Shift (0700-1900), E=Night Shift (1900-0700)
    const stateMapping =
      roster.shiftType === ShiftType.SEVEN_E ? { O: 0, '7': 1, E: 2 } : { O: 0, A: 1, P: 2, N: 3 };

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
      constraints: roster.constraints.map((c) => {
        const config = c.config as Record<string, unknown>;
        // Transform DB constraint to solver format (same logic as generateRoster)
        switch (c.type) {
          case ConstraintType.POINT:
            return {
              type: ConstraintType.POINT,
              resource: config.resource as string,
              time_slot: config.time_slot as number,
              state: config.state as number,
            };
          case ConstraintType.VERTICAL_SUM:
            return {
              type: ConstraintType.VERTICAL_SUM,
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            };
          case ConstraintType.HORIZONTAL_SUM:
            return {
              type: ConstraintType.HORIZONTAL_SUM,
              resource: config.resource as string,
              time_slots: config.time_slots as number[],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            };
          case ConstraintType.SLIDING_WINDOW:
            return {
              type: ConstraintType.SLIDING_WINDOW,
              resource: config.resource as string,
              work_days: config.work_days as number,
              rest_days: config.rest_days as number,
              target_state: config.target_state as number,
            };
          case ConstraintType.PATTERN_BLOCK:
            return {
              type: ConstraintType.PATTERN_BLOCK,
              pattern: config.pattern as string[],
              resources: 'ALL',
              state_mapping: config.state_mapping as Record<string, number>,
            };
          case ConstraintType.ATTRIBUTE_VERTICAL_SUM:
            return {
              type: ConstraintType.ATTRIBUTE_VERTICAL_SUM,
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
              attribute: config.attribute as string,
              attribute_values: config.attribute_values as string[],
            };
          case ConstraintType.RESOURCE_STATE_COUNT:
            return {
              type: ConstraintType.RESOURCE_STATE_COUNT,
              resource: config.resource as string,
              time_slots: config.time_slots as number[],
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
            };
          case ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM:
            return {
              type: ConstraintType.COMPOUND_ATTRIBUTE_VERTICAL_SUM,
              time_slot: config.time_slot as number | 'ALL',
              target_state: config.target_state as number,
              operator: config.operator as '>=' | '<=' | '==',
              value: config.value as number,
              attribute_filters: config.attribute_filters as Record<string, string[]>,
            };
          default:
            throw new Error(`Unsupported constraint type: ${c.type}`);
        }
      }),
    };

    // Step 5: Call Python validation API
    return this.callValidationApi(validateRequest);
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Validation API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Validate response
    return ValidateResponseSchema.parse(data);
  }
}
