# Repair Before Replace — Project Structure

This repository is organised for four people building the five-hour MVP described in [00_SRS.md](00_SRS.md). The folders are scaffolded; application code and dependency configuration still need to be implemented. `.gitkeep` files preserve empty folders in Git.

## Directory layout

```text
Repair Before Replace/
├── 00_SRS.md                         # Authoritative requirements and API contract
├── 01_AI_Sambhav.md                  # Person 1 assignment
├── 02_Frontend.md                    # Person 2 assignment
├── 03_Backend.md                     # Person 3 assignment
├── 04_Factory_Automation_QA.md        # Person 4 assignment
├── PROJECT-STRUCTURE.md              # This guide
├── frontend/
│   └── src/
│       ├── api/                     # Typed API client and job polling
│       ├── components/              # Shared UI components
│       ├── features/
│       │   ├── assets/              # Asset list and editing
│       │   ├── repair/              # Cases, analysis, steps and outcomes
│       │   ├── computer-assistance/ # Screenshot, browser and diagnostics tabs
│       │   ├── factory/             # Maintenance, training and production
│       │   ├── alerts/              # Alert panel, acknowledgement and sound
│       │   └── impact/              # Confirmed repairs and retained mass
│       └── types/                   # TypeScript API types
├── backend/
│   └── app/
│       ├── api/                     # All FastAPI HTTP routes
│       ├── models/                  # Canonical Pydantic schemas
│       ├── db/                      # SQLite persistence and transactions
│       ├── jobs/                    # Background job execution and lifecycle
│       └── services/
│           ├── ai/                  # Provider, prompts and structured analysis
│           ├── factory/             # Conflict rules, recurrence and alerts
│           └── automation/          # Playwright browser adapter
├── scripts/                         # Read-only diagnostic collector
├── tests/
│   ├── ai/
│   ├── backend/
│   ├── factory/
│   └── automation/
├── fixtures/
│   ├── ai/
│   ├── backend/
│   ├── factory/
│   └── automation/
└── docs/                            # Setup, integration and demo documentation
```

## Ownership

| Person | Owned paths | Responsibilities |
|---|---|---|
| 1 — Sambhav | `backend/app/services/ai/`, `tests/ai/`, `fixtures/ai/` | Gemini provider integration, repair assessment, screenshot advice and structured output validation. |
| 2 — Frontend | `frontend/` | React + TypeScript + Vite screens, API client, job polling, factory forms, alerts and impact display. |
| 3 — Backend and integration lead | `backend/app/api/`, `backend/app/models/`, `backend/app/db/`, `backend/app/jobs/`, future `backend/app/main.py`, `tests/backend/`, `fixtures/backend/` | HTTP contract, database writes, uploads, jobs, seed/reset, impact calculation and integration. |
| 4 — Factory, automation and QA | `backend/app/services/factory/`, `backend/app/services/automation/`, `scripts/`, corresponding tests and fixtures | Scheduling rules, alert evaluation, browser execution, diagnostic collector and demo acceptance checks. |

The backend lead coordinates shared root configuration and documentation. Each member supplies their own dependency and environment requirements. Coordinate before changing another member's files.

## Integration boundaries

- Frontend calls FastAPI at `/api/v1` through one typed API client.
- Backend calls AI and automation service functions inside the same Python application; separate services are unnecessary for this MVP.
- Backend owns every SQLite write, generated ID and transaction. Factory functions return conflict results or alert candidates for the backend to persist.
- AI returns typed analysis or explicit errors; it does not update cases directly.
- `00_SRS.md` is authoritative for routes, fields, enums, scheduling rules and errors. Agree and document contract changes before implementing them.
- Frontend can start against labelled fixtures that match the contract while backend work proceeds.
- Keep secrets in the backend environment. Never expose `GEMINI_API_KEY` through frontend configuration.

## Configuration to add during implementation

| File | Owner | Purpose |
|---|---|---|
| `frontend/package.json` and Vite/TypeScript configuration | Person 2 | Frontend dependencies and build commands. |
| `backend/pyproject.toml` or `backend/requirements.txt` | Person 3, with team input | Backend, AI, Playwright and testing dependencies. Choose one dependency approach. |
| `backend/app/main.py` | Person 3 | FastAPI entry point. |
| `scripts/collect_diagnostics.py` | Person 4 | Local diagnostic JSON collection. |
| `.env.example` | Person 3, with team input | Placeholder settings for `GEMINI_API_KEY`, `GEMINI_MODEL` and `VITE_API_BASE_URL`. |
| `.gitignore` | Person 3 | Exclude secrets, dependencies, generated databases, uploads and build output. |
| `README.md` | Person 3, with team input | Verified setup, startup, seed/reset and demo instructions. |

Planned local addresses: frontend `http://localhost:5173`, backend `http://localhost:8000`, API `http://localhost:8000/api/v1`, OpenAPI `http://localhost:8000/docs`.

## Four-person workflow

1. Use separate branches: `codex/ai`, `codex/frontend`, `codex/backend` and `codex/factory-automation`.
2. In the first 20 minutes, agree schemas, service signatures and fixtures; verify Gemini access and Playwright availability.
3. Integrate the first end-to-end repair case at 90 minutes.
4. Integrate all modules at three hours, then freeze features.
5. Run the acceptance checks in `00_SRS.md`, fix integration failures and rehearse the three-minute demo.

Tests and fixtures belong to their matching module owner. Person 4 coordinates cross-module acceptance checks; the backend lead coordinates merges. Commit small, reviewable changes and keep sample data visibly labelled.
