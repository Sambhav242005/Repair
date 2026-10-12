# Member 4 — Factory Planning, Computer Automation and QA

## Shared contract
Read `00_SRS.md` before coding. Its schemas, routes and enums are authoritative. Changes must be agreed by frontend and backend owners and updated there before implementation. Target: five hours, four members.

## Owned paths
`backend/app/services/factory/, backend/app/services/automation/, scripts/`
Do not edit another member’s owned files without coordination. Work on a separate branch and integrate at 90 minutes and three hours.

## Your deliverables
- Factory planning functions for maintenance, training lessons and production; exact conflict rules from SRS.
- Alert evaluation functions using an injectable clock, returning alert candidates for backend persistence.
- Python Playwright adapter: run_browser(asset, source_id, question) -> BrowserResult. Source IDs resolve to backend-owned approved support URLs.
- Read-only PC collector: scripts/collect_diagnostics.py writes the SRS diagnostic fields except backend ID. User supplies asset_id. psutil collects RAM and disk usage; platform supplies OS; exclude host/user identifiers and sensitive file paths.
- Fixture records and meaningful acceptance tests; own demo rehearsal and reset-data validation.

## Browser computer-use implementation
Start with one verified public manufacturer support page chosen for demo device. Configure it explicitly and disclose fixture pages when used. Launch an isolated Playwright context; navigate, read title and visible text, cap excerpt length, record actual success/failure trace, close context in finally. Check every navigation/redirect destination against allowlist. Block private/loopback/link-local targets for external browsing; local fixture mode is a separate explicit configuration. No credentials, purchases, submitted forms, downloads, shell actions or operating system control. If external browsing is unavailable, demonstrate an explicitly labelled local support-page fixture; never claim it is live manufacturer navigation.

## Factory implementation
Pure functions: find_conflicts(candidate, reservations), evaluate_alerts(records, now), next_maintenance(completed, completed_at). Backend owns IDs and transactions. Maintenance and blocking lessons reserve equipment; all reservations must check overlaps in both directions. Due-only maintenance creates alerts without a reservation. Production rejects faulty/retired/maintenance assets. Emit equipment-unavailable alerts for existing affected jobs. Training instructions may be manually entered; AI lesson generation is optional.

## Work order
First 20 minutes: install/verify Playwright browser and one reachable support URL; agree interfaces. Hour 1: factory conflict and alert rules. Hour 2: collector plus real browser navigation. Hour 3: wire factory services and actual alarms. Hour 4: test dates, deduplication, recurrence, network failure. Hour 5: run full demo and prepare fallback fixtures.

## Done criteria
A real browser trace is visible, collector imports successfully, all three factory modules save and alert. Fake-clock tests cover due/overdue transitions without waiting a day. Overlap checks pass both creation orders and touching-boundary cases. Provide a 3-minute demo script with honest sample/live labels.
