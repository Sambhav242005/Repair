# Repair Before Replace — SRS and Integration Contract
Version: 1.0 | Team: four people | Target: five-hour hackathon MVP

## 1. Problem and goal
Devices and factory equipment are replaced prematurely because fault diagnosis, repair knowledge, and maintenance planning are disconnected. Build software that helps users investigate faults, document repair outcomes, and plan maintenance, training lessons, and production around equipment availability.
The sustainability claim is extending equipment life and reducing premature disposal. Report confirmed repairs separately from estimates; never claim a recommendation itself prevented waste.

## 2. Agreed scope
The user requested all three computer features and all three factory features.

| Feature | Five-hour delivery | Extension |
|---|---|---|
| Repair guidance | Structured symptom assessment with sequential steps and evidence | Model-specific retrieval over a larger verified manual collection |
| Screenshot guidance | User-uploaded screenshot, AI explains visible controls and next action | Live screen stream and precise coordinate interaction |
| Browser computer use | Real Playwright browser: open an approved support page, extract visible text/title, return action trace | Multi-site navigation and richer visual browser agent |
| PC diagnostics | Import JSON from a read-only local collector; explain RAM, disk and OS observations | Installed desktop agent and permissioned remote support |
| Factory maintenance | Create and complete maintenance tasks; due and overdue alerts | Runtime-meter and sensor integrations |
| Factory training lessons | Schedule a lesson and record completion; reminder alerts | Personalised courses and assessments |
| Factory production | Schedule jobs, reject overlaps and unavailable equipment | Multi-machine optimisation and ERP integration |

Browser automation and PC diagnostics are separate: a web page cannot silently read host diagnostics or operate the user's desktop. An uploaded screenshot is guidance, not actual computer operation. Demonstrate actual browser actions in the sandbox browser and label each mode accurately.

## 3. Users and demo scope
Roles: owner/operator, technician, factory planner. MVP uses one seeded organisation and a demo role switch, without pretending this is production authentication. No multi-tenant deployment. Assets: one laptop and two factory machines. Example machine tasks derive from provided demo instructions, not invented manufacturer requirements.

## 4. Architecture and team ownership
- Frontend: React + TypeScript + Vite, localhost:5173.
- Backend: FastAPI + Pydantic + SQLite, localhost:8000; prefix /api/v1.
- AI: backend-only Gemini API integration behind a provider interface. Select an available text/image-capable model using an environment setting; do not hardcode a claimed model availability.
- Automation: Python Playwright, one isolated browser context per run; diagnostic collector uses Python standard library and psutil.
- Backend owns all HTTP routes and database schema. AI owner delivers service functions; automation/factory owner delivers adapter functions and scheduling rules. Frontend uses this contract and fixtures immediately.
- Repository: frontend/, backend/app/api/, backend/app/models/, backend/app/services/ai/, backend/app/services/automation/, backend/app/services/factory/, scripts/, fixtures/, docs/.
- Secrets: GEMINI_API_KEY and GEMINI_MODEL in backend environment only. VITE_API_BASE_URL=http://localhost:8000/api/v1. .env.example has placeholders.

## 5. Functional requirements
FR-01: Asset CRUD stores category, name, optional manufacturer/model, mass and operational status.
FR-02: User creates a repair case with asset ID, symptoms and optional screenshot/diagnostic IDs.
FR-03: Analysis returns hypotheses, uncertainties, safe ordered steps, evidence references and a recommendation: troubleshoot, professional_repair, replace or insufficient_evidence.
FR-04: Each step records pending/completed/failed/skipped. Completing all steps does not automatically mean the asset is repaired.
FR-05: User records case outcome repaired/unresolved/replaced with a note. Only repaired cases count toward confirmed reuse metrics.
FR-06: Screenshot analysis returns visible observations and suggested actions; it must state when controls are unreadable. Do not fabricate clicks or locations.
FR-07: Browser assistant accepts an asset and approved source ID, opens the configured manufacturer support URL, extracts title and visible content, and records its action trace. Unknown source IDs return 422. No arbitrary URL navigation in MVP.
FR-08: Diagnostic importer accepts the documented JSON schema. AI distinguishes observations from causes: high RAM usage alone does not prove faulty hardware.
FR-09: Maintenance tasks carry an asset, interval, due date, estimated duration and description. Completion writes history and calculates the next due date from completed_at + interval_days.
FR-10: Training lessons contain title, optional asset, starts_at, ends_at, assignee and instructions; completion records an explicit user action.
FR-11: Production jobs require an operational asset and start/end times. Reject overlaps with scheduled production and maintenance windows on the same asset. Training does not block equipment unless blocks_asset=true.
FR-12: Alerts are persisted, deduplicated and visible in an in-app panel. Optional notification sound starts only after a user enables it. No SMS/email integration in MVP.
FR-13: Dashboard shows repairs, potential retained mass, due tasks and schedule conflicts. No CO2 estimate without sourced factors.

