# Member 2 — Frontend and User Experience

## Shared contract
Read `00_SRS.md` before coding. Its schemas, routes and enums are authoritative. Changes must be agreed by frontend and backend owners and updated there before implementation. Target: five hours, four members.

## Owned paths
`frontend/`
Do not edit another member’s owned files without coordination. Work on a separate branch and integrate at 90 minutes and three hours.

## Your deliverables
1. Asset list and repair case form with symptom input, screenshot upload and diagnostic JSON upload.
2. Case view: summary, hypotheses, evidence, uncertainty, ordered step statuses and outcome recording.
3. Computer assistance panel with separate tabs: screenshot guidance, browser assistant, PC diagnostics. Show actual browser trace and clear running/failed states.
4. Factory tabs: maintenance, training lessons, production, with forms and schedule list.
5. Alert bell, acknowledge button and user-enabled sound. Impact cards with assumptions and sample-data banner.

## Integration rules
Read 00_SRS.md first. Use one typed API client with VITE_API_BASE_URL; no provider key or scheduling logic in frontend. Build against fixtures matching exact schemas. Job actions return job_id, not advice immediately: poll GET /jobs/{id} every 2 seconds until succeeded/failed, stop on unmount. Case jobs then refetch case; screenshot/browser jobs render result. Validate required fields locally but render backend errors, especially 409 conflicts. Send ISO timestamps with offsets; browser datetime-local must be converted deliberately. Display all times in Asia/Kolkata. Poll alerts every 15 seconds; sound once per new ID only after Enable sound click. Do not label a screenshot response as a performed action.

## Pages and layout
Use one app with Repair and Factory navigation. Case form and analysis side by side on desktop, stacked on mobile. Factory dashboard uses a simple schedule list, not a custom calendar library. Required states: empty, loading, running, success, validation error, network/provider failure and retry. Long AI text wraps. No login screen for seeded demo.

## Work order
First 20 minutes: agree schemas and scaffold API client. Hour 1: repair form and fixture analysis. Hour 2: wire live case analysis and uploads. Hour 3: factory forms, alerts and computer tabs. Hours 4–5: integration fixes, responsive checks, demo polish.

## Done criteria
All buttons call real endpoints; reload retains saved data. A schedule conflict shows backend reason. Missing model access shows failed state. Alarm sound works after user opt-in. No charts claim carbon reduction. Hand over UI route map and list of required environment settings.
