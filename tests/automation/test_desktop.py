"""Offline contract/safety tests; simulated observations are never live traces."""
import asyncio
import copy
import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch
from backend.app.services.ai.provider import ProviderError
from backend.app.services.automation.clef import (
    choice_request, diagnostic_choice_request, parse_diagnostic_selection, parse_selection,
)
from backend.app.services.automation.desktop import DesktopSession, GemmaPlanner, accepted, build_candidates, cloud_state
from backend.app.services.automation.models import Acceptance, Candidate, Control, Observation, Plan, Selection, Window
from backend.app.services.automation.windows import DesktopError, WindowsAdapter, permitted
from backend.app.services.automation.service import run_browser
from backend.app.models.schemas import DiagnosticCreate
from scripts.collect_diagnostics import collect

WINDOW = Window(handle=1, process_id=1, application="Calculator")
ACCEPTANCE = Acceptance(automation_id="CalculatorResults", name_equals="Display is 7")

def observation(number="0", snapshot="test"):
    return Observation(snapshot_id=snapshot, captured_monotonic=time.monotonic(), window=WINDOW, controls=[
        Control(id=snapshot+":button", automation_id="num7Button", name="Seven", kind="Button", enabled=True, operations=["invoke"]),
        Control(id=snapshot+":result", automation_id="CalculatorResults", name="Display is "+number, kind="Text", enabled=True, operations=[])])

PLAN = Plan(subgoal="Press Seven", preferred_control_id=None, done=False)

class FakeAdapter:
    def __init__(self, effect=True, mutate_during_selection=False):
        self.effect, self.mutate = effect, mutate_during_selection
        self.number, self.executions, self.observations = "0", 0, 0
    async def observe(self):
        self.observations += 1
        number = self.number
        if self.mutate and self.observations % 2 == 0:
            number = "9"
        return observation(number, str(self.observations))
    async def execute(self, before, action, stop_path):
        if stop_path.exists():
            raise DesktopError("Stopped.")
        self.executions += 1
        if self.effect:
            self.number = "7"

class FakePlanner:
    def __init__(self, done=False):
        self.done = done
    async def plan(self, goal, observation):
        return PLAN.model_copy(update={"done": self.done})

class FakeSelector:
    def __init__(self, choice="action_0", error=None):
        self.choice, self.error = choice, error
    async def select_desktop_action(self, state, candidates):
        if self.error:
            raise self.error
        return Selection(action_id=self.choice, probabilities={}, confidence=1)

def session(adapter=None, selector=None, planner=None, **kwargs):
    return DesktopSession(adapter or FakeAdapter(), "Display 7 in Calculator", ACCEPTANCE,
        planner=planner or FakePlanner(), selector=selector or FakeSelector(), **kwargs)

