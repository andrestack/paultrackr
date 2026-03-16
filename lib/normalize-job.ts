/**
 * Normalize a raw CSV job row into a clean Job object
 * Handles trimming, postcode normalization, and date parsing
 */

import { Job, JobRaw } from './types';

/**
 * Parse a date string conservatively
 * Returns Date object if valid, null otherwise
 * Supports common formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const trimmed = dateStr.trim();
  if (!trimmed) {
    return null;
  }

  // Try parsing as ISO format first (YYYY-MM-DD)
  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) {
    const date = new Date(trimmed + 'T00:00:00');
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    // Assume DD/MM/YYYY (common in Australia/PoolTrackr)
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Fallback to native Date parsing (handles more formats)
  const fallbackDate = new Date(trimmed);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  return null;
}

/**
 * Normalize a raw job row from CSV into a clean Job object
 */
export function normalizeJob(raw: JobRaw): Job {
  const trimmedPostcode = (raw['Address Postcode'] || '').trim();
  
  // Normalize postcode: keep as string (handles leading zeros)
  // Remove any non-numeric characters except letters (for UK postcodes, etc.)
  const normalizedPostcode = trimmedPostcode.toUpperCase();

  const nextDateRaw = (raw['Next Date'] || '').trim();
  const nextDateParsed = parseDate(nextDateRaw);

  return {
    id: (raw.ID || '').trim(),
    contactName: (raw['Contact Name'] || '').trim(),
    addressStreetOne: (raw['Address Street One'] || '').trim(),
    addressCity: (raw['Address City'] || '').trim(),
    addressState: (raw['Address State'] || '').trim(),
    addressPostcode: normalizedPostcode,
    technicianName: (raw['Technician Name'] || '').trim(),
    jobTemplateName: (raw['Job Template Name'] || '').trim(),
    startTime: (raw['Start Time'] || '').trim(),
    endTime: (raw['End Time'] || '').trim(),
    nextDateRaw,
    nextDateParsed,
    pattern: (raw.Pattern || '').trim(),
    frequency: (raw.Frequency || '').trim(),
    notes: (raw.Notes || '').trim(),
    raw, // Keep original for round-trip export
  };
}

/**
 * Validate that a job has the minimum required fields
 */
export function validateJob(job: Job): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!job.id) {
    errors.push('Missing ID');
  }

  if (!job.contactName) {
    errors.push('Missing Contact Name');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
