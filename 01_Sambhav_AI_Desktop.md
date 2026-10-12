# Person 1 â€” Sambhav: AI, Clef and native Windows computer use

This is the current assignment. The current team has Sambhav plus two teammates. Their detailed assignments are in `04_Factory_Automation_QA.md`. Read `00_SRS.md` and `backend/app/services/ai/COMPUTER_USE_DECISIONS.md` first. The user selected actual desktop control and Cloudflare Clef; browser-only automation does not satisfy this requirement.

## Delivery status — 2026-10-12

Implementation is delivered; live desktop acceptance remains pending at the user's request to open Calculator later. Do not mark all acceptance complete yet.

- [x] Typed desktop observations, candidates, acceptance, selection and trace; shared SRS native amendment and service handoff.
- [x] Clef selector through cf CLI, exact Choice/probability validation, explicit failure and no fallback. Live synthetic CLI and Python adapter checks passed.
- [x] Native Windows UIA observer/executor, selected-window guards, bounded numeric text/keys/scroll, optional selected-HWND screenshot, Stop and deadlines.
- [x] Gemma planner, grounded host candidates, fresh-state re-grounding and independent acceptance/no-effect verification. Live synthetic Gemma plan passed.
- [x] Read-only collector with canonical payload, UTC time and private identifiers omitted; real collector output imported through the isolated API.
- [x] 18 AI tests and 25 automation/collector tests pass. Factory operational steps are replaced with qualified-technician escalation.
- [x] LLM-generated ordered workflow passed to Clef; live debug event tab and inspection-only CLI/UI. Live synthetic workflow/selection check passed with no input.
- [x] Local runner with selected application, goal, Observe, Start, result trace and visible Stop. Integration README and setup supplied.
- [ ] Live selected Calculator input/value verification and Stop demonstration; then Task Manager/Settings navigation. No successful real desktop action trace yet.
- [ ] Gemini live call once a Gemini key/model is supplied (Ollama is configured and live-checked).

Run `python -m scripts.desktop_runner` from the repository root. Setup, policy limits and teammate integration contract: `backend/app/services/automation/README.md`. React/session API integration belongs to the two teammates, not this service delivery.

## Original implementation checklist (reference; status above is current)

- Gemini/Ollama provider interface and typed repair/screenshot services.
- Configurable `gemma4:31b-cloud` provider; synthetic text/image smoke checks passed in the previous AI-only checkout.
- Three labelled fixtures, prompts, setup notes and 17 passing AI-only tests from the previous checkout. Re-run after integration; this is not evidence that the combined application passes.
- Clef desktop architecture, selector and native execution code are delivered; real desktop execution acceptance is pending.

## Owned paths

`backend/app/services/ai/`, `backend/app/services/automation/`, `scripts/collect_diagnostics.py`, `tests/ai/`, `tests/automation/`, `fixtures/ai/`, `fixtures/automation/`.

Teammate 2 owns API routes, jobs, persistence, shared schemas and frontend. Deliver typed records/results; do not write SQLite from desktop adapters. All three people agree the desktop contract before implementation. Use `codex/ai-desktop` from integrated main.

## Remaining work, in order

### 1. Agree desktop interfaces with Teammate 2

- Define observations: selected window identity, snapshot ID, visible UI Automation controls and optional screenshot.
- Define candidate actions with fixed control IDs/arguments, expected effect and stop condition.
- Agree session operations: start, observe status, stop, optional confirmation and terminal result. These are proposed interfaces, not existing endpoints.
- Update the shared SRS together for native Windows control; preserve repair/factory schemas and explicitly decide the old browser feature's status.

### 2. Implement Cloudflare Clef selection

- Add a separate `select_desktop_action(state, candidates)` service; keep repair JSON generation on Gemini/Ollama.
- Start with `@cf/cloudflare/clef`, using a typed Choice over offered candidate IDs. Keep wait, ask-user and stop options.
- Validate returned IDs/probabilities; fail explicitly on provider errors. No silent substitution with Jev or fabricated decisions.
- Use `cf` CLI for Cloudflare operations unless a Wrangler configuration exists. Discover commands and verify authentication using current docs; keep credentials local.
- Smoke-test a synthetic choice request before sending actual desktop context. Record which model and environment were verified.

### 3. Build the local Windows observer and executor

- Observe an explicitly selected application window through UI Automation; capture screenshots when needed.
- Ground every action in the latest snapshot. Use named accessible controls where possible; carefully validate coordinates when required.
- Implement one action at a time: click/invoke, bounded text entry, allowed keys, scroll, wait and stop.
- Validate selected window, freshness, target and action permissions immediately before input.
- Preserve a visible stop control and bounded action/session deadlines. Exclude shell execution, installations, deletion, purchases, credential entry and factory machinery operation from this milestone.
- Treat app/screenshot text as untrusted data. Supply only needed window context to providers and omit sensitive fields.

### 4. Connect Gemma planning and verify effects

- Gemma interprets goal/screen -> code builds valid candidates -> Clef selects -> local executor acts -> fresh state verifies -> repeat.
- Do not trust a model's done response or a successful input receipt as proof of completion.
- First live task: selected Calculator window, one observed control click, verified displayed value and working Stop.
- Next task: read-only Task Manager or Settings navigation for diagnostic observations.
- Keep screenshot advice separate from actions actually performed.

### 5. Deliver the missing diagnostic collector and tests

- Implement `scripts/collect_diagnostics.py` with the canonical diagnostic payload, supplied asset_id, explicit units and offset-aware collection time.
- Collect OS, memory, disk capacity and logical CPU count read-only. Exclude usernames, hostnames, serials, sensitive paths and process command lines.
- Test unknown/stale controls, malformed Clef responses, provider failure, no-effect loops, stop, budgets and false completion.
- Re-run AI tests after the backend merge. Test factory hazard escalation and uncertainty on unreadable screenshots; schema validation alone is not a safety test.
- Supply a short integration README, environment requirements and real action traces. Label fixtures explicitly.

## Handoff and done criteria

Teammate 2 can invoke the agreed services without database access in this module. A real Windows action changes a selected app and its effect is verified. Stop interrupts the next action. Missing Clef access produces an explicit failure. Collector JSON imports through the API. No mock trace is presented as actual desktop operation.
