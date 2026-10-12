# Native Windows computer use

This module is Sambhav's database-independent delivery. It uses Windows UI Automation, Ollama/Gemma for planning, and Cloudflare Clef for bounded action selection. Browser execution is deprecated and returns `PROVIDER_UNAVAILABLE`; no fabricated trace is returned.

## Run locally

From the repository root, with Python 3.11+ and the AI dependencies installed:

```powershell
$env:OLLAMA_MODEL = 'gemma4:31b-cloud'
$env:OLLAMA_BASE_URL = 'http://localhost:11434'
# Only if cf is not on PATH:
$env:CF_EXECUTABLE = 'C:\path\to\cf.ps1'
python -m scripts.desktop_runner
```

For a visible workflow/decision trace, run `python -m scripts.desktop_runner --debug --inspect-only`.
The Debug checkbox shows observed labels, Gemma's ordered workflow, its next subgoal, the exact Clef request body,
validated option probabilities, guards and effect verification. The Inspect only checkbox calls the real providers
but executes no input; the session ends with `needs_user`, never a claimed action success. Debug events appear live
on a separate tab and stay in memory (no automatic file logging). They include the submitted goal/labels, but no tokens,
authentication headers, raw CLI stderr or screenshots.

Gemma creates up to 12 workflow steps, each with an instruction, expected observation and stop condition.
The user goal must remain unchanged. Clef receives the complete advisory workflow plus current controls,
Gemma's next subgoal and recent verified effects for every choice. Workflow steps are guidance, not executable code
or independent proof of completion; the candidate policy and user-supplied acceptance remain authoritative.

To check provider decisions without opening an app:

```powershell
python -m scripts.desktop_debug --sample
```

This uses clearly labelled synthetic Calculator controls with **real Gemma and Clef calls**, and cannot execute input.
For real labels, run `python -m scripts.desktop_debug` to list supported windows, then
`python -m scripts.desktop_debug --window-handle <handle> --goal 'Display 7 in Calculator'`.
That CLI always inspects only. The user still needs to open their chosen app before inspecting real UIA labels.

The live sample workflow inspection passed on 2026-10-12: Clef chose the offered Seven invoke with probability
0.892. `fixtures/automation/workflow_debug_result.json` records the result as sample data with
`input_executed: false`; this is not a successful desktop action trace. Provider failures also surface explicitly
in the debug result before input.

Install/sign in to Ollama and install/authenticate the Cloudflare cf CLI. Credentials stay in their respective local provider configuration; this module does not print them. Cloudflare calls use `cf ai run @cf/cloudflare/clef --body @<temporary-file>`. Request files are deleted after each call. `cf ai get-model-schema --model @cf/cloudflare/clef` was used to verify the contract.

Open Calculator yourself, Refresh windows, select its HWND, and Observe. Set goal `Display 7 in Calculator`, acceptance automation ID `CalculatorResults`, and exact accessible name from your app's language (English commonly `Display is 7`). Start. A fresh UIA observation must match the exact acceptance. A successful input receipt or Gemma `done` is insufficient. Stop remains visible during inference; it cancels the pending helper and blocks subsequent inputs. Already delivered inputs cannot be undone. Close also requests Stop.

The initial local runner is a desktop Tkinter UI; the repository's React app is not yet connected to this session service. Backend/frontend integration belongs to the other two teammates.

## Supported policy

- Calculator: named digit/arithmetic/clear buttons, ENTER/ESC grounded in their observed buttons, and bounded numeric text (1–16 digits) from the exact `Display <digits> in Calculator` goal. Numeric text uses UIA digit invokes with Stop/deadline checks before each digit. No arbitrary text or script entry.
- Task Manager and Settings: only explicitly allowed Performance/System/memory/CPU navigation and bounded scroll controls. Installed versions/localisation can expose different IDs; unknown controls are denied. No process termination or settings changes.
- Explicit selected-window handle, process and application checks; visible, enabled, non-password controls; snapshot-scoped IDs; five-second input freshness; refresh and compare the entire observed state after inference before re-grounding.
- Maximum 200 controls per observation, 30 actions and 180 seconds per session (defaults 12/120). Three no-effect observations stop the loop. Each Windows helper has an eight-second timeout; Clef has 30 seconds.
- No shell, installation, deletion, purchasing, credentials, machinery, browser DOM, arbitrary coordinates or unrestricted key combinations are exposed to models.

Optional `adapter.screenshot()` renders only the selected HWND with PrintWindow and rejects windows containing password controls. Unsupported captures may be blank or fail. Screenshots are never sent automatically. The default cloud context includes the goal and limited accessible control labels, omits window titles/process IDs/OS handles, and suppresses edit values and obvious paths/email labels. This is data minimisation, not a general PII detector: inspect the selected diagnostic app before running.

PowerShell execution policy is set to Bypass only for the bounded helper process so Windows can execute the checked-in bridge; no machine/user policy is changed. No elevated privileges are requested. UIA may fail across elevation boundaries, suspended UWP apps or inaccessible windows. Failure is explicit.

## Integration contract

`models.py` defines strict immutable observations, candidates, acceptance, selection, trace and terminal results. `WindowsAdapter.windows()` enumerates allowed windows. Construct `DesktopSession(adapter, goal, Acceptance(...))`, await `run()`, read `status`/`trace`, and call `stop()` from the local UI thread. Sessions can run once. A backend owner must explicitly manage the session registry/lifecycle, consent and persistence; this module writes no database records and exposes no network desktop endpoint.

`ClefSelector.select_desktop_action(state, candidates)` is separate from repair `Provider.generate`. Choice responses must contain exactly the offered IDs, finite probabilities in [0,1] summing to one, a highest-probability chosen ID and finite bounded confidence. Missing access/errors never fall back to another model.

Trace status distinguishes verified changes, no effect, failure and interruption. If execution/observation is interrupted, `after_snapshot` is null and no effect is claimed; some input may already have occurred. Windows helper cancellation terminates its process tree, including a cf launcher child.

## Diagnostic collector

```powershell
python scripts/collect_diagnostics.py --asset-id asset_laptop_1 > diagnostic.json
# Import the JSON body with POST /api/v1/diagnostics after creating/selecting that asset.
```

Windows uses read-only GlobalMemoryStatusEx; other platforms require psutil. Reports physical memory bytes, system-disk capacity/free bytes, logical CPU count, OS family/release, UTC offset-aware collection time and collector version. Does not collect usernames, hostnames, serials, drive paths or process command lines. The single disk is labelled `system`; this milestone does not enumerate every mounted volume.

## Verification and limits

On 2026-10-12 a **live synthetic** Clef request succeeded using this machine's cf authentication. Exact request and response are in `fixtures/automation/clef_request.json` and `clef_response.json`; neither is a desktop action trace. AI/automation offline tests use simulated state and are labelled accordingly.

The live Calculator click/value/Stop acceptance is **pending**: Calculator was closed during work and the user chose to open it later. No successful native action trace is claimed. Task Manager/Settings live navigation also remains to be verified. Gemini live verification still requires its configured key/model; Ollama text/image checks passed previously.

Live Python adapter checks also passed: Clef chose `stop` for a synthetic no-app goal; Gemma returned a schema-valid plan targeting the offered synthetic Seven control. These calls sent sample controls only and executed no input. The collector's actual read-only output imports successfully through POST /diagnostics against a temporary isolated database in `test_collector_import.py`.

Docs consulted: [Clef schema](https://developers.cloudflare.com/workers-ai/models/clef/), [UI Automation](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-uiautomationoverview), [InvokePattern](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.invokepattern.invoke), [PrintWindow](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-printwindow).
