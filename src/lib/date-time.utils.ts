/**
 * Date/Time Utilities
 * Centralized date formatting and manipulation functions using date-fns
 */

import {
  format,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  addDays,
  subMonths,
  addMonths,
  parseISO,
  isValid,
} from 'date-fns'

// ============================================================================
// Date Format Constants
// ============================================================================

/** ISO format for API/database: 2025-11 */
export const FORMAT_MONTH_ISO = 'yyyy-MM'

/** Display format for UI: November 2025 */
export const FORMAT_MONTH_DISPLAY = 'MMMM yyyy'

/** Short date format: Nov 28 */
export const FORMAT_DATE_SHORT = 'MMM d'

/** Full date format: November 28, 2025 */
export const FORMAT_DATE_FULL = 'MMMM d, yyyy'

/** ISO date format: 2025-11-28 */
export const FORMAT_DATE_ISO = 'yyyy-MM-dd'

// ============================================================================
// Month Utilities
// ============================================================================

/**
 * Format a date to month ISO string (yyyy-MM)
 */
export function formatMonthISO(date: Date): string {
  return format(date, FORMAT_MONTH_ISO)
}

/**
 * Format a date to display month string (MMMM yyyy)
 */
export function formatMonthDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? parseMonthISO(date) : date
  return format(d, FORMAT_MONTH_DISPLAY)
}

/**
 * Parse a month ISO string (yyyy-MM) to a Date (first day of month)
 */
export function parseMonthISO(monthStr: string): Date {
  return new Date(monthStr + '-01')
}

/**
 * Get the current month in ISO format (yyyy-MM)
 */
export function getCurrentMonthISO(): string {
  return formatMonthISO(new Date())
}

/**
 * Get start of month from a month ISO string
 */
export function getMonthStart(monthStr: string): Date {
  return startOfMonth(parseMonthISO(monthStr))
}

/**
 * Get end of month from a month ISO string
 */
export function getMonthEnd(monthStr: string): Date {
  return endOfMonth(parseMonthISO(monthStr))
}

/**
 * Get number of days in a month from a month ISO string
 */
export function getDaysInMonthFromISO(monthStr: string): number {
  return getDaysInMonth(parseMonthISO(monthStr))
}

/**
 * Generate list of previous months for selectors
 * @param count Number of months to generate (default: 3)
 * @returns Array of { value: 'yyyy-MM', label: 'MMMM yyyy' }
 */
export function getPreviousMonths(count: number = 3): Array<{ value: string; label: string }> {
  return Array.from({ length: count }, (_, i) => {
    const date = subMonths(new Date(), i)
    return {
      value: formatMonthISO(date),
      label: formatMonthDisplay(date),
    }
  })
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Format a date to short display format (MMM d)
 */
export function formatDateShort(date: Date): string {
  return format(date, FORMAT_DATE_SHORT)
}

/**
 * Format a date to full display format (MMMM d, yyyy)
 */
export function formatDateFull(date: Date): string {
  return format(date, FORMAT_DATE_FULL)
}

/**
 * Format a date to ISO format (yyyy-MM-dd)
 */
export function formatDateISO(date: Date): string {
  return format(date, FORMAT_DATE_ISO)
}

/**
 * Add days to a date
 */
export { addDays }

/**
 * Subtract months from a date
 */
export { subMonths }

/**
 * Add months to a date
 */
export { addMonths }

/**
 * Parse ISO date string to Date
 */
export { parseISO }

/**
 * Check if a date is valid
 */
export { isValid }

// ============================================================================
// Roster-Specific Utilities
// ============================================================================

/**
 * Generate roster name from start date
 */
export function generateRosterName(startDate: Date): string {
  return `Roster - ${formatMonthDisplay(startDate)}`
}

/**
 * Get time slot dates for a roster period
 * @param startDate Start date of the roster
 * @param timeSlots Number of time slots (days)
 * @returns Array of dates for each time slot
 */
export function getTimeSlotDates(startDate: Date, timeSlots: number): Date[] {
  return Array.from({ length: timeSlots }, (_, i) => addDays(startDate, i))
}
