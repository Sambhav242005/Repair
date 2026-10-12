import json
import unittest
from unittest.mock import patch
from backend.app.services.ai import OllamaProvider, GeminiProvider, configured_provider, ProviderError, assess_case


class Response:
    def __init__(self, result):
        self.result = result
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def read(self):
        return json.dumps(self.result).encode()


class OllamaTests(unittest.IsolatedAsyncioTestCase):
    def test_selection(self):
        with patch.dict('os.environ', {'AI_PROVIDER': 'ollama'}, clear=True):
            self.assertIsInstance(configured_provider(), OllamaProvider)
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test', 'GEMINI_MODEL': 'test'}, clear=True):
            self.assertIsInstance(configured_provider(), GeminiProvider)
        with patch.dict('os.environ', {'AI_PROVIDER': 'typo'}, clear=True):
            with self.assertRaises(ProviderError):
                configured_provider()

    async def test_cloud_payload_image_and_auth(self):
        with patch('urllib.request.urlopen', return_value=Response({'done': True, 'message': {'content': '{}'}})) as send:
            await OllamaProvider('gemma4:31b-cloud', 'https://ollama.com', 'secret').generate('Question', {'type': 'object'}, b'\xff\xd8\xffdemo', 20)
            request = send.call_args.args[0]
            body = json.loads(request.data)
            self.assertEqual(request.full_url, 'https://ollama.com/api/chat')
            self.assertEqual(request.get_header('Authorization'), 'Bearer secret')
            self.assertFalse(body['stream'])
            self.assertNotIn('format', body)
            self.assertEqual(body['messages'][1]['images'], ['/9j/ZGVtbw=='])
            self.assertIn('schema', body['messages'][1]['content'])

    async def test_local_schema(self):
        with patch('urllib.request.urlopen', return_value=Response({'done': True, 'message': {'content': '{}'}})) as send:
            await OllamaProvider('gemma4:31b', 'http://localhost:11434', '').generate('Question', {'type': 'object'}, None, 20)
            self.assertEqual(json.loads(send.call_args.args[0].data)['format'], {'type': 'object'})

    async def test_json_fence_only(self):
        for raw, expected in [('```json\n{}\n```', '{}'), ('Explanation\n```json\n{}\n```', 'Explanation\n```json\n{}\n```')]:
            with patch('urllib.request.urlopen', return_value=Response({'done': True, 'message': {'content': raw}})):
                result = await OllamaProvider().generate('Q', {}, None, 20)
                self.assertEqual(result, expected)

    async def test_unreachable_and_incomplete(self):
        with patch('urllib.request.urlopen', side_effect=OSError('secret')):
            with self.assertRaises(ProviderError) as error:
                await OllamaProvider().generate('Q', {}, None, 20)
            self.assertNotIn('secret', str(error.exception))
        for result in [{'done': False}, {'done': True, 'done_reason': 'length'}, {'done': True, 'message': {'content': ''}}]:
            with patch('urllib.request.urlopen', return_value=Response(result)):
                with self.assertRaises(ProviderError):
                    await OllamaProvider().generate('Q', {}, None, 20)

    def test_configuration_validation(self):
        for url in ['https://ollama.com/api', 'http://remote.example', 'https://user:secret@example.com']:
            with self.assertRaises(ProviderError):
                OllamaProvider(base_url=url)
        with self.assertRaises(ProviderError):
            OllamaProvider(base_url='https://ollama.com', api_key='')
