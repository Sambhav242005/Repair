"""Inspect real Gemma workflow and Clef decisions. Never executes desktop input."""
import argparse
import asyncio
import json
import time
from backend.app.services.automation.desktop import DesktopSession
from backend.app.services.automation.models import Acceptance, Control, Observation, Window
from backend.app.services.automation.windows import WindowsAdapter

class SampleObserver:
    """Explicit sample control labels; no actual application or executor."""
    async def observe(self):
        return Observation(snapshot_id="sample",captured_monotonic=time.monotonic(),
            window=Window(handle=1,process_id=1,application="Calculator"), controls=[
                Control(id="sample:seven",automation_id="num7Button",name="Seven",kind="ControlType.Button",enabled=True,operations=["invoke"]),
                Control(id="sample:clear",automation_id="clearButton",name="Clear",kind="ControlType.Button",enabled=True,operations=["invoke"]),
                Control(id="sample:display",automation_id="CalculatorResults",name="Display is 0",kind="ControlType.Text",enabled=True,operations=[])])

async def run(args):
    if args.sample:
        print("SAMPLE LABELS — real Gemma and Clef calls; no desktop input.")
        adapter = SampleObserver()
    else:
        windows = await WindowsAdapter().windows()
        selected = next((w for w in windows if w.handle == args.window_handle),None)
        if selected is None:
            print(json.dumps({"message":"Select one listed handle with --window-handle. No model call or input executed.",
                "windows":[w.model_dump() for w in windows]},indent=2))
            return
        adapter = WindowsAdapter(selected)
    def show(event):
        print(json.dumps(event,indent=2,ensure_ascii=False),flush=True)
    session = DesktopSession(adapter,args.goal,Acceptance(automation_id="CalculatorResults",name_equals="Display is 7"),
        debug_sink=show,inspect_only=True)
    result = await session.run()
    if result.status == "failed":
        raise SystemExit(1)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample",action="store_true",help="Use explicitly synthetic Calculator labels with real providers.")
    parser.add_argument("--window-handle",type=int,help="Inspect a selected supported app using real UIA labels.")
    parser.add_argument("--goal",default="Display 7 in Calculator")
    asyncio.run(run(parser.parse_args()))

if __name__ == "__main__":
    main()
