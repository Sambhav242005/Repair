# Remaining work — three-person split

Updated 2026-10-12. Sambhav's service implementation is delivered. The user deferred live Calculator testing until they open it later; native action acceptance is therefore still pending.

| Person | Assignment | Current remaining work |
|---|---|---|
| Sambhav | [AI and Desktop](../01_Sambhav_AI_Desktop.md) | Live Calculator action/value/Stop proof; read-only Task Manager/Settings check; optional Gemini live verification when configured |
| Teammate 1 | [QA assignments](../04_Factory_Automation_QA.md) | Maintenance timestamp, explicit live errors, React desktop flow, frontend build and real flow checks |
| Teammate 2 | [QA assignments](../04_Factory_Automation_QA.md) | Case/job association, date validation, replacement impact, factory concurrency/alerts, desktop session persistence/API and integration checks |

## Sambhav's delivered work

Gemini/Ollama repair and screenshot services; configurable gemma4:31b-cloud; strict schemas/fixtures; Clef Choice through cf CLI; Windows UIA observer and bounded executor; Gemma planning and host-generated candidates; fresh effect/acceptance verification; Stop and budgets; local desktop runner; privacy-preserving diagnostic collector; service contract and setup docs. Factory assessments cannot expose model-generated machinery repair steps. The fabricated browser service now fails explicitly.

43 automated checks pass: 18 AI and 25 automation/collector checks. Tests cover malformed choices, unknown/stale controls, unavailable providers, false completion, no effect, Stop (including interrupted input traces), budgets, factory escalation, and actual collector import through an isolated API database. Live synthetic Clef inference succeeded through CLI and Python; live Gemma returned a valid plan against supplied synthetic controls. None of those provider checks is a successful native action trace.

## Review evidence and unresolved teammate issues

Reviewed backend `9b78c6d` and frontend `7df5fa8` against scaffold `4c042a9`. AI `2492dea` was merged into main with integration/QA assignments in `8ad7a20`, already pushed. This delivery extends integrated main.

Remaining confirmed issues: missing maintenance completion timestamp, failed live requests replayed against mock state, replaced assets retained in impact, dates accepted without offset/date validation. New teammate commit d39af30 added job entity_id and per-case filtering and was merged during this delivery. Existing SQLite databases still need an entity_id migration, and concurrent-case behavior needs verification. The AI ORM mapping/diagnostic decoding and explicit failures were integrated previously. Teammate 2 must align application-level environment/dependencies.

The teammate's repair/provider-failure tests now use explicit offline provider mocks. The legacy browser test now expects the explicit unavailable job, matching the native amendment. Frontend build and complete app flows remain unverified.

After merging d39af30, all seven backend smoke tests passed against temporary isolated database and upload paths. Combined with the 43 AI/automation checks, this delivery has 50 passing automated checks; real native action acceptance remains pending.

## Integration sequence

1. Teammate 2 fixes backend review findings and implements lifecycle/persistence around the delivered `DesktopSession`; Teammate 1 fixes maintenance/network handling and builds the matching React flow.
2. Use `backend/app/services/automation/models.py`, its README, and the native amendment in `00_SRS.md` as the handoff. Network desktop endpoints are not implemented and must not expose unrestricted control remotely.
3. When the user opens Calculator, run the selected-window action/value/Stop acceptance and record a real trace. Then validate diagnostic navigation against installed app/control IDs.
4. Rehearse actual repair, collector import, native action, saved outcome, factory conflicts/recurrence, alerts and impact together. Label every synthetic fixture.

The original four-person assignment and earlier two-person consolidation are historical. The QA file holds the two teammates' current work; do not equate implemented adapters with verified end-to-end desktop operation.
