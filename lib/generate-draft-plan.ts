/**
 * Draft plan generation algorithm
 * Groups jobs into zones and assigns them to days over a 4-week period
 */

import { Job, PlannedJob, Plan } from './types';
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
  const dayJobs = new Map<string, Job[]>();
  workingDays.forEach(day => {
    const dateStr = formatDateISO(day);
    dayJobCounts.set(dateStr, 0);
    dayJobs.set(dateStr, []);
  });

  // Assign jobs to days
  // Strategy: Fill each day greedily, prioritizing keeping zone jobs together
  // but splitting large zones if needed
  
  // First, sort all jobs by zone key to keep them somewhat together
  const allJobsWithZoneKey = jobs.map(job => ({
    job,
    zoneKey: job.addressPostcode || job.addressCity || 'UNKNOWN'
  }));
  
  // Group by zone
  const jobsByZone = new Map<string, Job[]>();
  for (const { job, zoneKey } of allJobsWithZoneKey) {
    if (!jobsByZone.has(zoneKey)) {
      jobsByZone.set(zoneKey, []);
    }
    jobsByZone.get(zoneKey)!.push(job);
  }
  
  // For each zone, try to place all jobs on the same day
  // If zone is too big, split across days
  for (const [zoneKey, zoneJobs] of jobsByZone) {
    let remainingJobs = [...zoneJobs];
    
    while (remainingJobs.length > 0) {
      // Find the day with the most space
      let bestDay: Date | null = null;
      let bestRemainingCapacity = 0;

      for (const day of workingDays) {
        const dateStr = formatDateISO(day);
        const currentCount = dayJobCounts.get(dateStr) || 0;
        const remainingCapacity = maxJobsPerDay - currentCount;

        if (remainingCapacity > bestRemainingCapacity) {
          bestDay = day;
          bestRemainingCapacity = remainingCapacity;
        }
      }

      if (bestDay === null || bestRemainingCapacity === 0) {
        // No more capacity, mark remaining as unplanned
        unplannedJobs.push(...remainingJobs);
        break;
      }

      // Take as many jobs as will fit
      const jobsToPlace = remainingJobs.slice(0, bestRemainingCapacity);
      remainingJobs = remainingJobs.slice(bestRemainingCapacity);
      
      // Assign to best day
      const assignedDateStr = formatDateISO(bestDay);
      const currentCount = dayJobCounts.get(assignedDateStr) || 0;
      dayJobCounts.set(assignedDateStr, currentCount + jobsToPlace.length);
      
      const currentJobs = dayJobs.get(assignedDateStr) || [];
      dayJobs.set(assignedDateStr, [...currentJobs, ...jobsToPlace]);
    }
  }

  // Create planned jobs from day assignments
  for (const day of workingDays) {
    const dateStr = formatDateISO(day);
    const jobsForDay = dayJobs.get(dateStr) || [];
    const weekIndex = Math.floor(workingDays.indexOf(day) / 5);
    const dayOfWeek = day.getDay();

    for (const job of jobsForDay) {
      // Determine if this job should appear in this 4-week window
      const interval = parseFrequency(job.pattern, job.frequency);
      const flags: string[] = [];

      if (interval === null) {
        flags.push('needs-review');
      }

      plannedJobs.push({
        ...job,
        plannedDate: dateStr,
        plannedWeekIndex: weekIndex,
        plannedDayIndex: dayOfWeek,
        plannedTechnicianName: job.technicianName || null,
        flags,
      });
    }
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
