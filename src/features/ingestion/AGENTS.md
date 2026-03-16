# Feature: CSV Ingestion

## Responsibility (SRP)
Handle CSV file upload, parsing, and initial validation. Transforms raw CSV rows into normalized Job objects.

## Allowed Imports/Dependencies
- `papaparse` for CSV parsing
- `zod` for runtime validation
- Shared types from `lib/types.ts`
- UI components from `components/ui/`

## Pure Logic Location
All normalization and parsing logic must live in:
- `lib/normalize-job.ts` - Job normalization function
- `lib/types.ts` - Type definitions

## Component Structure
- `CsvUpload.tsx` - Client component handling file input and drag-drop
- `useCsvUpload.ts` - Custom hook for upload logic

## Testing Requirements
- Unit test: `normalizeJob()` function
- Unit test: CSV parsing edge cases (empty files, malformed rows)

## Data Flow
1. User selects/drops CSV file
2. Parse with papaparse
3. Validate headers
4. Normalize each row to Job type
5. Return Job[] to parent component
