/**
 * Tests for export-csv.ts
 * Run with: node --test lib/export-csv.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { exportPlanCsv, exportPoolTrackrCsv } from './export-csv';
import { PlannedJob, Job, Plan, JobRaw } from './types';

function createJobRaw(overrides: Partial<JobRaw> = {}): JobRaw {
  return {
    ID: '123',
    'Contact Name': 'John Doe',
    'Address Street One': '123 Main St',
    'Address City': 'Sippy Downs',
    'Address State': 'QLD',
    'Address Postcode': '4556',
    'Technician Name': 'Mike',
    'Job Template Name': 'Weekly Service',
    'Start Time': '09:00',
    'End Time': '10:00',
    'Next Date': '20-03-2026',
    'Pattern': 'Weekly',
    'Frequency': '1',
    'Notes': '',
    ...overrides,
  };
}

function createJob(overrides: Partial<Job> = {}): Job {
  const raw = createJobRaw(overrides.raw);
  return {
    id: raw.ID,
    contactName: raw['Contact Name'],
    addressStreetOne: raw['Address Street One'],
    addressCity: raw['Address City'],
    addressState: raw['Address State'],
    addressPostcode: raw['Address Postcode'],
    technicianName: raw['Technician Name'],
    jobTemplateName: raw['Job Template Name'],
    startTime: raw['Start Time'],
    endTime: raw['End Time'],
    nextDateRaw: raw['Next Date'],
    nextDateParsed: null,
    pattern: raw['Pattern'],
    frequency: raw['Frequency'],
    notes: raw['Notes'],
    raw,
    ...overrides,
  };
}

function createPlannedJob(overrides: Partial<PlannedJob> = {}): PlannedJob {
  const job = createJob(overrides);
  return {
    ...job,
    plannedDate: '17-03-2026',
    plannedWeekIndex: 0,
    plannedDayIndex: 1,
    plannedTechnicianName: 'Mike',
    flags: [],
    ...overrides,
  };
}

describe('exportPlanCsv', () => {
  it('should export planned jobs with correct headers', () => {
    const plan: Plan = {
      startDate: '17-03-2026',
      endDate: '13-04-2026',
      weeks: 4,
      plannedJobs: [
        createPlannedJob({ id: '1', plannedDate: '17-03-2026', contactName: 'Job A' }),
        createPlannedJob({ id: '2', plannedDate: '18-03-2026', contactName: 'Job B' }),
      ],
      unplannedJobs: [],
    };

    const csv = exportPlanCsv(plan);
    
    assert.ok(csv.includes('ID,Planned Date,Technician,Zone Key,Notes/Flags'));
    assert.ok(csv.includes('1,17-03-2026'));
    assert.ok(csv.includes('2,18-03-2026'));
  });

  it('should include unplanned jobs with flag', () => {
    const plan: Plan = {
      startDate: '17-03-2026',
      endDate: '13-04-2026',
      weeks: 4,
      plannedJobs: [createPlannedJob({ id: '1' })],
      unplannedJobs: [createJob({ id: '2', contactName: 'Unplanned Job' })],
    };

    const csv = exportPlanCsv(plan);
    
    assert.ok(csv.includes('2,'));
    assert.ok(csv.includes('unplanned'));
  });

  it('should include flags in notes column', () => {
    const plan: Plan = {
      startDate: '17-03-2026',
      endDate: '13-04-2026',
      weeks: 4,
      plannedJobs: [
        createPlannedJob({ id: '1', flags: ['needs-review', 'manually-moved'] }),
      ],
      unplannedJobs: [],
    };

    const csv = exportPlanCsv(plan);
    
    assert.ok(csv.includes('needs-review'));
    assert.ok(csv.includes('manually-moved'));
  });

  it('should preserve ID values exactly', () => {
    const plan: Plan = {
      startDate: '17-03-2026',
      endDate: '13-04-2026',
      weeks: 4,
      plannedJobs: [
        createPlannedJob({ id: 'JOB-001', plannedDate: '17-03-2026' }),
      ],
      unplannedJobs: [],
    };

    const csv = exportPlanCsv(plan);
    
    assert.ok(csv.includes('JOB-001'));
  });
});

describe('exportPoolTrackrCsv', () => {
  it('should preserve original column order', () => {
    const originalJobs = [
      createJob({ id: '1', raw: createJobRaw({ ID: '1', 'Contact Name': 'John' }) }),
    ];

    const plan: Plan = {
      startDate: '17-03-2026',
      endDate: '13-04-2026',
      weeks: 4,
      plannedJobs: [createPlannedJob({ id: '1', plannedDate: '20-03-2026' })],
      unplannedJobs: [],
    };

    const csv = exportPoolTrackrCsv(originalJobs, plan);
    const lines = csv.split('\n');
    
    // First line should be headers
    assert.ok(lines[0].includes('ID'));
    assert.ok(lines[0].includes('Contact Name'));
  });

  it('should update Next Date with planned date', () => {
    const originalJobs = [
      createJob({ 
        id: '1', 
        raw: createJobRaw({ ID: '1', 'Next Date': '15-03-2026' })
      }),
    ];

    const plan: Plan = {
      startDate: '17-03-2026',
      endDate: '13-04-2026',
      weeks: 4,
      plannedJobs: [createPlannedJob({ id: '1', plannedDate: '20-03-2026' })],
      unplannedJobs: [],
    };

    const csv = exportPoolTrackrCsv(originalJobs, plan);
    
    // Should contain the updated date in DD/MM/YYYY format
    assert.ok(csv.includes('20/03/2026'));
    // Should not contain the old date
    assert.ok(!csv.includes('15/03/2026'));
  });

  it('should handle jobs not in plan', () => {
    const originalJobs = [
      createJob({ id: '1', raw: createJobRaw({ ID: '1', 'Next Date': '15-03-2026' }) }),
    ];

    const plan: Plan = {
      startDate: '17-03-2026',
      endDate: '13-04-2026',
      weeks: 4,
      plannedJobs: [], // Job 1 not in plan
      unplannedJobs: [],
    };

    const csv = exportPoolTrackrCsv(originalJobs, plan);
    
    // Should preserve original date for unplanned jobs
    assert.ok(csv.includes('15-03-2026'));
  });

  it('should preserve ID column exactly', () => {
    const originalJobs = [
      createJob({ 
        id: 'JOB-123-ABC', 
        raw: createJobRaw({ ID: 'JOB-123-ABC' })
      }),
    ];

    const plan: Plan = {
      startDate: '17-03-2026',
      endDate: '13-04-2026',
      weeks: 4,
      plannedJobs: [createPlannedJob({ id: 'JOB-123-ABC' })],
      unplannedJobs: [],
    };

    const csv = exportPoolTrackrCsv(originalJobs, plan);
    
    assert.ok(csv.includes('JOB-123-ABC'));
  });

  it('should return empty string for empty jobs array', () => {
    const csv = exportPoolTrackrCsv([], {
      startDate: '17-03-2026',
      endDate: '13-04-2026',
      weeks: 4,
      plannedJobs: [],
      unplannedJobs: [],
    });
    
    assert.strictEqual(csv, '');
  });
});
