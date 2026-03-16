/**
 * Tests for zone-clustering.ts
 * Run with: node --test lib/zone-clustering.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { makeZoneKey, clusterJobsByZone } from './zone-clustering';
import { Job, JobRaw } from './types';
import { normalizeJob } from './normalize-job';

function createJob(overrides: Partial<Job> = {}): Job {
  const raw: JobRaw = {
    ID: '1',
    'Contact Name': 'Test',
    'Address Street One': '123 Street',
    'Address City': 'City',
    'Address State': 'State',
    'Address Postcode': '1234',
    'Technician Name': '',
    'Job Template Name': '',
    'Start Time': '',
    'End Time': '',
    'Next Date': '',
    'Pattern': '',
    'Frequency': '',
    'Notes': '',
  };
  const job = normalizeJob(raw);
  return { ...job, ...overrides };
}

describe('makeZoneKey', () => {
  it('should use postcode as primary key', () => {
    const job = createJob({
      addressPostcode: '4556',
      addressCity: 'Sippy Downs',
    });
    assert.strictEqual(makeZoneKey(job), '4556');
  });

  it('should fall back to city when no postcode', () => {
    const job = createJob({
      addressPostcode: '',
      addressCity: 'Maroochydore',
    });
    assert.strictEqual(makeZoneKey(job), 'MAROOCHYDORE');
  });

  it('should return UNKNOWN when no postcode or city', () => {
    const job = createJob({
      addressPostcode: '',
      addressCity: '',
    });
    assert.strictEqual(makeZoneKey(job), 'UNKNOWN');
  });

  it('should handle whitespace-only strings', () => {
    const job = createJob({
      addressPostcode: '   ',
      addressCity: '   ',
    });
    assert.strictEqual(makeZoneKey(job), 'UNKNOWN');
  });

  it('should handle mixed case city names', () => {
    const job = createJob({
      addressPostcode: '',
      addressCity: 'mOoLoOlAbA',
    });
    assert.strictEqual(makeZoneKey(job), 'MOOLOOLABA');
  });
});

describe('clusterJobsByZone', () => {
  it('should cluster jobs by postcode', () => {
    const jobs = [
      createJob({ id: '1', addressPostcode: '4556', addressCity: 'Sippy Downs' }),
      createJob({ id: '2', addressPostcode: '4556', addressCity: 'Buderim' }),
      createJob({ id: '3', addressPostcode: '4557', addressCity: 'Mooloolaba' }),
    ];

    const zones = clusterJobsByZone(jobs);

    assert.strictEqual(zones.length, 2);
    assert.strictEqual(zones[0].key, '4556');
    assert.strictEqual(zones[0].count, 2);
    assert.strictEqual(zones[1].key, '4557');
    assert.strictEqual(zones[1].count, 1);
  });

  it('should sort zones by count descending', () => {
    const jobs = [
      createJob({ id: '1', addressPostcode: '4556', addressCity: 'A' }),
      createJob({ id: '2', addressPostcode: '4556', addressCity: 'A' }),
      createJob({ id: '3', addressPostcode: '4556', addressCity: 'A' }),
      createJob({ id: '4', addressPostcode: '4557', addressCity: 'B' }),
      createJob({ id: '5', addressPostcode: '4557', addressCity: 'B' }),
    ];

    const zones = clusterJobsByZone(jobs);

    assert.strictEqual(zones[0].key, '4556');
    assert.strictEqual(zones[0].count, 3);
    assert.strictEqual(zones[1].key, '4557');
    assert.strictEqual(zones[1].count, 2);
  });

  it('should sort by key alphabetically when counts are equal', () => {
    const jobs = [
      createJob({ id: '1', addressPostcode: 'B' }),
      createJob({ id: '2', addressPostcode: 'A' }),
    ];

    const zones = clusterJobsByZone(jobs);

    assert.strictEqual(zones[0].key, 'A');
    assert.strictEqual(zones[1].key, 'B');
  });

  it('should handle jobs with missing addresses', () => {
    const jobs = [
      createJob({ id: '1', addressPostcode: '', addressCity: '' }),
      createJob({ id: '2', addressPostcode: '', addressCity: '' }),
      createJob({ id: '3', addressPostcode: '4556', addressCity: 'City' }),
    ];

    const zones = clusterJobsByZone(jobs);

    assert.strictEqual(zones.length, 2);
    // UNKNOWN zone should have 2 jobs
    const unknownZone = zones.find(z => z.key === 'UNKNOWN');
    assert.ok(unknownZone);
    assert.strictEqual(unknownZone.count, 2);
  });

  it('should extract street samples from jobs', () => {
    const jobs = [
      createJob({ id: '1', addressPostcode: '4556', addressStreetOne: '123 Main St' }),
      createJob({ id: '2', addressPostcode: '4556', addressStreetOne: '456 Oak Ave' }),
      createJob({ id: '3', addressPostcode: '4556', addressStreetOne: '789 Pine Rd' }),
    ];

    const zones = clusterJobsByZone(jobs);

    assert.strictEqual(zones[0].streetsSample.length, 3);
    assert.ok(zones[0].streetsSample.includes('123 Main St'));
  });

  it('should be deterministic for same inputs', () => {
    const jobs = [
      createJob({ id: '1', addressPostcode: '4556' }),
      createJob({ id: '2', addressPostcode: '4557' }),
      createJob({ id: '3', addressPostcode: '4556' }),
    ];

    const zones1 = clusterJobsByZone(jobs);
    const zones2 = clusterJobsByZone(jobs);

    assert.deepStrictEqual(zones1.map(z => z.key), zones2.map(z => z.key));
    assert.deepStrictEqual(zones1.map(z => z.count), zones2.map(z => z.count));
  });

  it('should find most common city within a postcode zone', () => {
    const jobs = [
      createJob({ id: '1', addressPostcode: '4556', addressCity: 'Sippy Downs' }),
      createJob({ id: '2', addressPostcode: '4556', addressCity: 'Sippy Downs' }),
      createJob({ id: '3', addressPostcode: '4556', addressCity: 'Buderim' }),
    ];

    const zones = clusterJobsByZone(jobs);

    assert.strictEqual(zones[0].city, 'Sippy Downs');
  });

  it('should handle empty job array', () => {
    const zones = clusterJobsByZone([]);
    assert.strictEqual(zones.length, 0);
  });
});
