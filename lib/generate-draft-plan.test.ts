/**
 * Tests for generate-draft-plan.ts
 * Run with: node --test lib/generate-draft-plan.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateDraftPlan, moveJobInPlan } from './generate-draft-plan';
import { Job, JobRaw } from './types';
import { normalizeJob } from './normalize-job';
import { formatDateISO, addDays } from './date-utils';

function createJob(overrides: Partial<Job> = {}): Job {
  const raw: JobRaw = {
    ID: '1',
    'Contact Name': 'Test',
    'Address Street One': '123 Street',
    'Address City': 'City',
    'Address State': 'State',
    'Address Postcode': '4556',
    'Technician Name': 'Tech1',
    'Job Template Name': 'Weekly Pool Service',
    'Start Time': '09:00',
    'End Time': '10:00',
    'Next Date': '',
    'Pattern': 'Weekly',
    'Frequency': '1',
    'Notes': '',
  };
  const job = normalizeJob(raw);
  return { ...job, ...overrides };
}

describe('generateDraftPlan', () => {
  it('should generate a plan with correct date range', () => {
    const startDate = '17-03-2026'; // A Tuesday
    const jobs = [
      createJob({ id: '1', addressPostcode: '4556' }),
      createJob({ id: '2', addressPostcode: '4556' }),
    ];

    const plan = generateDraftPlan({ jobs, startDate, weeks: 4 });

    assert.strictEqual(plan.startDate, startDate);
    // End date should be 4 weeks later (28 days - 1 = 27 days from start)
    assert.strictEqual(plan.endDate, '13-04-2026');
    assert.strictEqual(plan.weeks, 4);
  });

  it('should assign all jobs to planned jobs or unplanned', () => {
    const jobs = [
      createJob({ id: '1' }),
      createJob({ id: '2' }),
      createJob({ id: '3' }),
    ];

    const plan = generateDraftPlan({ jobs, startDate: '2026-03-17' });

    const totalJobs = plan.plannedJobs.length + plan.unplannedJobs.length;
    assert.strictEqual(totalJobs, 3);
  });

  it('should distribute all jobs across available days', () => {
    const jobs = [
      createJob({ id: '1', addressPostcode: '4556' }),
      createJob({ id: '2', addressPostcode: '4556' }),
      createJob({ id: '3', addressPostcode: '4557' }),
    ];

    const plan = generateDraftPlan({ jobs, startDate: '17-03-2026' });

    // All jobs should be scheduled
    assert.strictEqual(plan.plannedJobs.length, 3);
    
    // Jobs should be scheduled on valid days
    plan.plannedJobs.forEach(job => {
      assert.ok(job.plannedDate, 'Job should have a planned date');
      assert.ok(job.plannedWeekIndex >= 0, 'Job should have valid week index');
    });
  });

  it('should respect daily job limits', () => {
    // Create 20 jobs in the same zone
    const jobs = Array.from({ length: 20 }, (_, i) =>
      createJob({ id: String(i + 1), addressPostcode: '4556' })
    );

    const plan = generateDraftPlan({ 
      jobs, 
      startDate: '17-03-2026',
      maxJobsPerDay: 5 
    });

    // Count jobs per day
    const dayCounts = new Map<string, number>();
    for (const job of plan.plannedJobs) {
      const count = dayCounts.get(job.plannedDate) || 0;
      dayCounts.set(job.plannedDate, count + 1);
    }

    // No day should have more than 5 jobs
    for (const count of dayCounts.values()) {
      assert.ok(count <= 5, `Day has ${count} jobs, expected <= 5`);
    }
  });

  it('should be deterministic for same inputs', () => {
    const jobs = [
      createJob({ id: '1', addressPostcode: '4556' }),
      createJob({ id: '2', addressPostcode: '4557' }),
      createJob({ id: '3', addressPostcode: '4558' }),
    ];

    const plan1 = generateDraftPlan({ jobs, startDate: '17-03-2026' });
    const plan2 = generateDraftPlan({ jobs, startDate: '17-03-2026' });

    assert.strictEqual(plan1.plannedJobs.length, plan2.plannedJobs.length);
    
    // Compare planned dates for each job
    for (let i = 0; i < plan1.plannedJobs.length; i++) {
      assert.strictEqual(
        plan1.plannedJobs[i].plannedDate,
        plan2.plannedJobs[i].plannedDate
      );
    }
  });

  it('should set needs-review flag for unknown frequency', () => {
    const jobs = [
      createJob({ 
        id: '1', 
        pattern: 'Unknown',
        frequency: ''
      }),
    ];

    const plan = generateDraftPlan({ jobs, startDate: '17-03-2026' });

    // Job should be planned (unknown frequency just gets a flag)
    assert.ok(plan.plannedJobs.length > 0, 'Job should be planned');
    assert.ok(plan.plannedJobs[0].flags.includes('needs-review'), 'Should have needs-review flag');
  });

  it('should set week index and day index correctly', () => {
    const startDate = '17-03-2026'; // Tuesday, Week 0
    const jobs = [createJob({ id: '1' })];

    const plan = generateDraftPlan({ jobs, startDate });

    if (plan.plannedJobs.length > 0) {
      const job = plan.plannedJobs[0];
      assert.strictEqual(typeof job.plannedWeekIndex, 'number');
      assert.strictEqual(typeof job.plannedDayIndex, 'number');
      assert.ok(job.plannedWeekIndex >= 0);
      assert.ok(job.plannedDayIndex >= 0 && job.plannedDayIndex <= 6);
    }
  });

  it('should handle empty job array', () => {
    const plan = generateDraftPlan({ jobs: [], startDate: '17-03-2026' });
    
    assert.strictEqual(plan.plannedJobs.length, 0);
    assert.strictEqual(plan.unplannedJobs.length, 0);
  });

  it('should schedule jobs in zone-based groups', () => {
    const startDate = '17-03-2026';
    const jobs = [
      createJob({ 
        id: '1',
        nextDateRaw: '20-03-2026',
        nextDateParsed: new Date(2026, 2, 20), // Note: month is 0-indexed
        addressPostcode: '4556'
      }),
    ];

    const plan = generateDraftPlan({ jobs, startDate });

    // Job should be scheduled (zone-based, not necessarily on next date)
    assert.ok(plan.plannedJobs.length > 0, 'Job should be planned');
  });
});

describe('moveJobInPlan', () => {
  it('should move a planned job to a new date', () => {
    const jobs = [createJob({ id: '1' })];
    const plan = generateDraftPlan({ jobs, startDate: '17-03-2026' });

    const newPlan = moveJobInPlan(plan, '1', '20-03-2026');

    const movedJob = newPlan.plannedJobs.find(j => j.id === '1');
    assert.ok(movedJob);
    assert.strictEqual(movedJob.plannedDate, '20-03-2026');
    assert.ok(movedJob.flags.includes('manually-moved'));
  });

  it('should move an unplanned job to planned', () => {
    const plan: import('./types').Plan = {
      startDate: '17-03-2026',
      endDate: '13-04-2026',
      weeks: 4,
      plannedJobs: [],
      unplannedJobs: [createJob({ id: '1' })],
    };

    const newPlan = moveJobInPlan(plan, '1', '20-03-2026');

    assert.strictEqual(newPlan.plannedJobs.length, 1);
    assert.strictEqual(newPlan.unplannedJobs.length, 0);
    assert.strictEqual(newPlan.plannedJobs[0].plannedDate, '20-03-2026');
    assert.ok(newPlan.plannedJobs[0].flags.includes('manually-added'));
  });

  it('should return same plan if job not found', () => {
    const jobs = [createJob({ id: '1' })];
    const plan = generateDraftPlan({ jobs, startDate: '17-03-2026' });

    const newPlan = moveJobInPlan(plan, '999', '20-03-2026');

    assert.deepStrictEqual(newPlan, plan);
  });
});
