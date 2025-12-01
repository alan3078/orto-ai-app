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
  if (!isValid(d)) {
    return 'Invalid Date'
  }
  return format(d, FORMAT_MONTH_DISPLAY)
}

/**
 * Parse a month ISO string (yyyy-MM) to a Date (first day of month)
 * Returns current month if the string is invalid
 * 
 * IMPORTANT: Creates date in LOCAL timezone to avoid day shift issues.
 * When using new Date('2025-11-01'), JS interprets it as UTC midnight,
 * which can shift to previous day in timezones ahead of UTC.
 */
export function parseMonthISO(monthStr: string): Date {
  // Guard against undefined, null, or invalid strings
  if (!monthStr || typeof monthStr !== 'string' || !/^\d{4}-\d{2}$/.test(monthStr)) {
    console.warn(`parseMonthISO: Invalid month string "${monthStr}", using current month`)
    return startOfMonth(new Date())
  }
  
  // Parse year and month manually to create date in LOCAL timezone
  const [year, month] = monthStr.split('-').map(Number)
  const parsed = new Date(year, month - 1, 1) // month is 0-indexed
  
  if (!isValid(parsed)) {
    console.warn(`parseMonthISO: Failed to parse "${monthStr}", using current month`)
    return startOfMonth(new Date())
  }
  return parsed
}

/**
 * Get the current month in ISO format (yyyy-MM)
 */
export function getCurrentMonthISO(): string {
  return formatMonthISO(new Date())
}

/**
 * Get start of month from a month ISO string
 * Returns first day of month at midnight in LOCAL timezone
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
 * Generate list of months for roster selector
 * Includes 1 month ahead and previous months up to count total
 * @param count Number of months to generate (default: 4, including next month)
 * @returns Array of { value: 'yyyy-MM', label: 'MMMM yyyy' } sorted chronologically (oldest first)
 */
export function getPreviousMonths(count: number = 4): Array<{ value: string; label: string }> {
  const now = new Date()
  const months: Array<{ value: string; label: string }> = []
  
  // Include 1 month ahead
  const nextMonth = addMonths(now, 1)
  months.push({
    value: formatMonthISO(nextMonth),
    label: formatMonthDisplay(nextMonth),
  })
  
  // Current month and previous months
  for (let i = 0; i < count - 1; i++) {
    const date = subMonths(now, i)
    months.push({
      value: formatMonthISO(date),
      label: formatMonthDisplay(date),
    })
  }
  
  // Sort chronologically (oldest first for natural reading)
  return months.sort((a, b) => a.value.localeCompare(b.value))
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

/**
 * Create a date at noon (12:00) in LOCAL timezone to avoid UTC conversion issues.
 * When a date is stored/transmitted as ISO string, midnight dates can shift
 * back a day in timezones ahead of UTC. Using noon provides a safe buffer.
 * 
 * @param year Full year (e.g., 2025)
 * @param month Month (1-12, NOT 0-indexed)
 * @param day Day of month (1-31)
 * @returns Date object at noon in local timezone
 */
export function createNoonDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

/**
 * Get start of month at noon (12:00) from a month ISO string.
 * This avoids timezone shift issues when dates cross UTC midnight boundary.
 * 
 * @param monthStr Month string in format "yyyy-MM"
 * @returns Date at noon on the first day of the month
 */
export function getMonthStartNoon(monthStr: string): Date {
  const date = parseMonthISO(monthStr)
  // Set to noon to avoid timezone issues
  date.setHours(12, 0, 0, 0)
  return date
}
