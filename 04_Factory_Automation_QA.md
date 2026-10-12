# Tasks for the two teammates other than Sambhav

Current team: three people. Sambhav owns AI, Cloudflare Clef, native Windows desktop services and the diagnostic collector in `01_Sambhav_AI_Desktop.md`. The two teammates below own application integration and QA. Names were not supplied, so they are labelled Teammate 1 and Teammate 2.

Read `00_SRS.md` first. Agree native desktop session schemas with Sambhav before adding endpoints or UI. Browser automation is not a substitute for the requested desktop control.

## Teammate 1 — Frontend and user-flow QA

Owned paths: `frontend/`, frontend handover documentation and frontend tests. Suggested branch: `codex/frontend-qa`.

Do these in order:

- [ ] Commit 9be960e sends maintenance completion timestamps; verify the real flow: send `completed_at` with an explicit UTC offset; verify the real API creates the next recurring task.
- [ ] Commit 9be960e removed automatic live-to-mock replay; verify disconnected/invalid-response behavior. Show a network error and retry; sample mode must be explicitly selected and visibly labelled.
- [ ] Connect the existing repair form, screenshot upload and diagnostic import to real backend responses. Show provider failures and preserve saved cases after reload.
- [ ] Commit 9be960e added Desktop Assistance UI/client calls; align them with the backend and local acceptance/window contract, then verify: selected app, goal, Start, progress, actual action trace, Stop, failure/retry and verified completion.
- [ ] Distinguish screenshot advice from actions actually performed. Do not display synthetic action traces as live desktop activity.
- [ ] Verify schedule conflict messages, lesson/production completion, alert acknowledgement and user-enabled sound once per new alert.
- [ ] Check mobile layout, keyboard access, long AI text and Asia/Kolkata date display.
- [ ] Run the frontend build and document real flow checks. Replace unsupported Verified claims in `docs/02_Frontend_Handover.md` with evidence or pending status.

Acceptance: a real maintenance completion succeeds; a disconnected backend cannot produce mock write success; desktop Stop/status render correctly; saved backend records survive reload; failures are actionable.

## Teammate 2 — Backend, factory and integration QA

Owned paths: `backend/app/api/`, `backend/app/models/`, `backend/app/db/`, `backend/app/jobs/`, `backend/app/core/`, `backend/app/main.py`, `backend/app/services/factory/`, `tests/backend/`, `tests/factory/`, shared config and backend documentation. Suggested branch: `codex/backend-qa`.

Do these in order:

- [ ] Verify merged real AI calls: ORM assets become plain records; diagnostic payload JSON is decoded; provider error codes reach failed jobs; failed analysis resets cases to open. Align backend environment/dependencies with Gemini/Ollama selection.
- [ ] Teammate commit d39af30 added job entity_id and case filtering; finish migration for existing SQLite databases and test two simultaneous cases plus retry of the first.
- [x] Sambhav replaced fake browser success with an explicit unavailable error. Keep fixtures labelled; Teammate 2 still verifies the failed job through the API/UI.
- [ ] Validate offset-aware ISO dates and normalize UTC for collection, due dates, reservation windows and completion. Reject malformed/naive input with 422; alerts must remain usable.
- [ ] Fix retained impact after replacement. Record reliable outcome chronology; exclude assets subsequently replaced/retired without relying only on case creation time.
- [ ] Agree desktop session contract with Sambhav and Teammate 1, update `00_SRS.md`, then implement session IDs, job/status/trace persistence, Stop and provider failure handling around Sambhav's adapter.
- [ ] Test factory conflicts in both creation orders, touching boundaries, blocking lessons and unavailable assets.
- [ ] Verify recurring maintenance atomically, including duplicate/concurrent completion. Test alerts with an injectable clock, deduplication and acknowledgement persistence.
- [ ] Verify restart recovery makes affected cases retryable; validate screenshot references, upload size/format and deletion cleanup.
- [ ] Isolate test database/upload paths; run backend/AI tests and smoke checks with explicitly mocked offline providers plus real failure tests.
- [ ] Maintain verified setup/reset instructions and coordinate final integration/demo with both others.

Acceptance: concurrent cases use correct jobs; bad dates return 422; replaced assets stop counting; factory/alert data persists; desktop API/UI contract matches; no fake live success; checks and limitations are recorded.

## Shared handoffs

1. Sambhav delivered the typed local desktop contract in `backend/app/services/automation/models.py`, the runner and SRS amendment. Teammate 2 implements session registry/persistence and any agreed local-only API around it; Teammate 1 integrates the React flow. See the automation README.
2. First desktop proof is one selected Calculator control, actual input, independently verified display and working Stop.
3. Rehearse together: repair assessment, actual desktop action, saved outcome, factory conflict/recurrence, alert acknowledgement and impact.
4. Keep separate branches and small commits; integrate through main without force-pushing or changing another person's owned files without coordination.

The previous four-person assignment is superseded. Existing scaffolding is not evidence that all acceptance checks pass. The original reviewed issues are listed in `docs/REMAINING_WORK.md`.
