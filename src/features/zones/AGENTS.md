# Feature: Zone Clustering

## Responsibility (SRP)
Cluster jobs into geographic Zones using string heuristics (postcode, city, street).

## Allowed Imports/Dependencies
- Shared types from `lib/types.ts`
- UI components from `components/ui/`

## Pure Logic Location
All clustering logic must live in:
- `lib/make-zone-key.ts` - Generate zone key from job address
- `lib/cluster-jobs.ts` - Group jobs into zones

## Component Structure
- `ZoneList.tsx` - Display zones with job counts
- `ZoneCard.tsx` - Individual zone display

## Testing Requirements
- Unit test: `makeZoneKey()` edge cases (missing fields)
- Unit test: `clusterJobs()` deterministic ordering
- Unit test: Jobs without addresses map to UNKNOWN zone

## Algorithm
1. Primary: Group by `Address Postcode`
2. Secondary: Group by `Address City` within postcode
3. Tertiary: Sample street names for display
4. Fallback: `UNKNOWN` zone for jobs with no address data
