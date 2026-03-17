/**
 * CSV Export functions for PoolTrackr Route Optimizer
 * Mode A: Plan CSV with planned dates
 * Mode B: PoolTrackr-compatible CSV with updated Next Date
 */

import { PlannedJob, Job, Plan } from './types';

/**
 * Format date as DD/MM/YYYY for PoolTrackr compatibility
 */
function formatDateForPoolTrackr(dateStr: string): string {
  // Convert DD-MM-YYYY to DD/MM/YYYY
  return dateStr.replace(/-/g, '/');
}

/**
 * Convert array to CSV row string
 */
function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map(value => {
      const str = String(value ?? '');
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(',');
}

/**
 * Mode A: Export Plan CSV
 * Columns: ID, Planned Date, Technician, Zone Key, Notes/Flags
 */
export function exportPlanCsv(plan: Plan): string {
  const headers = ['ID', 'Planned Date', 'Technician', 'Zone Key', 'Notes/Flags'];
  const rows: string[] = [toCsvRow(headers)];

  // Export planned jobs
  for (const job of plan.plannedJobs) {
    const flags = job.flags.join('; ');
    rows.push(
      toCsvRow([
        job.id,
        job.plannedDate,
        job.plannedTechnicianName || job.technicianName || '',
        job.addressPostcode || job.addressCity || 'UNKNOWN',
        flags,
      ])
    );
  }

  // Export unplanned jobs with flag
  for (const job of plan.unplannedJobs) {
    rows.push(
      toCsvRow([
        job.id,
        '',
        job.technicianName || '',
        job.addressPostcode || job.addressCity || 'UNKNOWN',
        'unplanned',
      ])
    );
  }

  return rows.join('\n');
}

/**
 * Mode B: Export PoolTrackr-compatible CSV
 * Preserves original columns, updates Next Date and Technician
 */
export function exportPoolTrackrCsv(
  originalJobs: Job[],
  plan: Plan
): string {
  if (originalJobs.length === 0) {
    return '';
  }

  // Create a map of job ID to planned info
  const plannedJobsMap = new Map<string, PlannedJob>();
  for (const job of plan.plannedJobs) {
    plannedJobsMap.set(job.id, job);
  }

  // Get original headers from first job
  const firstJob = originalJobs[0];
  const headers = Object.keys(firstJob.raw);
  const rows: string[] = [toCsvRow(headers)];

  // Update each row with planned date
  for (const job of originalJobs) {
    const plannedJob = plannedJobsMap.get(job.id);
    const updatedRow = { ...job.raw };

    if (plannedJob) {
      // Update Next Date with planned date (in PoolTrackr format DD/MM/YYYY)
      updatedRow['Next Date'] = formatDateForPoolTrackr(plannedJob.plannedDate);
      
      // Update Technician if manually assigned
      if (plannedJob.plannedTechnicianName) {
        updatedRow['Technician Name'] = plannedJob.plannedTechnicianName;
      }
    }

    // Convert row object to array in header order
    const rowValues = headers.map(header => updatedRow[header]);
    rows.push(toCsvRow(rowValues));
  }

  return rows.join('\n');
}

/**
 * Trigger CSV download in browser
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
