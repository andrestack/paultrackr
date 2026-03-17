/**
 * Date utility functions for scheduling
 */

/**
 * Format a Date object as DD-MM-YYYY string
 */
export function formatDateISO(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format a Date object as DD-MM string (short format)
 */
export function formatDateShort(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}-${month}`;
}

/**
 * Parse a DD-MM-YYYY string into a Date object
 */
export function parseDateISO(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // 0-indexed
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
  // Fallback to native parsing
  return new Date(dateStr);
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
