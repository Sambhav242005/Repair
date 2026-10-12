# Remaining work — single owner

Updated 2026-10-12. Sambhav owns the remaining acceptance work. Teammate integration items previously listed here have been implemented in the current working tree and are no longer separate assignments.

## Delivered in this pass

- [x] Integrated backend corrections and regression coverage for case/job lifecycle, timestamp validation, factory scheduling, alert deduplication, impact chronology, upload validation/cleanup, and desktop session recovery/persistence.
- [x] Added local-only native desktop session endpoints for window selection, inspection, explicit approval, bounded execution, Stop, and structured debug history.
- [x] Reworked the application around college faculty workflows: report a problem, review case guidance, plan classes and lab equipment, and inspect system reports.
- [x] Replaced fake repair examples and hardcoded device/repair scores with live record counts and case-backed evidence.
- [x] Removed mass and kg from routine teacher repair/equipment screens; kept technical material accounting outside the classroom workflow.
- [x] Replaced the browser-assistance tab with native desktop use; sample mode cannot report native actions as successful.
- [x] Corrected `datetime-local` conversion so dates entered by faculty are interpreted in Asia/Kolkata independent of the browser machine timezone.
- [x] Added frontend test command and made the date tests assert the Kolkata-to-UTC conversion.

## Remaining acceptance checklist

- [x] Run the backend regression suite and frontend tests/build after the final edits; record the actual results below.
- [x] Start both local services and verify the faculty UI loads against the live API.
- [ ] When Calculator is open, run a real selected-window acceptance: inspect, review the proposed action, approve it, confirm the displayed value, then verify Stop prevents further input. The user deferred opening Calculator until later, so this step is intentionally pending.
- [ ] If a live native run fails, fix the cause and rerun the real acceptance; do not mark model/provider simulation as PC-action proof.
- [ ] Optional: verify read-only Settings and Task Manager inspection on the intended Windows machine.

## Verification log

- Backend: `python -m pytest -q` — **61 passed**, one Starlette deprecation warning.
- Frontend: `pnpm test` — **10 passed**; `pnpm build` — **passed** (`tsc` and Vite production bundle).
- Local run: FastAPI `/api/v1/health` returned `ok`; Vite served the faculty workspace at `http://localhost:5173/`; diagnostics list and the read-only native-window list responded. The UI showed the cases and class-planning workflows. No native input was sent.
- Live Calculator action/value/Stop proof remains pending until the user is ready for that interactive test. Automated provider tests and a listed window are not PC-action acceptance.

## Owner and handoff

**Owner: Sambhav.** The files `01_Sambhav_AI_Desktop.md` and `04_Factory_Automation_QA.md` retain implementation detail and historical team assignments. This file is the one current checklist; it does not assign work to unnamed teammates.
