# Feature: Export

## Responsibility (SRP)
Export the planned schedule to CSV format(s) for owner use.

## Allowed Imports/Dependencies
- Shared types from `lib/types.ts`
- UI components from `components/ui/`

## Pure Logic Location
All export logic must live in:
- `lib/export-plan-csv.ts` - Mode A: Plan CSV export
- `lib/export-pooltrackr-csv.ts` - Mode B: PoolTrackr-compatible export

## Component Structure
- `ExportPanel.tsx` - Export controls and format selection
- `DownloadButton.tsx` - CSV download trigger

## Export Modes

### Mode A (MVP-Safe): Plan CSV
Columns: `ID`, `Planned Date`, `Technician`, `Zone Key`, `Notes/Flags`

### Mode B (PoolTrackr-like): Update Original
Overwrite `Next Date` and technician fields while preserving all original columns.

## Testing Requirements
- Unit test: Export contains correct number of rows
- Unit test: IDs match input set exactly
- Unit test: Changed dates match plan state

## Key Constraints
- Preserve `ID` column exactly
- Preserve original header order in Mode B
- Only modify fields that are confirmed mapped
