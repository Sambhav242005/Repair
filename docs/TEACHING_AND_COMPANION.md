# Teaching planner and Windows companion

## Syllabus planning

Open **Class & lab planning**. Upload a text PDF, DOCX, UTF-8 TXT, Markdown or CSV (5 MB maximum), or paste your syllabus. Scanned PDFs require OCR before upload. The document reader runs locally; it does not send documents to an AI provider.

Choose **Organize topics with AI** to send the extracted syllabus text to the configured provider (Ollama or Gemini). Source excerpts are validated against the document. Lecture counts and preparation activities are suggestions: review and edit every topic. Alternatively use one topic per line and edit the counts manually.

Set the course/section, teacher, semester dates, weekly lecture slots, holiday/exam dates and reminder lead time. Calendar upload recognizes ISO dates (`YYYY-MM-DD`); manually correct any dates it cannot recognize. Scheduling uses Asia/Kolkata, excludes holiday dates, checks slot overlap, and shows spare or missing slots. It will not publish a plan that cannot finish the syllabus. Times already booked for the same teacher reject publication atomically.

Preview first, then **Save classes and enable reminders**. Publishing the same plan twice does not duplicate lectures. Identical plan requests return the same saved draft. Each lecture appears in Class sessions and can be marked complete. The alert bell includes the topic and preparation notes at the chosen lead time, during class, and when an uncompleted lecture ends. The backend must be running to generate reminders. These are workspace alerts, not email or phone push notifications.

## Local laptop companion

The companion is a separate loopback service on `127.0.0.1:8765`. It has its own SQLite desktop-session database in `%LOCALAPPDATA%/FacultyCompanion` and a local action audit log. It is source-run in this release; an installer/tray UI is future packaging work.

Install backend dependencies into a Python environment, then from the project root run:

```powershell
python -m companion.server
```

Or use `scripts/start_companion.ps1` on Windows or `bash scripts/start_companion.sh` on Mac. Keep its terminal open. It prints a new pairing code on every startup. Open **Local laptop companion** in Cases & troubleshooting and paste that code. The code stays in page memory; reloading requires pairing again. Closing the companion stops local access. See [Mac teammate setup](MAC_TEAMMATE_SETUP.md) for the complete Mac instructions.

You can also open the companion's local pairing page from the interface to copy the code. That page is restricted to a top-level local page and cannot be embedded or fetched by a website.

For an explicitly trusted hosted website, start with its exact HTTPS origin:

```powershell
python -m companion.server --website-origin https://your-faculty-website.example
```

The webpage connects directly to the companion. The browser may require local-network permission; grant it yourself if requested. Hosted deployment/browser compatibility must be validated against the actual deployment origin. There is no automatic permission grant, wildcard CORS, or public network listener.

Available capabilities:

- Read manufacturer/model using Windows CIM.
- On Mac, read the Apple hardware identifier using `sysctl hw.model`, list application-folder names, collect read-only reports with psutil, and launch Calculator, System Settings, Activity Monitor or TextEdit. Native clicking/typing remains Windows-only; physical-Mac acceptance is pending.
- List current-user Start menu app names using `Get-StartApps`.
- Launch Calculator, Settings, Task Manager or Notepad only after an explicit button click.
- Run named read-only system, memory and disk-space checks; show formatted results.
- Run the existing bounded Clef/Gemma computer-use workflow through paired native-session endpoints. A supported app must be open and actions still require the existing proposal approval and independent acceptance checks. Configure `cf` authentication and the AI provider on the companion PC.
- Disconnect stops active companion desktop sessions before clearing the page's pairing code.

General terminal commands, arbitrary app input, remote repair, unattended arbitrary actions, and a Windows installer are not implemented. The companion's approved checks provide the first command-execution capability without exposing a general remote shell.

## Software troubleshooting wording

iFixit labels were presentation branding from the original repair-oriented UI. The app has no required iFixit API integration. The case interface now uses **Software & equipment support** and **Generate troubleshooting guidance**. Evidence links on existing saved cases remain their original sources.