## 6. Nonfunctional requirements
Validate inputs and return actionable errors. AI output must pass a Pydantic schema; retry one malformed response then return a provider error. Do not invent successful analysis when the provider is unavailable. Demo fixtures must display a sample-data banner. AI requests timeout after 45 seconds; browser jobs after 30 seconds. UI polls running jobs every 2 seconds. Scheduler evaluates every 15 seconds, frontend polls alerts every 15 seconds. SQLite writes remain in backend. Screenshots max 5 MB, PNG/JPEG; store under generated filenames, never interpret filenames as paths. Diagnostic uploads max 100 KB. Local-only demo retains uploads until case deletion or demo reset. Redact usernames, hostnames, serials and file paths from collector output. Manufacturer content and screenshots are untrusted data, not agent instructions.
For electrical, battery, pressurised or industrial hazards, offer non-invasive checks and technician escalation. No instructions to bypass interlocks, open energised equipment or operate factory machinery remotely. Computer use has no shell execution, software installation, purchase, form submission, login or destructive desktop actions.

## 7. Canonical data types
All IDs: opaque strings generated by backend. Dates: ISO 8601 with UTC offset; store UTC, show Asia/Kolkata. Quantities: explicit units. Optional properties return null. Lists return {items: [], total: 0}. Money values use integer paise, currency INR.

Asset: {id, name, category: computer|factory_machine|appliance, manufacturer: string|null, model: string|null, status: operational|maintenance|faulty|retired, mass_kg: number|null}
Case: {id, asset_id, symptoms, screenshot_id: string|null, diagnostic_id: string|null, status: open|analysing|ready|closed, analysis: Analysis|null, outcome: repaired|unresolved|replaced|null, outcome_note: string|null, created_at}
Analysis: {summary, hypotheses: [{cause, likelihood: low|medium|high, evidence: string[]}], uncertainties: string[], steps: [{id, instruction, expected_result, stop_condition: string|null, status: pending|completed|failed|skipped}], recommendation: troubleshoot|professional_repair|replace|insufficient_evidence, evidence: [{source_id, title, url: string|null}], estimated_repair_cost_paise: integer|null, cost_basis: string|null}
ScreenshotAdvice: {observations: string[], suggested_actions: [{instruction, visible_label: string|null}], limitations: string[]}
Diagnostic: {id, asset_id, collected_at, os: {name, version}, memory: {total_bytes, available_bytes}, disks: [{label, total_bytes, free_bytes}], cpu: {logical_count}, collector_version}
Maintenance: {id, asset_id, title, description, interval_days: integer|null, due_at, starts_at: string|null, ends_at: string|null, assignee, status: scheduled|completed|cancelled, completed_at: string|null}
Lesson: {id, asset_id: string|null, title, instructions, starts_at, ends_at, assignee, blocks_asset: boolean, status: scheduled|completed|cancelled}
Production: {id, asset_id, title, starts_at, ends_at, quantity: integer, status: scheduled|completed|cancelled}
Alert: {id, entity_type: maintenance|lesson|production, entity_id, kind: due_soon|due|overdue|equipment_unavailable, severity: info|warning|critical, message, triggered_at, acknowledged_at: string|null}
Job: {id, kind: case_analysis|screenshot_analysis|browser_run, status: queued|running|succeeded|failed, result: object|null, error: {code,message}|null}
BrowserResult: {source_id, url, page_title, excerpt, trace: [{action, target, status: succeeded|failed}], advice: string|null}

