### Master Build Prompt (for OpenCode) — PoolTrackr Route Optimizer MVP (Drag-and-Drop Scheduler)

<context>
You are OpenCode acting as a hyper-leveraged solo-dev coding agent. You will build an MVP add-on for PoolTrackr that helps shop owners plan recurring jobs for a month by clustering geographically and then allowing manual drag-and-drop cleanup.

Primary outcome: a user uploads a PoolTrackr recurring-jobs CSV export → the app groups jobs into “Zones” (postcode/suburb/street heuristics) → generates a 4-week draft schedule → user drags jobs between days/techs → exports an updated CSV (or a “plan CSV”) that the owner can use to manually update PoolTrackr or upload back if compatible.

Key principle: routing/scheduling decisions must be implemented in testable code, not “LLM intuition”.
</context>

<inputs>
- Existing repo has an `ai-agents/` folder with React SOLID instructions (must be referenced, not duplicated).
- A sample PoolTrackr export CSV exists (e.g., `recurrence-jobs-export-*.csv`) with columns like:
  - `ID`, `Contact Name`, `Address Street One`, `Address City`, `Address State`, `Address Postcode`
  - `Technician Name`, `Job Template Name`, `Start Time`, `End Time`, `Next Date`, `Pattern`, `Frequency`, `Notes`
</inputs>

<non_negotiables>
- Keep the `ID` column intact through the entire pipeline.
- MVP must be produced in logical phases; do not jump ahead.
- Avoid over-engineering: no maps, no paid routing APIs, no VRP/TSP perfection, no complex auth.
- Only validate at system boundaries (CSV upload/import, export).
- Never claim a file exists or was modified unless you opened/edited it.
</non_negotiables>

### 0) Agent Operating Rules (applies to every phase)

#### Read-first protocol
1. Locate and read `/AGENTS.md` (if it exists). If it does not exist, create it in Phase 1 step A.
2. Before working inside a feature folder, read that folder’s `AGENTS.md` (create it if missing as part of the phase).

#### Minimal state tracking (required)
Maintain two files in project root:
- `progress.txt` (human-readable, updated each phase)
- `tests.json` (structured list of tests and status; keep it simple)

`progress.txt` format:
- Current Phase:
- Done:
- Next:
- Risks/Unknowns:
- Do-Not-Do List:

`tests.json` format:
- `{ "tests": [ { "name": "...", "status": "not_started|passing|failing" } ] }`

#### Definition of Done (for each phase)
- Feature works end-to-end for that phase
- Basic tests written for new pure functions
- `progress.txt` and `tests.json` updated

---

### 1) AGENTS.md Strategy (must be implemented first)

#### A) Create Root `AGENTS.md` (project root)
Purpose: global rules (stack, SOLID, naming, boundaries, “do not do” list).

It must:
- Point to your existing SOLID rules in `./ai-agents/instructions.md`
- Define the MVP scope and phases
- Define the project folder conventions (features/modules)
- Define which libraries are allowed in MVP (keep minimal)

#### B) Create Feature-level `AGENTS.md` (only at feature folder level, not per component)
Create these (even if initially short):
- `src/features/ingestion/AGENTS.md`
- `src/features/zones/AGENTS.md`
- `src/features/scheduler/AGENTS.md`
- `src/features/export/AGENTS.md`

Each one should include:
- The responsibility of the feature (SRP)
- Allowed imports/dependencies
- “Pure logic must live in /lib and be unit tested”
- UI components should be dumb; logic in hooks/services

---

### 2) MVP Phases (execute in order; finish each phase before starting the next)

## Phase 1 — Project Skeleton + CSV Upload + Parsing
Goal: upload CSV, parse rows reliably, show “X jobs loaded”, and list the first 20 jobs.

#### Tasks
1. Create/confirm Next.js + TypeScript app structure (App Router).
2. Add a single page: `/dashboard`
3. Implement CSV upload component (client component).
4. Parse using `papaparse` (or equivalent minimal CSV parser).
5. Create internal types:
   - `JobRaw` (as parsed from CSV)
   - `Job` (normalized shape used by app)
6. Normalize fields:
   - Trim strings
   - Normalize postcode to string
   - Parse `Next Date` conservatively (don’t over-assume formats; store raw + parsed)
7. Store parsed jobs in local state (MVP: in-memory only).
8. Display:
   - Total job count
   - Table/list preview (ID, Contact Name, Street, City, Postcode, Technician Name, Next Date)

#### Acceptance criteria
- Uploading the sample CSV works without crashing.
- Jobs render with correct `ID` values.
- No external APIs involved.

#### Tests (minimum)
- Unit test for `normalizeJob(rawRow)`

Update `tests.json` with at least:
- `normalize_job`
- `parse_csv_headers`

---

## Phase 2 — Zone Clustering (Geographic “Seeing”)
Goal: cluster jobs into Zones by string heuristics: primarily `Address Postcode`, then `Address City`, then a street-based fallback.

