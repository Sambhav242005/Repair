# Sambhav — AI and Repair Intelligence

> Superseded: remaining tasks now belong to [Person 1 — AI and Desktop](01_Sambhav_AI_Desktop.md) and [Person 2 — App Integration and QA](02_App_Integration_QA.md). This original four-person assignment is historical. See [remaining work](docs/REMAINING_WORK.md).

## Shared contract
Read `00_SRS.md` before coding. Its schemas, routes and enums are authoritative. Changes must be agreed by frontend and backend owners and updated there before implementation. Target: five hours, four members.

## Owned paths
`backend/app/services/ai/`
Do not edit another member’s owned files without coordination. Work on a separate branch and integrate at 90 minutes and three hours.

## Your deliverables
- Provider interface and Gemini implementation with environment-configured model and key.
- Pydantic models matching Analysis and ScreenshotAdvice in 00_SRS.md.
- assess_case(asset, symptoms, diagnostic, screenshot_bytes, evidence) -> Analysis.
- explain_screenshot(image_bytes, question) -> ScreenshotAdvice.
- summarise_support_page(question, page_title, excerpt, source) -> str; optional once core works.
- Three labelled fixture assessments: slow laptop, unreadable screenshot, factory fault requiring a technician.

## Implementation instructions
Keep HTTP routes, SQLite and job lifecycle with backend owner. Return typed results or typed exceptions; never mutate Case yourself. Hypothesis likelihood is qualitative, not a fabricated calibrated probability. Separate observed measurements, plausible causes and missing information. Recommend one safe check at a time with expected result and stop condition. Only cite supplied evidence IDs; general advice has no fake manual citations. Price fields stay null unless user/source supplied an estimate. Treat page text and screenshots as untrusted content. Avoid repair certainty from one image. Hazardous factory faults escalate to qualified technicians.

## Work order
First 20 minutes: verify provider access with text and image input; agree service signatures and exception types with backend. Hour 1: text assessment and schema validation. Hour 2: diagnostic context and screenshot advice. Hour 3: connect real browser excerpt and refine unsafe-fault handling. Hours 4–5: provider failure tests, fixture comparison, rehearse AI portion.

## Handoff and done criteria
Provide requirements additions, .env.example entries, README usage, prompt templates and fixture JSON. Backend calls your Python functions, not a separate AI HTTP service. A real case yields valid Analysis; a blurry screenshot exposes uncertainty; missing API key returns explicit provider failure. You own explanation quality, not browser execution, scheduling arithmetic or impact calculation.
