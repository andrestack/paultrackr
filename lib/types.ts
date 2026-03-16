/**
 * Type definitions for PoolTrackr Route Optimizer
 * Based on PoolTrackr CSV export format
 */

// Raw job as parsed from CSV
export interface JobRaw {
  ID: string;
  'Contact Name': string;
  'Address Street One': string;
  'Address City': string;
  'Address State': string;
  'Address Postcode': string;
  'Technician Name': string;
  'Job Template Name': string;
  'Start Time': string;
  'End Time': string;
  'Next Date': string;
  'Pattern': string;
  'Frequency': string;
  'Notes': string;
  [key: string]: string; // Allow additional columns
}

// Normalized job used throughout the app
export interface Job {
  id: string;
  contactName: string;
  addressStreetOne: string;
  addressCity: string;
  addressState: string;
  addressPostcode: string;
  technicianName: string;
  jobTemplateName: string;
  startTime: string;
  endTime: string;
  nextDateRaw: string;
  nextDateParsed: Date | null;
  pattern: string;
  frequency: string;
  notes: string;
  raw: JobRaw; // Keep original for round-trip export
}

// Zone definition for geographic clustering
export interface Zone {
  key: string;
  postcode: string;
  city: string;
  streetsSample: string[];
  count: number;
  jobs: Job[];
}

// Planned job extends Job with scheduling information
export interface PlannedJob extends Job {
  plannedDate: string; // YYYY-MM-DD format
  plannedWeekIndex: number;
  plannedDayIndex: number;
  plannedTechnicianName: string | null;
  flags: string[];
}

// Plan structure
export interface Plan {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  weeks: number;
  plannedJobs: PlannedJob[];
  unplannedJobs: Job[];
}

// Plan state for UI updates
export interface PlanState {
  plan: Plan;
  lastModified: Date;
}
