# Remaining work â€” three-person split

Updated 2026-10-12 after pulling teammates' backend/frontend commits and reviewing against the SRS. The current team is Sambhav plus two other teammates.

| Person | Current file | Responsibility |
|---|---|---|
| Sambhav | [01_Sambhav_AI_Desktop.md](../01_Sambhav_AI_Desktop.md) | AI, Clef, native Windows services, diagnostic collector |
| Teammate 1 | [QA assignments](../04_Factory_Automation_QA.md) | Frontend and user-flow QA |
| Teammate 2 | [QA assignments](../04_Factory_Automation_QA.md) | Backend, factory, session integration and QA |

`02_App_Integration_QA.md` is an index to the two teammate assignments. The earlier two-person consolidation is superseded.

## What remains from the old files

| Original assignment | Present in code | Still needed | New owner |
|---|---|---|---|
| `01_AI_Sambhav.md` | Providers, schemas, repair/screenshot services, fixtures and AI tests | Backend integration; Clef; native desktop planning/selection; safety/failure verification | Sambhav, API handoff with Teammate 2 |
| `02_Frontend.md` | React screens, API client, polling and sample mode | Real maintenance completion; visible network errors; native desktop UI; live persistence/flow checks | Teammate 2 |
| `03_Backend.md` | FastAPI, SQLite, jobs, CRUD, scheduling, alerts and impact | Finish merge; case/job association; validated dates; honest provider failures; replacement impact; desktop contract/session routes | Teammate 2 |
| `04_Factory_Automation_QA.md` | Factory rules currently in backend routes; browser stub | Actual native desktop adapter; diagnostic collector; factory edge/concurrency tests and demo validation | Sambhav: desktop/collector; Teammate 2: factory/QA |

## Review evidence and status

Reviewed teammate commits `9b78c6d` (backend) and `7df5fa8` (frontend), against scaffold `4c042a9`. Your AI work was saved in `2492dea` on `codex/ai`. Main pulled successfully; the interrupted merge is resolved as part of this handoff commit. Check Git status before starting branch work.

Confirmed issues: missing maintenance completion timestamp; global active-analysis job lookup; live failures replayed against mocks; fabricated provider/browser results; replaced devices retained in impact; timestamps accepted without offset/date validation. See Teammate 2's tasks for fixes. AI fallback removal and ORM record adaptation were started in the current working tree; verify their integrated behavior; do not count untested acceptance checks as complete.

## Execution order

1. Teammate 2 finishes the current merge and immediate integration failures. Sambhav defines the Clef/Windows service interfaces in parallel with that work.
2. Both agree and update the desktop SRS contract, including the status of the original browser feature.
3. Sambhav builds a single-window Calculator proof with actual input and verified result. Teammate 2 adds the matching session API/UI and Stop.
4. Sambhav adds diagnostic/repair workflows; Teammate 2 fixes factory/persistence issues and runs cross-module checks.
5. Both rehearse the real demo and record passed checks, remaining limitations and sample/live labels.

The QA file now contains both other teammates' current assignments; the other original assignments are superseded. Clef/desktop code is not implemented yet; frontend/backend scaffolding is not equivalent to a verified complete application.

## Checks for this handoff

17 AI tests and four isolated-database backend smoke tests passed. The existing repair/browser success tests were deselected because they assume stub success; Teammate 2 must update them with explicit mocked-provider success and unavailable-provider behavior. Frontend build and end-to-end desktop verification remain pending.
