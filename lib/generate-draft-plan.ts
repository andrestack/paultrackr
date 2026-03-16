/**
 * Draft plan generation algorithm
 * Groups jobs into zones and assigns them to days over a 4-week period
 */

import { Job, PlannedJob, Plan, Zone } from './types';
import { clusterJobsByZone } from './zone-clustering';
import { formatDateISO, getWeekDates, addDays, parseDateISO } from './date-utils';

interface GeneratePlanOptions {
  jobs: Job[];
  startDate: string; // YYYY-MM-DD
  weeks?: number;
  maxJobsPerDay?: number;
}

/**
 * Parse frequency to determine how often a job should occur
 * Returns interval in weeks, or null if unknown
 */
function parseFrequency(pattern: string, frequency: string): number | null {
  const patternLower = pattern.toLowerCase().trim();
  const freqNum = parseInt(frequency);

  // If pattern is empty or unknown, and no frequency, needs review
  if (!patternLower) {
    return null;
  }

  if (patternLower.includes('weekly')) {
    return freqNum || 1;
  }
  if (patternLower.includes('fortnight')) {
    return (freqNum || 1) * 2;
  }
  if (patternLower.includes('month')) {
    return (freqNum || 1) * 4; // Approximate
  }
  if (patternLower.includes('daily')) {
    return null; // Too frequent, flag as needs review
  }

  // Pattern is set but doesn't match known patterns - needs review
  return null;
}

/**
 * Generate a draft plan for scheduling jobs
 * Strategy: Group by zone, then distribute zones across days while keeping jobs together
 */
export function generateDraftPlan(options: GeneratePlanOptions): Plan {
  const { jobs, startDate, weeks = 4, maxJobsPerDay = 20 } = options;

  // Calculate end date
  const start = parseDateISO(startDate);
  const end = addDays(start, weeks * 7 - 1);
  const endDate = formatDateISO(end);

  // Cluster jobs by zone
  const zones = clusterJobsByZone(jobs);

  const plannedJobs: PlannedJob[] = [];
  const unplannedJobs: Job[] = [];

  // Get all working days (Mon-Fri) for the planning period
  const workingDays: Date[] = [];
  for (let week = 0; week < weeks; week++) {
    const weekMonday = addDays(start, week * 7);
    const weekDates = getWeekDates(weekMonday);
    // Only Mon-Fri (indices 1-5)
    workingDays.push(...weekDates.slice(1, 6));
  }

  // Track how many jobs are assigned to each day
  const dayJobCounts = new Map<string, number>();
  workingDays.forEach(day => {
    dayJobCounts.set(formatDateISO(day), 0);
  });

  // Find the best day for each zone
  // Strategy: Try to place each zone on the same day, respecting daily limits
  let dayIndex = 0;

  for (const zone of zones) {
    if (zone.jobs.length === 0) continue;

    // Check if we can fit this zone on the current day
    let assignedDay: Date | null = null;
    let attempts = 0;
    const maxAttempts = workingDays.length;

    while (attempts < maxAttempts && assignedDay === null) {
      const candidateDay = workingDays[dayIndex % workingDays.length];
      const candidateDateStr = formatDateISO(candidateDay);
      const currentCount = dayJobCounts.get(candidateDateStr) || 0;

      if (currentCount + zone.jobs.length <= maxJobsPerDay) {
        assignedDay = candidateDay;
        dayJobCounts.set(candidateDateStr, currentCount + zone.jobs.length);
      } else {
        // Try next day
        dayIndex++;
        attempts++;
      }
    }

    if (assignedDay === null) {
      // Couldn't find a day with enough capacity
      unplannedJobs.push(...zone.jobs);
      continue;
    }

    // Assign all jobs in the zone to this day
    const assignedDateStr = formatDateISO(assignedDay);
    const weekIndex = Math.floor(dayIndex / 5); // 5 working days per week
    const dayOfWeek = assignedDay.getDay();

    for (const job of zone.jobs) {
      // Determine if this job should appear in this 4-week window
      const interval = parseFrequency(job.pattern, job.frequency);
      const flags: string[] = [];

      if (interval === null) {
        flags.push('needs-review');
      }

      // If job has a next date, check if it falls in our window
      if (job.nextDateParsed) {
        const nextDateStr = formatDateISO(job.nextDateParsed);
        const jobInWindow = nextDateStr >= startDate && nextDateStr <= endDate;

        if (jobInWindow) {
          // Use the job's actual next date
          plannedJobs.push({
            ...job,
            plannedDate: nextDateStr,
            plannedWeekIndex: Math.floor((parseDateISO(nextDateStr).getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)),
            plannedDayIndex: parseDateISO(nextDateStr).getDay(),
            plannedTechnicianName: job.technicianName || null,
            flags,
          });
        } else {
          // Schedule it based on zone clustering
          plannedJobs.push({
            ...job,
            plannedDate: assignedDateStr,
            plannedWeekIndex: weekIndex,
            plannedDayIndex: dayOfWeek,
            plannedTechnicianName: job.technicianName || null,
            flags: [...flags, 'rescheduled'],
          });
        }
      } else {
        // No next date, schedule based on zone clustering
        plannedJobs.push({
          ...job,
          plannedDate: assignedDateStr,
          plannedWeekIndex: weekIndex,
          plannedDayIndex: dayOfWeek,
          plannedTechnicianName: job.technicianName || null,
          flags,
        });
      }
    }

    dayIndex++;
  }

  return {
    startDate,
    endDate,
    weeks,
    plannedJobs,
    unplannedJobs,
  };
}

/**
 * Move a job to a different date in the plan
 * Returns a new plan with the updated job
 */
export function moveJobInPlan(
  plan: Plan,
  jobId: string,
  newDate: string
): Plan {
  const jobIndex = plan.plannedJobs.findIndex(j => j.id === jobId);

  if (jobIndex === -1) {
    // Check if it's in unplanned jobs
    const unplannedIndex = plan.unplannedJobs.findIndex(j => j.id === jobId);
    if (unplannedIndex === -1) {
      return plan; // Job not found
    }

    // Move from unplanned to planned
    const job = plan.unplannedJobs[unplannedIndex];
    const newPlannedJob: PlannedJob = {
      ...job,
      plannedDate: newDate,
      plannedWeekIndex: 0, // Will be calculated
      plannedDayIndex: parseDateISO(newDate).getDay(),
      plannedTechnicianName: job.technicianName || null,
      flags: ['manually-added'],
    };

    return {
      ...plan,
      plannedJobs: [...plan.plannedJobs, newPlannedJob],
      unplannedJobs: plan.unplannedJobs.filter((_, i) => i !== unplannedIndex),
    };
  }

  // Update existing planned job
  const job = plan.plannedJobs[jobIndex];
  const startDate = parseDateISO(plan.startDate);
  const newDateObj = parseDateISO(newDate);

  const updatedJob: PlannedJob = {
    ...job,
    plannedDate: newDate,
    plannedWeekIndex: Math.floor((newDateObj.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)),
    plannedDayIndex: newDateObj.getDay(),
    flags: [...job.flags.filter(f => f !== 'rescheduled'), 'manually-moved'],
  };

  const newPlannedJobs = [...plan.plannedJobs];
  newPlannedJobs[jobIndex] = updatedJob;

  return {
    ...plan,
    plannedJobs: newPlannedJobs,
  };
}
