# PoolTrackr Route Optimizer MVP - Agent Guidelines

## Reference Documents
- **SOLID/React Rules:** See `./ai-agents/instructions.md` for detailed coding standards
- **Master Prompt:** See `./ai-agents/master-prompt.md` for full project specification

## Project Scope
Build an MVP add-on for PoolTrackr that helps shop owners plan recurring jobs for a month by:
1. Clustering jobs geographically into "Zones"
2. Generating a 4-week draft schedule
3. Allowing manual drag-and-drop cleanup
4. Exporting an updated CSV

## Tech Stack
- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript 5+
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Forms:** React Hook Form + Zod
- **CSV Parsing:** papaparse
- **DnD:** dnd-kit (to be added in Phase 4)

## Folder Conventions
```
src/
├── app/                    # Next.js App Router (pages)
├── components/ui/          # shadcn/ui components
├── features/               # Domain-specific features
│   ├── ingestion/          # CSV upload & parsing
│   ├── zones/              # Geographic clustering
│   ├── scheduler/          # Plan generation & DnD UI
│   └── export/             # CSV export
├── lib/                    # Pure functions (testable)
│   ├── types.ts            # Shared TypeScript types
│   ├── normalize-job.ts    # Job normalization
│   └── ...
└── hooks/                  # Global custom hooks
```

## Allowed Libraries (MVP)
- `papaparse` - CSV parsing
- `dnd-kit` - Drag and drop (Phase 4)
- `date-fns` - Date manipulation (if needed)
- Existing stack: React, Next.js, Tailwind, shadcn/ui

## Do-Not-Do List
- NO external routing APIs (Google Maps, Mapbox, etc.)
- NO VRP/TSP solvers or perfect optimization
- NO complex authentication
- NO database persistence (in-memory only for MVP)
- NO map visualizations
- NO complex state management (URL params > Zustand)

## Phase Progress
See `progress.txt` for current status

## Testing
- Pure functions in `/lib` must be unit tested
- Update `tests.json` when adding tests
- Keep ID column intact through entire pipeline

## Key Principle
Routing/scheduling decisions must be implemented in testable code, not "LLM intuition".