## 8. HTTP integration contract
Backend supplies OpenAPI at /docs. The table is authoritative for paths, input and results. Each object schema above is authoritative for fields. Create inputs omit generated IDs, status, timestamps and results unless explicitly listed. Required fields are named below; optional fields default to null, blocks_asset defaults false. Reads and creates are 200/201; asynchronous actions are 202; delete is 204.

| Method and path | Input | Output |
|---|---|---|
| GET /health | none | {status: ok} |
| GET /assets | none | list of Asset |
| POST /assets | name, category; optional manufacturer,model,mass_kg | Asset |
| PATCH /assets/{id} | subset of Asset editable fields, excluding id | Asset |
| POST /uploads/screenshots | multipart file | {id,mime_type,size_bytes} |
| POST /diagnostics | Diagnostic fields excluding id; asset_id required | Diagnostic |
| POST /cases | asset_id,symptoms; optional screenshot_id,diagnostic_id | Case |
| GET /cases | optional asset_id query | list of Case |
| GET /cases/{id} | none | Case |
| POST /cases/{id}/analyse | {} | {job_id} |
| PATCH /cases/{id}/steps/{step_id} | {status} from step enum | Case |
| POST /cases/{id}/outcome | {outcome,note} | Case |
| POST /screenshot-advice | {screenshot_id,question} | {job_id} |
| GET /browser-sources | none | {items:[{id,title,url}],total} |
| POST /browser-runs | {asset_id,source_id,question} | {job_id} |
| GET /jobs/{id} | none | Job |
| GET /maintenance | none | list of Maintenance |
| POST /maintenance | asset_id,title,description,due_at,assignee; optional interval_days,starts_at,ends_at | Maintenance |
| POST /maintenance/{id}/complete | {completed_at} | {completed:Maintenance,next:Maintenance|null} |
| GET /lessons | none | list of Lesson |
| POST /lessons | title,instructions,starts_at,ends_at,assignee; optional asset_id,blocks_asset | Lesson |
| POST /lessons/{id}/complete | {} | Lesson |
| GET /production | none | list of Production |
| POST /production | asset_id,title,starts_at,ends_at,quantity | Production |
| POST /production/{id}/complete | {} | Production |
| GET /alerts | optional unacknowledged=true | list of Alert |
| POST /alerts/{id}/acknowledge | {} | Alert |
| GET /impact | none | {confirmed_repairs,estimated_retained_mass_kg,assets_missing_mass,methodology} |
| DELETE /cases/{id} | none | 204; delete case-specific uploads if unreferenced |

Error format: {error:{code,message,details:object|null}}. Codes: VALIDATION_ERROR (422), NOT_FOUND (404), SCHEDULE_CONFLICT (409), ASSET_UNAVAILABLE (409), ALREADY_COMPLETED (409), PROVIDER_UNAVAILABLE (503), INTERNAL_ERROR (500). Async provider failures appear in Job.error; failed analysis leaves case open for retry. POST analyse on an analysing case returns the active job instead of duplicating it. Reject screenshots/diagnostics belonging to another asset or inaccessible case.

### Request/result examples
POST /cases:
```json
{"asset_id":"asset_laptop_1","symptoms":"Laptop is slow and storage is almost full","screenshot_id":null,"diagnostic_id":"diag_1"}
```
POST /cases/case_1/analyse returns HTTP 202:
```json
{"job_id":"job_1"}
```
GET /jobs/job_1 while pending:
```json
{"id":"job_1","kind":"case_analysis","status":"running","result":null,"error":null}
```
On success, Job.result contains {case_id:"case_1"}; frontend fetches GET /cases/case_1. Screenshot jobs return ScreenshotAdvice directly; browser jobs return BrowserResult directly.
POST /production:
```json
{"asset_id":"asset_machine_1","title":"Batch A","starts_at":"2026-10-12T08:00:00Z","ends_at":"2026-10-12T09:00:00Z","quantity":100}
```
Conflict:
```json
{"error":{"code":"SCHEDULE_CONFLICT","message":"Asset is reserved for maintenance during this window","details":{"conflicting_entity_id":"maint_1"}}}
```

