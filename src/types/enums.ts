// Centralized application enums and constants
// Prefer importing schema enums from @prisma/client when available

// Prisma schema provides Gender enum; import and re-export in modules that need it instead.

// Staff rank values used in UI and logic; DB column is string.
export enum StaffRank {
  SNO = 'SNO',
  SRN = 'SRN',
  RN = 'RN',
  RN_CW = 'RN-CW',
}

// Logical role names used by the app
export enum RoleName {
  IC = 'IC',
  NonIC = 'Non-IC',
}

/**
 * Shift type patterns supported by the scheduler
 * Note: This mirrors the Prisma ShiftType enum but is available without Prisma client
 */
export enum ShiftType {
  /** Afternoon, PM, Night pattern (0=Off, 1=A, 2=P, 3=N) - 8.5h shifts */
  APN = 'APN',
  /** 7E pattern: Day (7) and Night (E) 12h shifts (0=Off, 1=7, 2=E) */
  SEVEN_E = 'SEVEN_E',
}

/**
 * Constraint types supported by the solver engine
 * Used for roster generation and validation
 */
export enum ConstraintType {
  /** Force resource X at time Y to state Z */
  POINT = 'point',
  /** Count resources in target state per time slot */
  VERTICAL_SUM = 'vertical_sum',
  /** Count consecutive state occurrences for a resource */
  HORIZONTAL_SUM = 'horizontal_sum',
  /** Work-rest pattern enforcement (e.g., 5-on-2-off) */
  SLIDING_WINDOW = 'sliding_window',
  /** Block specific state transitions (e.g., Night→Day) */
  PATTERN_BLOCK = 'pattern_block',
  /** Filtered vertical sum by single attribute (e.g., gender=F) */
  ATTRIBUTE_VERTICAL_SUM = 'attribute_vertical_sum',
  /** Total state count for a resource across time slots */
  RESOURCE_STATE_COUNT = 'resource_state_count',
  /** Filtered vertical sum by multiple attributes with AND logic (e.g., gender=F AND role=IC) */
  COMPOUND_ATTRIBUTE_VERTICAL_SUM = 'compound_attribute_vertical_sum',
  /** Minimum consecutive occurrences of a state (no isolated singles) */
  MIN_CONSECUTIVE = 'min_consecutive',
  /** Minimum gap between night shift blocks (e.g., 7 days between blocks) */
  NIGHT_BLOCK_GAP = 'night_block_gap',
  /** Dynamic post-block rest: enforce rest days after any block ends */
  POST_BLOCK_REST = 'post_block_rest',
}

/**
 * Solver response status
 */
export enum SolverStatus {
  OPTIMAL = 'OPTIMAL',
  FEASIBLE = 'FEASIBLE',
  INFEASIBLE = 'INFEASIBLE',
  ERROR = 'ERROR',
}

/**
 * Validation result status
 */
export enum ValidationStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
}

/**
 * Comparison operators for constraints
 */
export enum ComparisonOperator {
  GTE = '>=',
  LTE = '<=',
  EQ = '==',
}
