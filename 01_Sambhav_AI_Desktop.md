# Sambhav — AI, Clef and native Windows computer use

Updated 2026-10-12. **Implementation and integration are delivered; live desktop acceptance is pending.** The current single-owner checklist is [docs/REMAINING_WORK.md](docs/REMAINING_WORK.md).

## Completed implementation

- [x] Gemini and Ollama repair/screenshot services, strict schemas, prompts and labelled fixtures.
- [x] Configurable Ollama `gemma4:31b-cloud`; live synthetic text/image and planning checks.
- [x] Cloudflare Clef Choice through cf CLI, validated offered IDs/probabilities and explicit failures.
- [x] LLM-generated ordered workflow supplied to Clef with current labels, subgoal and recent effects.
- [x] Windows UI Automation observation and bounded execution in an explicitly selected supported app.
- [x] Snapshot/target/window guards, independent effect/acceptance verification, Stop, deadlines and no-effect limits.
- [x] Local runner with Observe, Start, Stop, workflow/debug view and inspection-only mode.
- [x] Read-only diagnostic collector; actual output imported through the API against an isolated database.
- [x] Factory operational repair steps replaced with qualified-technician escalation.
- [x] Setup documentation, service handoff and native amendment in the shared SRS.

## Verification completed

Latest integrated verification: backend `pytest -q` — **61 passed** (one Starlette deprecation warning); frontend `pnpm test` — **10 passed**; frontend `pnpm build` — passed. Live Gemma/Clef workflow inspection used labelled synthetic Calculator controls; Clef selected the Seven invoke with probability 0.892 and `input_executed: false`. That verifies provider selection, not actual PC input. See `fixtures/automation/workflow_debug_result.json`.

## Acceptance still pending

- [ ] Open/select Calculator; execute a real control action and independently verify its displayed value.
- [ ] Demonstrate Stop during a real session and record the actual action trace.
- [ ] Verify read-only Task Manager/Settings navigation against the installed app's control IDs.
- [ ] Optional Gemini live check when its key/model is configured; current selected Ollama provider is live-checked.

The user chose to open Calculator later. No successful native action trace has been claimed. These checks prevent marking the whole assignment's acceptance complete.

## Run and handoff

```powershell
python -m scripts.desktop_runner --debug --inspect-only
python -m scripts.desktop_debug --sample
```

The first command inspects a user-selected open application. The second uses sample labels with real providers. Both execute no input. For actual execution, turn off Inspect only in the runner after selecting the app and setting the exact acceptance condition.

[Automation setup and policy](backend/app/services/automation/README.md) explains the supported operations and typed local session contract. The current backend API persists native desktop sessions and debug history; the services retain bounded control over native input.

Earlier teammate assignments are historical and are no longer open work. See [04_Factory_Automation_QA.md](04_Factory_Automation_QA.md) for the completed integration areas and [remaining work](docs/REMAINING_WORK.md) for the single current owner and pending live PC acceptance.
