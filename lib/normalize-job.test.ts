/**
 * Tests for normalize-job.ts
 * Run with: node --test lib/normalize-job.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeJob, validateJob } from './normalize-job';
import { JobRaw } from './types';

describe('normalizeJob', () => {
  it('should normalize a complete job correctly', () => {
    const raw: JobRaw = {
      ID: '12345',
      'Contact Name': '  John Doe  ',
      'Address Street One': '123 Pool Lane',
      'Address City': 'Sippy Downs',
      'Address State': 'QLD',
      'Address Postcode': '4556',
      'Technician Name': 'Mike Smith',
      'Job Template Name': 'Weekly Pool Service',
      'Start Time': '09:00',
      'End Time': '10:00',
      'Next Date': '15/03/2026',
      'Pattern': 'Weekly',
      'Frequency': '1',
      'Notes': 'Bring extra chlorine',
    };

    const job = normalizeJob(raw);

    assert.strictEqual(job.id, '12345');
    assert.strictEqual(job.contactName, 'John Doe');
    assert.strictEqual(job.addressPostcode, '4556');
    assert.strictEqual(job.technicianName, 'Mike Smith');
    assert.strictEqual(job.nextDateRaw, '15/03/2026');
    assert.notStrictEqual(job.nextDateParsed, null);
    assert.strictEqual(job.nextDateParsed?.getFullYear(), 2026);
    assert.strictEqual(job.nextDateParsed?.getMonth(), 2); // March is 2 (0-indexed)
    assert.strictEqual(job.nextDateParsed?.getDate(), 15);
    assert.deepStrictEqual(job.raw, raw);
  });

  it('should handle missing fields gracefully', () => {
    const raw: JobRaw = {
      ID: '54321',
      'Contact Name': '',
      'Address Street One': '',
      'Address City': '',
      'Address State': '',
      'Address Postcode': '',
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

    assert.strictEqual(job.id, '54321');
    assert.strictEqual(job.contactName, '');
    assert.strictEqual(job.addressPostcode, '');
    assert.strictEqual(job.nextDateParsed, null);
  });

  it('should normalize postcode to uppercase', () => {
    const raw: JobRaw = {
      ID: '1',
      'Contact Name': 'Test',
      'Address Street One': '123 Street',
      'Address City': 'City',
      'Address State': 'State',
      'Address Postcode': 'abcd 123',
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
    assert.strictEqual(job.addressPostcode, 'ABCD 123');
  });

  it('should parse ISO date format', () => {
    const raw: JobRaw = {
      ID: '1',
      'Contact Name': 'Test',
      'Address Street One': '',
      'Address City': '',
      'Address State': '',
      'Address Postcode': '',
      'Technician Name': '',
      'Job Template Name': '',
      'Start Time': '',
      'End Time': '',
      'Next Date': '2026-03-15',
      'Pattern': '',
      'Frequency': '',
      'Notes': '',
    };

    const job = normalizeJob(raw);
    assert.notStrictEqual(job.nextDateParsed, null);
    assert.strictEqual(job.nextDateParsed?.getFullYear(), 2026);
    assert.strictEqual(job.nextDateParsed?.getMonth(), 2);
    assert.strictEqual(job.nextDateParsed?.getDate(), 15);
  });

  it('should handle invalid dates gracefully', () => {
    const raw: JobRaw = {
      ID: '1',
      'Contact Name': 'Test',
      'Address Street One': '',
      'Address City': '',
      'Address State': '',
      'Address Postcode': '',
      'Technician Name': '',
      'Job Template Name': '',
      'Start Time': '',
      'End Time': '',
      'Next Date': 'not-a-date',
      'Pattern': '',
      'Frequency': '',
      'Notes': '',
    };

    const job = normalizeJob(raw);
    assert.strictEqual(job.nextDateParsed, null);
    assert.strictEqual(job.nextDateRaw, 'not-a-date');
  });
});

describe('validateJob', () => {
  it('should validate a complete job', () => {
    const raw: JobRaw = {
      ID: '123',
      'Contact Name': 'John',
      'Address Street One': '',
      'Address City': '',
      'Address State': '',
      'Address Postcode': '',
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
    const validation = validateJob(job);
    
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.errors.length, 0);
  });

  it('should return errors for missing required fields', () => {
    const raw: JobRaw = {
      ID: '',
      'Contact Name': '',
      'Address Street One': '',
      'Address City': '',
      'Address State': '',
      'Address Postcode': '',
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
    const validation = validateJob(job);
    
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors.includes('Missing ID'));
    assert.ok(validation.errors.includes('Missing Contact Name'));
  });
});
