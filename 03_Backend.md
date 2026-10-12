# Member 3 — Backend, Database and Integration Lead

> Superseded: use [Person 2 — App Integration and QA](02_App_Integration_QA.md). This original four-person assignment is historical. See [remaining work](docs/REMAINING_WORK.md).

## Shared contract
Read `00_SRS.md` before coding. Its schemas, routes and enums are authoritative. Changes must be agreed by frontend and backend owners and updated there before implementation. Target: five hours, four members.

## Owned paths
`backend/app/api/, backend/app/models/, backend/app/main.py`
Do not edit another member’s owned files without coordination. Work on a separate branch and integrate at 90 minutes and three hours.

## Your deliverables
- FastAPI application, exact /api/v1 endpoints from SRS, Pydantic models and OpenAPI.
- SQLite schema and seed/reset command, CRUD and input validation.
- Async job registry, task execution and persisted results. On restart mark unfinished jobs failed with retry guidance rather than leave them running forever.
- Screenshot storage/imported diagnostic persistence, alerts/history and impact aggregation.
- CORS limited to demo frontend origin, environment setup and integration README.

## Service boundaries
AI owner supplies assess_case and explain_screenshot; factory/automation owner supplies browser adapter, read-only collector, conflict checks and alert evaluation. You expose these through routes and own all DB writes. Give both owners repository interfaces or pass plain typed records; avoid two separate SQLite writers. Persist alerts with unique constraint on entity_type/entity_id/kind. Complete maintenance and create next recurrence in one transaction; compare current status to prevent duplicates.

## Data and error rules
Use IDs and enums exactly from SRS. Validate asset/upload relationships and foreign keys. Jobs run outside request response, return 202. Failed analysis resets case to open. Do not return generated fixtures as live provider results. Limit screenshot and diagnostic sizes. Calculate retained mass deterministically and deduplicate assets. Reject invalid ranges and wrap API errors in the canonical error envelope, including FastAPI validation errors.

## Work order
First 20 minutes: publish Pydantic types, route skeleton and seed fixtures. Hour 1: assets/cases/jobs plus first real AI call. Hour 2: uploads, diagnostics, step/outcome writes. Hour 3: factory endpoints, scheduler and alert persistence. Hour 4: run acceptance tests with other members. Hour 5: clean reset and startup rehearsal.

## Done criteria
GET /docs matches shared contract; frontend can complete a case end to end. All factory writes survive reload. Duplicate completion and overlapping jobs reject correctly. Alert polling does not duplicate rows. Supply one startup sequence and smoke-check script. Own merging and integration, with 90-minute and 3-hour checkpoints.
