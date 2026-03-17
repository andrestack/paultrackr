/**
 * Draft plan generation algorithm - SIMPLE VERSION
 * One zone per week, distributed Mon-Fri
 */

import { Job, PlannedJob, Plan } from './types';
import { clusterJobsByZone } from './zone-clustering';
import { formatDateISO, getWeekDates, addDays } from './date-utils';

interface GeneratePlanOptions {
  jobs: Job[];
  startDate: string; // DD-MM-YYYY
  weeks?: number;
  maxJobsPerDay?: number;
}

/**
 * Parse frequency - simplified for MVP
 */
function parseFrequency(pattern: string, frequency: string): number | null {
  const p = pattern.toLowerCase().trim();
  const f = frequency.toLowerCase().trim();
  
  if (f === 'weekly' || p.includes('weekly')) return 1;
  if (f === 'fortnightly' || p.includes('fortnight')) return 2;
  if (f === 'monthly' || p.includes('month')) return 4;
  
  // Check for "every X weeks"
  const match = p.match(/every\s+(\d+)\s*weeks?/);
  if (match) return parseInt(match[1]);
  
  return null; // Unknown - will flag for review
}

/**
 * Generate plan - SIMPLE ZONE-PER-WEEK
 * Week 1: Zone #1, Week 2: Zone #2, etc.
 */
export function generateDraftPlan(options: GeneratePlanOptions): Plan {
  const { jobs, startDate, weeks = 4, maxJobsPerDay = 20 } = options;

  // Parse DD-MM-YYYY
  const [d, m, y] = startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = addDays(start, weeks * 7 - 1);
  const endDate = formatDateISO(end);

  // Get zones sorted by size (largest first)
  const zones = clusterJobsByZone(jobs);
  const sortedZones = [...zones].sort((a, b) => b.count - a.count);

  const plannedJobs: PlannedJob[] = [];
  const unplannedJobs: Job[] = [];

  // Get all 20 working days
  const workingDays: Date[] = [];
  for (let w = 0; w < weeks; w++) {
    const monday = addDays(start, w * 7);
    const weekDates = getWeekDates(monday);
    workingDays.push(...weekDates.slice(0, 5)); // Mon-Fri (indices 0-4)
  }

  // Track daily job counts
  const dayJobCounts = new Map<string, number>();
  workingDays.forEach(day => {
    dayJobCounts.set(formatDateISO(day), 0);
  });

  // Assign primary zones to weeks first (one zone per week)
  const primaryZoneAssignments: Map<number, string> = new Map(); // weekIndex -> zoneKey
  sortedZones.slice(0, weeks).forEach((zone, index) => {
    primaryZoneAssignments.set(index, zone.key);
  });

  // Distribute ALL jobs from ALL zones across all days
  // Priority: Primary zone jobs go to their assigned week first
  // Remaining capacity filled with other zone jobs
  
  for (const zone of sortedZones) {
    // Find which week this zone is primarily assigned to (if any)
    let primaryWeek: number | null = null;
    for (const [weekIdx, zoneKey] of primaryZoneAssignments) {
      if (zoneKey === zone.key) {
        primaryWeek = weekIdx;
        break;
      }
    }

    // Distribute this zone's jobs
    for (const job of zone.jobs) {
      let assigned = false;
      
      // Try to assign to primary week first (if exists)
      if (primaryWeek !== null) {
        const weekDays = workingDays.slice(primaryWeek * 5, (primaryWeek + 1) * 5);
        for (const day of weekDays) {
          const dateStr = formatDateISO(day);
          const currentCount = dayJobCounts.get(dateStr) || 0;
          
          if (currentCount < maxJobsPerDay) {
            const interval = parseFrequency(job.pattern, job.frequency);
            plannedJobs.push({
              ...job,
              plannedDate: dateStr,
              plannedWeekIndex: primaryWeek,
              plannedDayIndex: day.getDay(),
              plannedTechnicianName: job.technicianName || null,
              flags: interval === null ? ['needs-review'] : [],
            });
            dayJobCounts.set(dateStr, currentCount + 1);
            assigned = true;
            break;
          }
        }
      }
      
      // If not assigned to primary week, find any available day
      if (!assigned) {
        for (const day of workingDays) {
          const dateStr = formatDateISO(day);
          const currentCount = dayJobCounts.get(dateStr) || 0;
          
          if (currentCount < maxJobsPerDay) {
            const weekIndex = Math.floor(workingDays.indexOf(day) / 5);
            const interval = parseFrequency(job.pattern, job.frequency);
            plannedJobs.push({
              ...job,
              plannedDate: dateStr,
              plannedWeekIndex: weekIndex,
              plannedDayIndex: day.getDay(),
              plannedTechnicianName: job.technicianName || null,
              flags: interval === null ? ['needs-review'] : [],
            });
            dayJobCounts.set(dateStr, currentCount + 1);
            assigned = true;
            break;
          }
        }
      }
      
      // If still not assigned, mark as unplanned
      if (!assigned) {
        unplannedJobs.push(job);
      }
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
 * Move a job in plan
 */
export function moveJobInPlan(plan: Plan, jobId: string, newDate: string): Plan {
  const idx = plan.plannedJobs.findIndex(j => j.id === jobId);
  
  if (idx === -1) {
    const unplannedIdx = plan.unplannedJobs.findIndex(j => j.id === jobId);
    if (unplannedIdx === -1) return plan;
    
    const job = plan.unplannedJobs[unplannedIdx];
    const [d, m, y] = newDate.split('-').map(Number);
    
    return {
      ...plan,
      plannedJobs: [...plan.plannedJobs, {
        ...job,
        plannedDate: newDate,
        plannedWeekIndex: 0,
        plannedDayIndex: new Date(y, m - 1, d).getDay(),
        plannedTechnicianName: job.technicianName || null,
        flags: ['manually-added'],
      }],
      unplannedJobs: plan.unplannedJobs.filter((_, i) => i !== unplannedIdx),
    };
  }

  const job = plan.plannedJobs[idx];
  const [d, m, y] = newDate.split('-').map(Number);
  const newDateObj = new Date(y, m - 1, d);
  const [sd, sm, sy] = plan.startDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);

  const updatedJob = {
    ...job,
    plannedDate: newDate,
    plannedWeekIndex: Math.floor((newDateObj.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)),
    plannedDayIndex: newDateObj.getDay(),
    flags: [...job.flags.filter(f => f !== 'rescheduled'), 'manually-moved'],
  };

  const newPlanned = [...plan.plannedJobs];
  newPlanned[idx] = updatedJob;

  return { ...plan, plannedJobs: newPlanned };
}