#### Tasks
1. Implement pure functions:
   - `makeZoneKey(job): string`
   - `clusterJobsByZone(jobs): Zone[]` where `Zone = { key, postcode, city, streetsSample[], count, jobs[] }`
2. Add “Zones” panel:
   - Sorted by count desc
   - Show key info (e.g., `4556 / Sippy Downs — 14 jobs`)
3. Add a “Show jobs in zone” expandable view

#### Acceptance criteria
- Zones are stable and deterministic.
- A job always maps to exactly one Zone.
- Works even when some address fields are missing (graceful fallback key like `UNKNOWN`).

#### Tests (minimum)
- `makeZoneKey` edge cases (missing city/street)
- clustering deterministic ordering

---

## Phase 3 — Draft Month Plan Generator (No Drag-and-Drop yet)
Goal: generate a 4-week plan draft: assign each job to a day bucket, preferring to keep the same Zone together on the same day.

Important: This is not perfect routing—this is “practical grouping”.

#### Scheduling rules (MVP version)
- Create a planning window: 4 weeks starting from a chosen Monday (or “next Monday”).
- If a job’s `Frequency`/`Pattern` implies “every 4 weeks”, it should appear once in the 4-week window.
- If unclear, default to scheduling it once (flag as “needs review”).
- Try to:
  - Keep Zones together
  - Balance daily load (simple max jobs per day heuristic)
  - Optionally split by technician if `Technician Name` exists (initially keep existing technician assignment)

#### Tasks
1. Implement pure function `generateDraftPlan({ jobs, startDate, weeks=4 }): Plan`
2. Define:
   - `PlannedJob = Job & { plannedDate: YYYY-MM-DD, plannedWeekIndex, plannedDayIndex, flags: string[] }`
   - `Plan = { startDate, endDate, plannedJobs, unplannedJobs }`
3. Render plan as a simple 4-week grid (no DnD):
   - Columns: days
   - Rows: weeks
   - Each cell: list of job cards

#### Acceptance criteria
- Plan renders and contains most jobs (some may be “unplanned” with flags).
- Plan generation is deterministic for the same inputs.

#### Tests (minimum)
- “jobs assigned within window”
- “deterministic plan”
- “flags set when frequency unknown”

---

## Phase 4 — Drag-and-Drop Scheduler (Core MVP)
Goal: allow the owner to drag job cards between days (and optionally between technician lanes).

#### UI model (simple + SOLID)
- Keep UI state separate from domain plan generation.
- A drag updates `plannedDate` for that `PlannedJob` only.
- Don’t mutate original `Job` data; maintain a `PlanState`.

#### Tasks
1. Choose a DnD library (`dnd-kit` recommended).
2. Implement drag between day cells:
   - When dropped, update `plannedDate`
3. Add:
   - Undo (single-step) OR “Reset to draft”
   - Visual flags (e.g., red badge for “needs review”)
4. (Optional if easy) Technician lanes:
   - Each day cell has sub-columns per technician
   - Drag between technicians updates `plannedTechnicianName` (separate field; do not overwrite original unless exporting)

#### Acceptance criteria
- Dragging is stable and does not duplicate/lose jobs.
- Jobs remain keyed by `ID` in React lists (no index keys).
- After drag, exportable state reflects new dates.

#### Tests (minimum)
- Unit test for reducer/state update: `moveJob(jobId, fromDate, toDate)`

---

## Phase 5 — Export (CSV round-trip)
Goal: export a CSV the owner can use.

Export mode
- Mode B (PoolTrackr-like): overwrite `Next Date` (and possibly technician) while preserving all original columns

#### Tasks
1. Implement `exportPlanCsv(planState)` (Mode A)
2. Implement `exportPoolTrackrCsv(originalRows, planState)` (Mode B) carefully:
   - Preserve original header order when possible
   - Only change `Next Date` and technician-related fields if mapping is confirmed
3. Add “Download CSV” button(s)

#### Acceptance criteria
- Export downloads a valid CSV.
- `ID` preserved exactly.
- No accidental column loss in Mode B.

#### Tests (minimum)
- CSV contains correct number of rows
- IDs match input set
- Changed `Next Date` matches plan state for a moved job

---

### 3) Folder Structure (target; adjust to existing repo conventions)
- `src/features/ingestion/` (upload, parse)
- `src/features/zones/` (clustering)
- `src/features/scheduler/` (plan generation + DnD UI)
- `src/features/export/` (csv export)
- `src/lib/` (pure functions: normalize, clustering, planning, export formatting)

---

### 4) Output Requirements (how you should respond while working)
For each phase:
1. Brief plan for the phase (3–7 bullets max)
2. Files you will create/modify
3. Implementation
4. Commands to run (dev + tests)
5. Update `progress.txt` + `tests.json`

If anything is ambiguous (e.g., exact PoolTrackr import format for updates), implement the safe MVP path (Mode A export) and leave Mode B behind a clearly labeled “experimental” toggle.

---

### 5) Start Now
Begin with **Phase 1** and **AGENTS.md creation**. Do not start Phase 2 until Phase 1 acceptance criteria pass and `progress.txt` / `tests.json` are updated.