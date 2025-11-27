/**
 * Color palette for roster grid placeholders and states
 */
export const ROSTER_GRID_COLORS = {
  /**
   * Light green
   */
  LIGHT_GREEN: '#e2efda',
  
  /**
   * Deep yellow
   */
  DEEP_YELLOW: '#fbc000',
} as const;

export type RosterGridColor = typeof ROSTER_GRID_COLORS[keyof typeof ROSTER_GRID_COLORS];
