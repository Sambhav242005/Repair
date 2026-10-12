# AI integration handoff

## Provider selection

Gemini remains the default. To use the requested Ollama model, set backend environment:

```dotenv
AI_PROVIDER=ollama
OLLAMA_MODEL=gemma4:31b-cloud
OLLAMA_BASE_URL=http://localhost:11434
```

Install/start Ollama, run `ollama signin`, then `ollama run gemma4:31b-cloud` to confirm account access. The cloud model executes on Ollama's cloud even through localhost; uploaded image/context is sent there. Alternatively set `OLLAMA_BASE_URL=https://ollama.com` and `OLLAMA_API_KEY` for direct cloud access without a local server. The origin must not include `/api`. All existing service functions select the provider automatically; callers can also inject `OllamaProvider(...)`.

Cloud responses use prompt-requested JSON with local Pydantic validation and one malformed-output retry because Ollama Cloud currently does not enforce structured output. For a local model such as `gemma4:31b`, the adapter additionally sends the JSON schema in `format`. There is no automatic provider fallback. No new dependency is required.

Verified through the running local gateway on 2026-10-12: `gemma4:31b-cloud` returned a valid Analysis for a synthetic slow-laptop case and valid ScreenshotAdvice for a blank test PNG, explicitly reporting unreadable controls. The adapter strips a single enclosing JSON Markdown fence; it does not extract JSON from mixed prose. All 18 AI tests pass. Native desktop workflow/selection, debug mode and acceptance status are documented in ../automation/README.md. These smoke checks do not establish diagnostic accuracy or successful native desktop execution.

References: https://docs.ollama.com/api/chat, https://docs.ollama.com/api/authentication, https://docs.ollama.com/capabilities/structured-outputs, https://ollama.com/library/gemma4:31b-cloud.

Implements the AI-owned portion of `00_SRS.md`. No routes, database writes or case lifecycle changes. Backend should import the result models here to avoid duplicate schemas.

Install `python -m pip install -r backend/app/services/ai/requirements.txt` using Python 3.11 or newer. Set `GEMINI_API_KEY` and `GEMINI_MODEL` in the backend process environment; the adjacent `.env.example` is the configuration contribution for the backend owner. Environment files are not loaded automatically. Choose a model with image input and structured output access for your key.

```python
from backend.app.services.ai import assess_case, explain_screenshot, ProviderError

analysis = await assess_case(asset, symptoms, diagnostic, screenshot_bytes, evidence)
advice = await explain_screenshot(image_bytes, question)
```

Asset/diagnostic inputs accept mappings or Pydantic records. Evidence is a sequence of canonical `{source_id,title,url}` records. The optional `summarise_support_page(question, page_title, excerpt, source)` returns text; it does not open a browser. Functions are async; backend awaits them inside its existing job runner. Result models support `.model_dump(mode="json")`.

`ProviderError.code` is `PROVIDER_UNAVAILABLE`; map to Job.error and restore the case to open. `AIInputError.code` is `VALIDATION_ERROR`. Never substitute fixtures for failed live requests. Schema-invalid output retries once; network/auth/quota failures do not retry automatically. The operation has a 45-second deadline; individual HTTP attempts have a 20-second socket timeout. Cancellation stops awaiting; the standard-library network worker may finish its request afterward.

Optional null fields always serialize. Citation metadata must exactly match supplied records. Cost fields currently remain null because canonical service inputs have no structured quote field. Prompts require non-invasive checks and technician escalation, but model guidance still requires human judgment; schema validation is not a safety proof. Upload ownership and full image decoding validation remain with backend.

Run offline checks from the repository root: `python -m unittest discover -s tests/ai -v`. Fixtures in `fixtures/ai` have `sample_data: true` and wrap the canonical response in `result`; UI must display a sample-data banner. They are hand-authored expectations, not recorded Gemini outputs.

Live verification: after configuring environment, call assessment with a real symptom record and screenshot advice with a real PNG/JPEG. Verify uncertainty, labels and safety before demonstration. No key/model was available during implementation, so live text/image access and end-to-end HTTP integration remain unverified.

API reference consulted: https://ai.google.dev/api/generate-content and https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en (2026-10-12). Requests use `generationConfig.responseFormat.text`, inline image data and the API-key header.
