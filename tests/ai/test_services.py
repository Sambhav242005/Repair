import copy
import json
from pathlib import Path
import unittest
import urllib.error
from unittest.mock import patch

from backend.app.services.ai import Analysis, ScreenshotAdvice, assess_case, explain_screenshot, GeminiProvider, ProviderError, AIInputError

ROOT = Path(__file__).resolve().parents[2]


def fixture(name):
    return json.loads((ROOT / 'fixtures' / 'ai' / (name + '.json')).read_text())['result']


class FakeProvider:
    def __init__(self, *responses):
        self.responses = iter(responses)
        self.calls = []

    async def generate(self, prompt, schema, image, timeout):
        self.calls.append((prompt, schema, image, timeout))
        value = next(self.responses)
        if isinstance(value, Exception):
            raise value
        return json.dumps(value) if isinstance(value, dict) else value


class ServicesTest(unittest.IsolatedAsyncioTestCase):
    async def test_valid_assessment(self):
        result = await assess_case({'category': 'computer'}, 'Slow laptop', provider=FakeProvider(fixture('slow_laptop')))
        self.assertEqual(result.recommendation, 'troubleshoot')
        self.assertIsNone(result.estimated_repair_cost_paise)

    async def test_factory_operational_steps_cannot_escape_safety_boundary(self):
        unsafe = copy.deepcopy(fixture('slow_laptop'))
        unsafe['steps'][0]['instruction'] = 'Bypass the pressure interlock and run the machine.'
        result = await assess_case({'category':'factory_machine'}, 'Pressure leak', provider=FakeProvider(unsafe))
        self.assertEqual(result.recommendation, 'professional_repair')
        self.assertEqual(len(result.steps), 1)
        self.assertNotIn('Bypass', result.steps[0].instruction)
        self.assertIn('qualified technician', result.steps[0].instruction)

    async def test_retry_malformed_once(self):
        provider = FakeProvider('not json', fixture('slow_laptop'))
        await assess_case({}, 'Slow', provider=provider)
        self.assertEqual(len(provider.calls), 2)

    async def test_twice_invalid_fails(self):
        with self.assertRaises(ProviderError):
            await assess_case({}, 'Slow', provider=FakeProvider('{}', '{}'))

    async def test_reject_fabricated_citation_and_price(self):
        for field, value in [('evidence', [{'source_id': 'fake', 'title': 'Manual', 'url': None}]),
                             ('estimated_repair_cost_paise', 50000)]:
            bad = copy.deepcopy(fixture('slow_laptop'))
            bad[field] = value
            with self.assertRaises(ProviderError):
                await assess_case({}, 'Slow', provider=FakeProvider(bad, bad))

    async def test_image_forwarded_and_uncertainty(self):
        image = b'\x89PNG\r\n\x1a\n' + b'demo'
        provider = FakeProvider(fixture('unreadable_screenshot')['screenshot_advice'])
        result = await explain_screenshot(image, 'What next?', provider=provider)
        self.assertTrue(result.limitations)
        self.assertEqual(provider.calls[0][2], image)
        self.assertIsNone(result.suggested_actions[0].visible_label)

    async def test_bad_image_rejected_before_provider(self):
        provider = FakeProvider()
        with self.assertRaises(AIInputError):
            await explain_screenshot(b'bad', 'What next?', provider=provider)
        self.assertEqual(provider.calls, [])

    async def test_provider_failure_and_timeout(self):
        for error in [ProviderError('unavailable'), TimeoutError()]:
            with self.assertRaises(ProviderError):
                await assess_case({}, 'Slow', provider=FakeProvider(error))

    def test_missing_key_explicit(self):
        with patch.dict('os.environ', {}, clear=True):
            with self.assertRaisesRegex(ProviderError, 'GEMINI_API_KEY'):
                GeminiProvider()

    async def test_gemini_request_contract(self):
        class Response:
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
            def read(self):
                return json.dumps({'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': '{}'}]}}]}).encode()
        with patch('urllib.request.urlopen', return_value=Response()) as send:
            await GeminiProvider('test-secret', 'test-model').generate('Question', {'type': 'object'}, b'\xff\xd8\xffdemo', 20)
            request = send.call_args.args[0]
            self.assertNotIn('test-secret', request.full_url)
            body = json.loads(request.data)
            self.assertEqual(body['generationConfig']['responseFormat']['text']['mimeType'], 'application/json')
            self.assertEqual(body['contents'][0]['parts'][1]['inlineData']['mimeType'], 'image/jpeg')

    async def test_http_failure_redacts_secret(self):
        failure = urllib.error.HTTPError('https://example.com', 403, 'test-secret', {}, None)
        with patch('urllib.request.urlopen', side_effect=failure):
            with self.assertRaises(ProviderError) as caught:
                await GeminiProvider('test-secret', 'test-model').generate('Question', {}, None, 20)
            self.assertNotIn('test-secret', str(caught.exception))

    def test_fixtures_match_contract(self):
        for name in ['slow_laptop', 'unreadable_screenshot', 'factory_fault']:
            data = fixture(name)
            Analysis.model_validate(data.get('analysis', data))
        ScreenshotAdvice.model_validate(fixture('unreadable_screenshot')['screenshot_advice'])
        self.assertEqual(fixture('factory_fault')['recommendation'], 'professional_repair')


if __name__ == '__main__':
    unittest.main()