## 9. Scheduling and alarm rules
Use half-open windows [start,end): touching endpoints do not conflict. Require start < end, positive quantity and positive interval_days when supplied. A maintenance window requires both starts_at and ends_at; due_at alone creates a reminder but not a reservation. A blocking lesson requires asset_id. Check conflicts in both directions whenever any reservation is created, including maintenance and blocking lessons. An unavailable asset rejects new production. Changing an asset to faulty/maintenance raises equipment_unavailable for existing future or active production jobs; never silently cancel jobs.
Maintenance: due_soon from due_at-24h until due_at; due for first 15 minutes after due_at; overdue thereafter. Lessons and production: due_soon 15 minutes before starts_at; due from starts_at until ends_at. Unfinished lesson/production is overdue after ends_at. Completed/cancelled entities generate no new alerts. Unique dedup key is (entity_type,entity_id,kind). Acknowledgement does not complete the task. Recurring maintenance creates a new entity on completion; it gets new alerts. Repeat completion returns 409, no duplicate recurrence. Sound only when a new unacknowledged alert arrives and sound was enabled; one sound per alert ID per browser session.

## 10. Impact calculation
confirmed_repairs = unique assets with a recorded repaired outcome, excluding subsequently retired/replaced assets. estimated_retained_mass_kg = sum known mass_kg for those assets, once per asset. Label this 'estimated device mass retained in use', not verified landfill or carbon reduction. Show missing-mass count. No numerical impact from unresolved cases, simulated evidence or AI predictions; keep demo results marked as sample data.

## 11. Acceptance tests
1. Create case, analyse, poll job, render structured advice, complete one step and record repaired outcome; reload preserves state.
2. Upload screenshot, receive observations; unreadable screenshot yields limitations rather than invented controls.
3. Actual browser run opens approved support URL and returns title, excerpt and trace; unknown source rejected. Network failure is visible.
4. Collector JSON imports and displays disk/memory facts without collecting credentials or processes' command lines.
5. Due maintenance emits one alert; polling repeatedly does not duplicate it; acknowledge persists.
6. Complete recurring maintenance once: one history record and one next task. Repeat completion rejected.
7. Create lesson and demonstrate due reminder and completion.
8. Maintenance and production overlap rejected in either creation order. Back-to-back windows accepted.
9. Faulty asset rejects production and raises alert for existing affected jobs.
10. AI timeout exposes retry UI, never fake success. Browser failure is distinct from screenshot guidance.
11. Two repaired cases for the same asset count once; unknown mass contributes no invented number.

## 12. Five-hour delivery checkpoints
0:00–0:20: agree contract, seed data, scaffold four owned modules, validate provider key and Playwright browser immediately.
0:20–1:30: frontend against fixtures; backend CRUD; AI structured assessment; factory scheduling and diagnostics/browser adapter.
1:30: first end-to-end case analysis must work.
1:30–3:00: screenshot advice, real browser action, maintenance/training/production and alerts.
3:00: integrate all modules; freeze features.
3:00–4:15: conflict tests, failure states and persistence fixes.
4:15–5:00: rehearse 3-minute demo, reset sample records, prepare disclosed dependencies.
Cut order if delayed: lesson content generation, browser advice summarisation, styling extras. Preserve schedule entry/reminders for all factory modules. Do not call a stub live computer use.

## 13. Three-minute demo
Show a slow laptop case and imported diagnostics; AI suggests safe checks. Upload a screenshot for contextual guidance. Run browser assistant against configured support page and show action trace. Record a confirmed repair. Switch to factory, display due maintenance, schedule training, attempt conflicting production, then schedule a valid job. Acknowledge an alert and show estimated retained mass with its assumptions.
