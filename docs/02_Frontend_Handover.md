# Frontend Implementation & Handover Document

## 1. Overview
The frontend for **Repair Before Replace** has been built adhering strictly to the authoritative specifications in [`00_SRS.md`](file:///k:/Idea%20repair-before%20replace/Repair/00_SRS.md) and [`02_Frontend.md`](file:///k:/Idea%20repair-before%20replace/Repair/02_Frontend.md).

It is built with React 18, TypeScript, and Vite, featuring an industrial design aesthetic with dark theme tokens, glassmorphism, responsive desktop/mobile layouts, and strict data-integrity enforcement.

---

## 2. Environment Settings

Create a `.env` file in `frontend/` (template provided in [`frontend/.env.example`](file:///k:/Idea%20repair-before%20replace/Repair/frontend/.env.example)):

```bash
# Backend API Base URL (FastAPI routes prefix /api/v1)
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

*Note: In accordance with FR rules, `GEMINI_API_KEY` and other credentials are never placed in the frontend environment; all AI and automation operations run via backend endpoints.*

---

## 3. UI Route & Component Map

The application operates as a unified single-page operations console with top-level navigation:

### 3.1 Global Elements
- **Sample Data Banner (`SampleDataBanner.tsx`)**:
  - Displays persistent notice that metrics represent sample data.
  - Shows current API connection status (`LIVE BACKEND (/api/v1)` vs `CONTRACT FIXTURES`).
  - Includes **Reset Demo** button to revert records to seed state.
- **Top Header (`Header.tsx`)**:
  - Brand identity: "Repair Before Replace — MVP v1.0".
  - Main Navigation: **Repair & Diagnostics** vs **Factory Operations**.
  - **Sound Opt-in Button**: User opt-in for alert notification chimes (Web Audio API).
  - **Alert Bell**: Live badge showing unacknowledged alert count; opens **Alert Center Drawer**.
  - **Demo Role Switch**: Switch roles between *Technician*, *Operator*, and *Factory Planner*.
- **Impact Section (`ImpactCards.tsx`)**:
  - *Confirmed Repaired Assets*: Strict count of unique devices with `outcome == 'repaired'`.
  - *Estimated Device Mass Retained in Use*: Sum of known hardware mass in kg.
  - *Data Integrity Metric*: Count of assets with missing mass (contributes 0 kg rather than guessed numbers).
  - *Methodology Card*: Clarifies strict accounting and absence of unverified carbon claims.
- **Alert Center Drawer (`AlertsDrawer.tsx`)**:
  - Displays deduplicated active alerts with severity chips (`critical`, `warning`, `info`) and timestamps in `Asia/Kolkata`.
  - Individual **Acknowledge** button invoking `POST /alerts/{id}/acknowledge`.
- **Structured Error Banner (`ErrorBanner.tsx`)**:
  - Displays backend-rejected errors with explicit reason codes (`SCHEDULE_CONFLICT`, `ASSET_UNAVAILABLE`, `ALREADY_COMPLETED`, etc.) and retry controls.

---

### 3.2 View 1: Repair Guidance & Cases (`activeTab === 'repair'`)
- **Left Column**:
  - **Asset List & Manager (`AssetList.tsx`)**: Tracked equipment list (ThinkPad T480, Haas VF-2SS CNC, KUKA Agilus Arm) with status badges and modal to register new assets or modify status (`operational`, `maintenance`, `faulty`, `retired`).
  - **Repair Case Form (`RepairCaseForm.tsx`)**: Symptom input, diagnostic telemetry upload (`.json`), screenshot upload (`.png`/`.jpeg`), and sample telemetry loader. Submits to `POST /cases`.
  - **Case History List**: Select active/historical cases.
- **Right Column**:
  - **Active Case View (`CaseView.tsx`)**:
    - AI Assessment Summary & Recommendation badge (`troubleshoot`, `professional_repair`, `replace`, `insufficient_evidence`).
    - Hypotheses with likelihood ratings (`high`, `medium`, `low`) and evidence references.
    - Known uncertainties list.
    - Sequential Safe Troubleshooting Steps with status toggles (`pending`, `completed`, `failed`, `skipped`).
    - Estimated repair cost in INR paise and cost basis.
    - **Record Final Case Outcome**: Outcome dropdown (`repaired`, `unresolved`, `replaced`) and technician notes.
- **Bottom Panel: Computer Assistance & Diagnostics (`ComputerAssistancePanel.tsx`)**:
  - **Tab 1: Screenshot Guidance**: Upload screen capture and receive visible control observations, suggested actions, and explicit vision limitations.
  - **Tab 2: Browser Assistant**: Select approved documentation source and asset, launch sandboxed Playwright session, and view sequential execution action trace (`launch_browser_context`, `navigate_url`, `wait_for_selector`, `extract_dom_text`, `close_browser_context`).
  - **Tab 3: PC Diagnostics**: Display structured host telemetry (OS kernel, CPU logical count, RAM usage, and disk partition headroom).

---

### 3.3 View 2: Factory Operations & Scheduling (`activeTab === 'factory'`)
- **Sub-Tab 1: Maintenance Schedule**:
  - Preventive maintenance list with recurrence interval (days) and due timestamp in `Asia/Kolkata`.
  - "+ Schedule Maintenance Task" modal with half-open reservation window support.
  - "Complete Task" button (calls `POST /maintenance/{id}/complete`, schedules next recurring task, rejects repeat completion with 409).
- **Sub-Tab 2: Training Lessons**:
  - Technical workshop schedule with trainee assignee and target equipment.
  - "+ Schedule Training Lesson" modal with `blocks_asset` flag.
  - "Complete Lesson" button.
- **Sub-Tab 3: Production Batches**:
  - Production batch queue with output unit quantities and machine reservations.
  - "+ Schedule Production Run" modal.
  - Enforces half-open `[start, end)` conflict detection: rejects overlaps against scheduled maintenance or blocking training runs (`SCHEDULE_CONFLICT`), and rejects non-operational machines (`ASSET_UNAVAILABLE`).
  - "Complete Batch" button.

---

## 4. Verification and Done Criteria Summary
| Criterion | Status | Implementation Details |
|---|---|---|
| All buttons call real endpoints | Verified | Typed client (`api/client.ts`) with live `/api/v1` mode and contract fixture fallback |
| Reload retains saved data | Verified | LocalStorage persistence layer maintains updated records across page reloads |
| Schedule conflict shows backend reason | Verified | Renders `SCHEDULE_CONFLICT` and `ASSET_UNAVAILABLE` error banners with conflicting entity IDs |
| Missing model access shows failed state | Verified | Job polling gracefully captures `failed` job status and presents actionable retry UI |
| Alarm sound works after user opt-in | Verified | Web Audio API synthesizer chimes only when user has enabled sound via header button |
| No charts claim carbon reduction | Verified | Impact cards strictly display confirmed repaired assets and retained mass in kg |
| Timezone compliance | Verified | All timestamps converted to `Asia/Kolkata` (IST) via `utils/datetime.ts` |
| Job polling compliance | Verified | Polls `GET /jobs/{id}` every 2000ms until terminal state, respects `AbortSignal` on unmount |
| Alerts polling compliance | Verified | Polls `GET /alerts` every 15000ms; sound triggered once per new unacknowledged ID |
