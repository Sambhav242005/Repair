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

## Syllabus planner and companion — 2026-10-12

- [x] Replace iFixit branding with software/equipment troubleshooting language.
- [x] Upload text PDF, DOCX, TXT, Markdown or CSV; read text locally and allow manual editing.
- [x] AI topic organization with exact source excerpts and editable lecture/preparation estimates.
- [x] One-click syllabus demo with eight lectures, six-month dates, weekly class times, a sample holiday, and an automatic draft preview.
- [x] Fix report form diagnostic ownership when equipment changes, including late upload responses; live ThinkPad-to-Dell regression saved a clearly labelled QA case successfully.
- [x] Semester dates, weekly timetable slots, reviewed holiday dates, capacity warning and deterministic lecture allocation.
- [x] Save reviewed plans atomically as class sessions; detect identical plans, reject teacher conflicts and avoid duplicate publication.
- [x] Topic/preparation reminders in the existing alert bell with 15-minute, one-hour or one-day lead times.
- [x] Separate paired Windows companion with loopback-only listener, exact website origin, rotating pairing code, Host validation and action audit.
- [x] Current-user installed-app discovery, four approved app launches, named read-only diagnostic checks, and paired Clef/Gemma native-session endpoints.
- [x] Setup guide and launch script: [Teaching and companion setup](TEACHING_AND_COMPANION.md).
- [x] [Mac teammate setup](MAC_TEAMMATE_SETUP.md), shell launcher, Apple model adapter, application list, approved Mac app launches and diagnostic support.
- [ ] Run the Mac companion on a physical Mac and record the acceptance checklist in the setup guide; Mac adapter tests here use mocks.
- [x] Live website test: sample syllabus/holiday upload, Ollama source-backed outline, and six-month preview (8 lectures, 25 usable slots, holiday excluded). Sample plan remains a draft; no sample classes were published.
- [x] Live companion pairing, Dell G3 3579 model detection, 113 Start-menu apps, formatted system report, Calculator launch request, and supported native-window discovery.
- [ ] Ship and sign an installer with a tray UI; current companion is source-run.
- [ ] Validate the actual hosted HTTPS website and its browser local-network permission flow; localhost pairing is verified.
- [ ] Add OCR/image and legacy document support; current scan-only PDFs return a clear OCR/paste-text instruction.
- [ ] Add calendar import for non-ISO holiday dates and existing timetable documents; currently weekly slots are entered manually.
- [ ] Add email/phone or background OS notifications if required; current reminders are workspace alerts while the backend runs.
- [ ] Add reviewed general-terminal command proposals if needed; current companion runs named diagnostic checks only.

Historical verification above describes the earlier integration pass. Latest verification: **80 backend tests passed**, **18 frontend tests passed**, and the frontend TypeScript/Vite build passed. One existing Starlette status-constant deprecation warning remains.
