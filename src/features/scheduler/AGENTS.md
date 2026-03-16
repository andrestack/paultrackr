# Feature: Scheduler

## Responsibility (SRP)
Generate draft 4-week plans and provide drag-and-drop UI for manual schedule adjustment.

## Allowed Imports/Dependencies
- `dnd-kit` (Phase 4) for drag-and-drop
- `date-fns` for date calculations (if needed)
- Shared types from `lib/types.ts`
- Zone feature components
- UI components from `components/ui/`

## Pure Logic Location
All scheduling logic must live in:
- `lib/generate-draft-plan.ts` - Create initial 4-week schedule
- `lib/plan-state-reducer.ts` - Handle plan updates (move jobs between days)

## Component Structure
- `SchedulerGrid.tsx` - Main 4-week calendar grid
- `DayCell.tsx` - Individual day column with job cards
- `JobCard.tsx` - Draggable job card component
- `PlanToolbar.tsx` - Controls (reset, undo, export)

## State Management
- Plan state stored in React state (in-memory)
- URL params for: start date, view mode
- Separate draft plan from current plan state

## Testing Requirements
- Unit test: `generateDraftPlan()` assigns jobs within window
- Unit test: Plan generation is deterministic
- Unit test: Reducer correctly moves jobs between dates

## Scheduling Rules (MVP)
- 4-week window from chosen start date
- Keep zones together on same day when possible
- Balance daily load (max jobs per day heuristic)
- Respect existing technician assignments initially