class DesktopTests(unittest.IsolatedAsyncioTestCase):
    async def test_inspection_calls_selector_but_never_executes(self):
        adapter = FakeAdapter()
        events = []
        run = session(adapter,inspect_only=True,debug_sink=events.append)
        result = await run.run()
        self.assertEqual(result.status,"needs_user")
        self.assertEqual(adapter.executions,0)
        self.assertEqual(result.trace,[])
        kinds = [e['event'] for e in events]
        self.assertIn('clef_request',kinds)
        self.assertIn('clef_selection',kinds)
        self.assertIn('inspection',kinds)
        request = next(e['data'] for e in events if e['event']=='clef_request')
        self.assertEqual(request['model'],'clef')
        self.assertIn('Seven',json.dumps(request))
        self.assertNotIn('process_id',json.dumps(request))

    async def test_llm_workflow_is_passed_to_clef(self):
        class Provider:
            async def generate(self,prompt,schema,image,timeout):
                if 'steps' in schema['properties']:
                    return json.dumps({'goal':'Display 7 in Calculator','steps':[{
                        'instruction':'Invoke Seven','expected_observation':'Display is 7','stop_condition':'Stop if unavailable'}],
                        'limitations':['Sample controls only']})
                return PLAN.model_dump_json()
        events=[]
        adapter=FakeAdapter()
        run=session(adapter,planner=GemmaPlanner(Provider()),inspect_only=True,debug_sink=events.append)
        await run.run()
        request=next(e['data'] for e in events if e['event']=='clef_request')
        self.assertEqual(request['state']['workflow']['steps'][0]['instruction'],'Invoke Seven')
        self.assertEqual(adapter.executions,0)

    async def test_workflow_cannot_change_user_goal(self):
        class Provider:
            async def generate(self,*args):
                return json.dumps({'goal':'Delete files','steps':[{'instruction':'Delete',
                    'expected_observation':'Gone','stop_condition':'None'}],'limitations':[]})
        with self.assertRaises(ProviderError):
            await GemmaPlanner(Provider()).create_workflow('Display 7 in Calculator',observation())

    async def test_effect_and_acceptance_verified(self):
        adapter = FakeAdapter()
        result = await session(adapter).run()
        self.assertEqual(result.status, "succeeded")
        self.assertEqual(adapter.executions, 1)
        self.assertTrue(result.trace[0].effect_verified)

    async def test_false_model_done_cannot_complete(self):
        result = await session(FakeAdapter(effect=False), planner=FakePlanner(done=True)).run()
        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_code, "NO_EFFECT")

    async def test_budget(self):
        result = await session(FakeAdapter(effect=False), max_actions=1).run()
        self.assertEqual(result.error_code, "BUDGET_EXCEEDED")

    async def test_stop_before_run(self):
        adapter = FakeAdapter()
        run = session(adapter)
        run.stop()
        result = await run.run()
        self.assertEqual(result.status, "stopped")
        self.assertEqual(adapter.executions, 0)

    async def test_stop_during_provider(self):
        started = asyncio.Event()
        class SlowPlanner:
            async def plan(self, *args):
                started.set()
                await asyncio.sleep(60)
        adapter = FakeAdapter()
        run = session(adapter, planner=SlowPlanner())
        task = asyncio.create_task(run.run())
        await started.wait()
        run.stop()
        result = await asyncio.wait_for(task, 1)
        self.assertEqual(result.status, "stopped")
        self.assertEqual(adapter.executions, 0)

    async def test_stop_during_input_records_unverified_interruption(self):
        started = asyncio.Event()
        class SlowAdapter(FakeAdapter):
            async def execute(self, *args):
                self.executions += 1
                started.set()
                await asyncio.sleep(60)
        run = session(SlowAdapter())
        task = asyncio.create_task(run.run())
        await started.wait()
        run.stop()
        result = await asyncio.wait_for(task, 1)
        self.assertEqual(result.status, "stopped")
        self.assertEqual(result.trace[0].status, "interrupted")
        self.assertIsNone(result.trace[0].after_snapshot)
        self.assertFalse(result.trace[0].effect_verified)

    async def test_input_failure_records_no_success(self):
        class FailingAdapter(FakeAdapter):
            async def execute(self, *args):
                raise DesktopError("Target changed.")
        result = await session(FailingAdapter()).run()
        self.assertEqual(result.status, "failed")
        self.assertEqual(result.trace[0].status, "failed")
        self.assertFalse(result.trace[0].effect_verified)

    async def test_deadline_cancels(self):
        class SlowPlanner:
            async def plan(self, *args):
                await asyncio.sleep(60)
        run = session(planner=SlowPlanner(), deadline_seconds=1)
        result = await run.run()
        self.assertEqual(result.error_code, "BUDGET_EXCEEDED")
        self.assertFalse(run.stop_path.parent.exists())

    async def test_provider_failure_has_no_input(self):
        adapter = FakeAdapter()
        result = await session(adapter, selector=FakeSelector(error=ProviderError("Unavailable"))).run()
        self.assertEqual(result.error_code, "PROVIDER_UNAVAILABLE")
        self.assertEqual(adapter.executions, 0)

    async def test_unknown_selection_has_no_input(self):
        adapter = FakeAdapter()
        result = await session(adapter, selector=FakeSelector("shell")).run()
        self.assertEqual(result.status, "failed")
        self.assertEqual(adapter.executions, 0)

    async def test_mutated_state_is_not_reused(self):
        adapter = FakeAdapter(mutate_during_selection=True)
        result = await session(adapter, max_actions=2).run()
        self.assertEqual(result.error_code, "BUDGET_EXCEEDED")
        self.assertEqual(adapter.executions, 0)

    async def test_stop_and_ask_are_not_success(self):
        for choice, expected in [("stop", "stopped"), ("ask_user", "needs_user")]:
            self.assertEqual((await session(selector=FakeSelector(choice)).run()).status, expected)

    async def test_no_fake_browser_success(self):
        with self.assertRaises(ProviderError):
            await run_browser("asset", "source", "question")

    async def test_gemma_unknown_control_retries_then_fails(self):
        class Provider:
            async def generate(self, *args):
                return json.dumps({"subgoal":"unsafe", "preferred_control_id":"unknown", "done":True})
        with self.assertRaises(ProviderError):
            await GemmaPlanner(Provider()).plan("Goal", observation())

    async def test_executor_rejects_stale_and_unknown(self):
        adapter = WindowsAdapter(WINDOW)
        before = observation()
        adapter.latest = before
        action = build_candidates(before, PLAN)[0]
        with tempfile.TemporaryDirectory() as directory:
            stop = Path(directory)/"stop"
            with self.assertRaises(DesktopError):
                await adapter.execute(before, action.model_copy(update={"snapshot_id":"stale"}), stop)
            with self.assertRaises(DesktopError):
                await adapter.execute(before, action.model_copy(update={"control_id":"unknown"}), stop)
            stop.touch()
            with self.assertRaises(DesktopError):
                await adapter.execute(before, action, stop)

    def test_candidates_are_grounded_and_have_exit_options(self):
        before = observation()
        candidates = build_candidates(before, PLAN, "Display 7 in Calculator")
        self.assertTrue({"wait", "ask_user", "stop"}.issubset({c.id for c in candidates}))
        self.assertTrue(any(c.operation == "text" and c.argument == "7" for c in candidates))
        self.assertTrue(all(c.snapshot_id == before.snapshot_id for c in candidates))

    def test_policy_blocks_machine_controls_and_arbitrary_text(self):
        control = Control(id="x", automation_id="EndTaskButton", name="End task", kind="Button", enabled=True, operations=["invoke"])
        self.assertFalse(permitted(control, Window(handle=1, process_id=1, application="TaskManager"), "invoke"))
        self.assertFalse(permitted(control, WINDOW, "text"))

    def test_cloud_state_omits_machine_identity(self):
        state = cloud_state(observation())
        self.assertNotIn("window", state)
        self.assertNotIn("process_id", json.dumps(state))

    def test_duplicate_acceptance_is_not_success(self):
        before = observation("7")
        self.assertTrue(accepted(before, ACCEPTANCE))
        duplicate = before.model_copy(update={"controls":before.controls + [before.controls[-1]]})
        self.assertFalse(accepted(duplicate, ACCEPTANCE))

    def test_clef_request_and_malformed_outputs(self):
        candidates = build_candidates(observation(), PLAN)
        request = choice_request({"sample_data":True}, candidates)
        self.assertEqual(request["model"], "clef")
        probabilities = {c.id:float(c.id == "stop") for c in candidates}
        response = {"model":"clef", "answers":{"next_action":{"type":"choice","choice":"stop","probabilities":probabilities,"confidence":1}}}
        self.assertEqual(parse_selection(response, candidates).action_id, "stop")
        for key, value in [("choice","unknown"),("probabilities",{"stop":1}), ("confidence",float("nan")), ("type","noul")]:
            bad = copy.deepcopy(response)
            bad["answers"]["next_action"][key] = value
            with self.assertRaises(ProviderError):
                parse_selection(bad, candidates)
        bad = copy.deepcopy(response)
        bad["answers"]["next_action"]["probabilities"]["stop"] = float("nan")
        with self.assertRaises(ProviderError):
            parse_selection(bad, candidates)

    def test_diagnostic_clef_choice_is_advice_not_a_system_action(self):
        choices = {"memory": "Review memory", "storage": "Review storage", "clarify_symptoms": "Ask for context"}
        request = diagnostic_choice_request({"reported_issue": "slow PC"}, choices)
        self.assertEqual(request["questions"]["next_check"]["type"], "choice")
        self.assertIn("advice only", request["questions"]["next_check"]["instructions"])
        probabilities = {key: float(key == "clarify_symptoms") for key in choices}
        response = {"model": "clef", "answers": {"next_check": {
            "type": "choice", "choice": "clarify_symptoms", "probabilities": probabilities, "confidence": 0.8,
        }}}
        self.assertEqual(parse_diagnostic_selection(response, choices).action_id, "clarify_symptoms")
        response["answers"]["next_check"]["choice"] = "run_command"
        with self.assertRaises(ProviderError):
            parse_diagnostic_selection(response, choices)
        response["answers"]["next_check"].update(choice="clarify_symptoms", confidence=1.1)
        with self.assertRaises(ProviderError):
            parse_diagnostic_selection(response, choices)

    def test_collector_contract_and_privacy(self):
        payload = collect("asset_test")
        DiagnosticCreate.model_validate(payload)
        self.assertIn("+00:00", payload["collected_at"])
        self.assertLessEqual(payload["memory"]["available_bytes"], payload["memory"]["total_bytes"])
        self.assertEqual(payload["disks"][0]["label"], "system")
        self.assertEqual(set(payload), {"asset_id","collected_at","os","memory","disks","cpu","collector_version"})
        self.assertNotIn("hostname", json.dumps(payload))

if __name__ == "__main__":
    unittest.main()
