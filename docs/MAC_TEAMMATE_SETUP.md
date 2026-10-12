# Mac setup for a teammate

This guide runs the faculty website, syllabus planner, backend, and local companion on your own Mac. Your data and pairing code stay on your Mac; you do not connect to Sambhav's Windows laptop.

## What works on Mac

| Feature | Status |
| --- | --- |
| Syllabus/holiday document upload, editable topics and lecture schedules | Implemented |
| AI syllabus organization through configured Ollama/Gemini | Implemented; requires a working provider |
| Class-session completion and topic reminders in the website | Implemented; keep the backend running |
| Detect this Mac and add its equipment record | Implemented; model is the Apple hardware identifier, e.g. Mac14,7 |
| Companion pairing, app list, memory/disk/system reports | Implemented |
| Launch Calculator, System Settings, Activity Monitor, TextEdit | Implemented; explicit button click |
| Clef clicking/typing inside native Mac applications | Not implemented; the current native adapter is Windows UI Automation |
| General terminal access, signed installer, background phone/email reminders | Not implemented |

Mac-specific adapters have automated mocked coverage. A physical Mac acceptance run is still required; this change was developed on Windows.

## 1. Prerequisites and checkout

Use Python **3.11 or newer** (3.12 is suitable), Node.js **22 or newer**, Git, and pnpm. Install them from their official sites or, if you already use Homebrew:

```bash
brew install python@3.12 node pnpm
git clone https://github.com/Sambhav242005/Repair.git
cd Repair
git switch main
git pull --ff-only origin main
```

If you already have the project, run the last three commands from your existing checkout instead of cloning again. Commit your own changes before pulling if Git reports local modifications.

## 2. Set up Python and the frontend

```bash
python3.12 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements.txt
pnpm --dir frontend install --frozen-lockfile
```

If your Python command is `python3` rather than `python3.12`, verify `python3 --version` is at least 3.11 and use it for the first command.

## 3. Configure AI (optional for manual planning)

Create `backend/.env` in a text editor. For the requested Ollama cloud model:

```dotenv
AI_PROVIDER=ollama
OLLAMA_MODEL=gemma4:31b-cloud
OLLAMA_BASE_URL=http://localhost:11434
```

Install and start Ollama on the Mac, sign in using its app or `ollama signin`, and check the exact model is available to your account:

```bash
ollama run gemma4:31b-cloud
```

Cloud-model access requires connectivity and an account entitled to that model. If it is unavailable, choose an available model in `OLLAMA_MODEL`; do not expect offline cloud inference. Manual document reading, topics and schedules still work without AI.

To use Gemini instead, set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and `GEMINI_MODEL` to your own configured values. Never commit `backend/.env` or share API keys. Clef diagnostic review additionally needs the project's `cf` CLI and your own Cloudflare authentication; Windows computer-use setup does not enable Mac native input.

## 4. Run three terminals

**Terminal 1 — backend**, from the project root:

```bash
source backend/.venv/bin/activate
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — frontend**, from the project root:

```bash
pnpm --dir frontend dev
```

**Terminal 3 — companion**, from the project root:

```bash
bash scripts/start_companion.sh
```

Keep all three terminals open. Open **http://localhost:5173/** (use exactly `localhost`, not a different hostname). The companion listens at `127.0.0.1:8765`.

## 5. Pair the companion

1. Open **Cases & troubleshooting → Local laptop companion**.
2. Open the companion's local pairing page, or copy the code from Terminal 3.
3. Paste it into **Companion pairing code** and click **Connect this laptop**.
4. If the browser requests local-network access, review and grant it yourself.
5. Test **Read laptop model**, **Show installed apps**, and **Run read-only check**.
6. Click **Open Calculator** to test an approved launch. On Mac, this launches the app but does not automate its controls.

Do not enable Accessibility or Screen Recording permissions to make the current Windows-only automation work on Mac; there is no Mac native-input adapter in this release. Restarting the companion rotates the pairing code. The audit/session files are under `~/Library/Application Support/FacultyCompanion/`.

## 6. Create a teaching plan

Open **Class & lab planning**, upload the syllabus, review the extracted text, then choose **Organize topics with AI** or **Use one topic per line**. Review lecture counts and preparation notes. Set semester dates, weekly times, and holiday/exam dates. Uploading a calendar recognizes ISO dates (`YYYY-MM-DD`); check them before proceeding. All scheduling currently uses **Asia/Kolkata**, even if the Mac is in another timezone.

Choose **Preview lecture schedule**. Resolve any missing lecture slots, then select **Save classes and enable reminders**. The alert bell shows the topic and preparation notes before each class. Mark lectures complete afterward to track progress. These are website alerts; they require the backend to remain running.

Text PDF, DOCX, TXT, Markdown and CSV are supported. Image/scanned PDFs need OCR first or pasted text.

## 7. Verify and report issues

```bash
source backend/.venv/bin/activate
python -m pip install pytest pytest-asyncio
python -m pytest -q
pnpm --dir frontend test
pnpm --dir frontend build
```

Record your macOS version, Python version, browser name, and the exact failed operation/error. Do not attach pairing codes, API keys, or private course/student documents. Physical-Mac checks to report: model detection, app-list loading, all four launches, memory/disk report, document upload, preview, publish-once, reminders, and disconnect.

For a future hosted website, start the companion with its exact trusted origin:

```bash
bash scripts/start_companion.sh --website-origin https://your-faculty-website.example
```

Hosted browser permissions and compatibility require a separate acceptance test against the actual website URL.

Reference documentation: [Homebrew Python 3.12](https://formulae.brew.sh/formula/python@3.12), [Apple's app-launch command](https://support.apple.com/guide/terminal/execute-commands-and-run-tools-apdb66b5242-0d18-49fc-9c47-a2498b7c91d5/mac), [Ollama cloud sign-in](https://github.com/ollama/ollama/blob/main/docs/cloud.mdx).
