/**
 * Zone clustering functions for geographic grouping of jobs
 */

import { Job, Zone } from './types';

/**
 * Generate a stable zone key from a job's address
 * Priority: postcode > city > UNKNOWN
 */
export function makeZoneKey(job: Job): string {
  const postcode = job.addressPostcode?.trim();
  const city = job.addressCity?.trim();

  if (postcode) {
    return postcode;
  }

  if (city) {
    return city.toUpperCase();
  }

  return 'UNKNOWN';
}

/**
 * Extract a sample of unique street names from jobs
 * Returns up to maxSamples unique street names
 */
function extractStreetSample(jobs: Job[], maxSamples = 3): string[] {
  const streets = new Set<string>();

  for (const job of jobs) {
    const street = job.addressStreetOne?.trim();
    if (street) {
      streets.add(street);
      if (streets.size >= maxSamples) {
        break;
      }
    }
  }

  return Array.from(streets);
}

/**
 * Cluster jobs into zones based on geographic heuristics
 * Zones are sorted by count (descending), then by key (alphabetically) for determinism
 */
export function clusterJobsByZone(jobs: Job[]): Zone[] {
  // Group jobs by zone key
  const zoneMap = new Map<string, Job[]>();

  for (const job of jobs) {
    const key = makeZoneKey(job);
    const existing = zoneMap.get(key) || [];
    existing.push(job);
    zoneMap.set(key, existing);
  }

  // Build Zone objects
  const zones: Zone[] = [];

  for (const [key, zoneJobs] of zoneMap) {
    // Determine representative postcode and city for display
    let postcode = '';
    let city = '';

    // Try to find the most common postcode and city in this zone
    const postcodeCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();

    for (const job of zoneJobs) {
      if (job.addressPostcode) {
        postcodeCounts.set(job.addressPostcode, (postcodeCounts.get(job.addressPostcode) || 0) + 1);
      }
      if (job.addressCity) {
        cityCounts.set(job.addressCity, (cityCounts.get(job.addressCity) || 0) + 1);
      }
    }

    // Find most common
    let maxPostcodeCount = 0;
    for (const [pc, count] of postcodeCounts) {
      if (count > maxPostcodeCount) {
        maxPostcodeCount = count;
        postcode = pc;
      }
    }

    let maxCityCount = 0;
    for (const [c, count] of cityCounts) {
      if (count > maxCityCount) {
        maxCityCount = count;
        city = c;
      }
    }

    // Fallback: if zone key is a city name, use that
    if (!postcode && !city && key !== 'UNKNOWN') {
      city = key;
    }

    zones.push({
      key,
      postcode,
      city,
      streetsSample: extractStreetSample(zoneJobs),
      count: zoneJobs.length,
      jobs: zoneJobs,
    });
  }

  // Sort by count desc, then by key alphabetically for determinism
  zones.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.key.localeCompare(b.key);
  });

  return zones;
}
