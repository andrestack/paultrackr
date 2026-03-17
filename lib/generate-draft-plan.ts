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
    workingDays.push(...weekDates.slice(1, 6)); // Mon-Fri only
  }

  // Assign one zone per week
  for (let weekIndex = 0; weekIndex < weeks && weekIndex < sortedZones.length; weekIndex++) {
    const zone = sortedZones[weekIndex];
    const weekDays = workingDays.slice(weekIndex * 5, (weekIndex + 1) * 5);
    
    // Calculate how many jobs per day for this zone
    const totalZoneJobs = zone.jobs.length;
    const maxCapacity = maxJobsPerDay * 5; // 5 days
    
    if (totalZoneJobs > maxCapacity) {
      // Zone too big - schedule what fits, mark rest unplanned
      const jobsToSchedule = zone.jobs.slice(0, maxCapacity);
      const jobsUnplanned = zone.jobs.slice(maxCapacity);
      
      // Distribute jobsToSchedule across 5 days
      jobsToSchedule.forEach((job, idx) => {
        const dayIndex = idx % 5;
        const day = weekDays[dayIndex];
        const interval = parseFrequency(job.pattern, job.frequency);
        
        plannedJobs.push({
          ...job,
          plannedDate: formatDateISO(day),
          plannedWeekIndex: weekIndex,
          plannedDayIndex: day.getDay(),
          plannedTechnicianName: job.technicianName || null,
          flags: interval === null ? ['needs-review'] : [],
        });
      });
      
      unplannedJobs.push(...jobsUnplanned);
    } else {
      // Zone fits - distribute evenly across Mon-Fri
      zone.jobs.forEach((job, idx) => {
        const dayIndex = idx % 5;
        const day = weekDays[dayIndex];
        const interval = parseFrequency(job.pattern, job.frequency);
        
        plannedJobs.push({
          ...job,
          plannedDate: formatDateISO(day),
          plannedWeekIndex: weekIndex,
          plannedDayIndex: day.getDay(),
          plannedTechnicianName: job.technicianName || null,
          flags: interval === null ? ['needs-review'] : [],
        });
      });
    }
  }

  // Handle extra zones (if more than 4 zones)
  if (sortedZones.length > weeks) {
    for (let i = weeks; i < sortedZones.length; i++) {
      unplannedJobs.push(...sortedZones[i].jobs);
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
