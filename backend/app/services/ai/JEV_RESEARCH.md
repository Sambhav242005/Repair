# Jev for desktop computer use

Historical comparison only: the user selected Cloudflare Clef instead of Jev. The current plan is in `COMPUTER_USE_DECISIONS.md`.

Checked 2026-10-12 against public repositories and TypeSafe documentation. This is research, not implemented desktop control.

## What Jev does

Jev evaluates structured state against typed questions. Choice selects an offered option and returns probabilities and confidence; Score evaluates a rubric; Noul evaluates a statement. TypeSafe recommends small judgments combined by application logic. Jev is not the screenshot interpreter or desktop input driver. [Official introduction](https://docs.typesafe.ai/introduction)

## Real implementations

**jev-bot** controls native macOS applications through Cua Driver. It supplies accessibility controls to Jev, enumerates supported actions, accepts a selected candidate, executes it, and observes again. Its source checks candidate IDs and probability keys against the offered table. Screenshots are interpreted by the host agent; Jev receives accessibility text. The documented API supports native clicks, text editing, and individual navigation keys, but lacks coordinate clicks, dragging, scrolling, app launch, and shortcuts. Completion requires an exact caller-supplied expectation; a model's “done” decision is insufficient. This is not a Windows adapter. [README](https://github.com/stoopid-computers/jev-bot), [provider source](https://github.com/stoopid-computers/jev-bot/blob/main/src/provider.ts), [candidate/loop source](https://github.com/stoopid-computers/jev-bot/blob/main/src/engine.ts)

**CUA-JEV** separates a general model's planning from Jev's selection of concrete action-and-channel candidates. Windows observations use UI Automation; GUI execution can use PyAutoGUI, while hybrid workflows also offer COM, CLI, MCP, or file APIs. Its optional vision model converts screenshots into bounded scene text and target boxes; Jev receives text. Guards check observation identity, consumed observations, allowed candidate IDs, permissions, confirmations, preconditions, and paths. Independent checks establish outcomes. Published desktop support is Windows-specific. The authors explicitly describe bounded case studies and small pilots, not arbitrary-app reliability or conclusive speed benchmarks. [README](https://github.com/ZJU-REAL/CUA-JEV), [policy source](https://github.com/ZJU-REAL/CUA-JEV/blob/main/src/cua_jev/policy.py), [guard source](https://github.com/ZJU-REAL/CUA-JEV/blob/main/src/cua_jev/guard.py)

## Proposed architecture for this project

This is a recommendation inferred from those implementations:

1. A local Windows process observes one selected window through UI Automation and screenshot capture.
2. Gemma interprets the task and, where needed, the screenshot; it proposes a short next subgoal grounded in current control references.
3. Code compiles currently executable candidates with fixed arguments, snapshot IDs, risk classifications, and expected effects.
4. Jev Choice selects an offered candidate ID. Code checks freshness and permissions before a registered Windows executor acts.
5. A fresh observation checks the expected effect. Repeat with a step budget and stop control; report completion only when the task acceptance condition is verified.

For a desktop-focused first version, offer UI Automation and physical GUI routes. Browser DOM and Playwright are unnecessary. Useful diagnostic capabilities include opening Task Manager, reading process/resource information, and navigating selected Settings screens.

An alternative uses Gemma alone to select a candidate through schema-validated JSON. It still needs the same observation, candidate, guard, executor, and verifier layers. Comparing both selectors on identical recorded Windows tasks would determine whether Jev improves latency, invalid-action rate, or completion; model-reported confidence alone should not decide this.

The earlier computer-use note's browser executor proposal does not satisfy the user's clarified requirement. Jev is a separate optional selector; adding it does not itself supply desktop control.
