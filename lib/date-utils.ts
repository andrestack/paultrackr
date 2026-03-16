/**
 * Date utility functions for scheduling
 */

/**
 * Format a Date object as YYYY-MM-DD string
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse a YYYY-MM-DD string into a Date object
 */
export function parseDateISO(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Get the Monday of the week for a given date
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get the next Monday from today
 */
export function getNextMonday(): Date {
  const today = new Date();
  const day = today.getDay();
  // If today is Monday (1), get next Monday
  // Otherwise, get the upcoming Monday
  const daysUntilMonday = (8 - day) % 7 || 7;
  return new Date(today.setDate(today.getDate() + daysUntilMonday));
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get an array of dates for a week (Monday to Sunday)
 */
export function getWeekDates(monday: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(monday, i));
  }
  return dates;
}

/**
 * Check if a date falls within a range (inclusive)
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

/**
 * Get day name from day index (0 = Sunday, 1 = Monday, etc.)
 */
export function getDayName(dayIndex: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex];
}

/**
 * Get full day name
 */
export function getFullDayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
}
