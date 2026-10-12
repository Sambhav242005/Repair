"""Local native computer-use UI: python -m scripts.desktop_runner."""
import asyncio
import argparse
import json
import queue
import threading
import tkinter as tk
from tkinter import ttk
from backend.app.services.automation.desktop import DesktopSession
from backend.app.services.automation.models import Acceptance
from backend.app.services.automation.windows import WindowsAdapter


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--debug", action="store_true", help="Show workflow, labels, exact Clef request and verification events.")
    parser.add_argument("--inspect-only", action="store_true", help="Call Gemma/Clef without executing desktop input.")
    args = parser.parse_args()
    root = tk.Tk()
    root.title("Repair Before Replace — Native computer use")
    root.geometry("850x650")
    events = queue.Queue()
    windows = []
    current_session = None
    busy = False
    frame = ttk.Frame(root, padding=16)
    frame.pack(fill="both", expand=True)
    ttk.Label(frame, text="Select an app. Only Calculator operations and read-only diagnostic navigation are allowed.").pack(anchor="w")
    ttk.Label(frame, text="Goal and visible control labels go to Ollama/Gemma cloud and Cloudflare Clef. Screenshots stay local.").pack(anchor="w")
    selected = ttk.Combobox(frame, state="readonly", width=75)
    selected.pack(fill="x", pady=8)
    goal = ttk.Entry(frame)
    goal.insert(0, "Display 7 in Calculator")
    ttk.Label(frame, text="Goal").pack(anchor="w")
    goal.pack(fill="x")
    ttk.Label(frame, text="Acceptance automation ID (from Observe)").pack(anchor="w")
    aid = ttk.Entry(frame)
    aid.insert(0, "CalculatorResults")
    aid.pack(fill="x")
    ttk.Label(frame, text="Exact expected accessible name (for English Calculator: Display is 7)").pack(anchor="w")
    expected = ttk.Entry(frame)
    expected.insert(0, "Display is 7")
    expected.pack(fill="x")
    options = ttk.Frame(frame)
    options.pack(fill="x", pady=4)
    debug_enabled = tk.BooleanVar(value=args.debug)
    inspect_only = tk.BooleanVar(value=args.inspect_only)
    ttk.Checkbutton(options, text="Debug: labels, workflow and Clef decisions", variable=debug_enabled).pack(side="left")
    ttk.Checkbutton(options, text="Inspect only — execute no input", variable=inspect_only).pack(side="left", padx=12)
    buttons = ttk.Frame(frame)
    buttons.pack(fill="x", pady=12)
    status = tk.StringVar(value="Ready — select a window and inspect controls.")
    ttk.Label(frame, textvariable=status).pack(anchor="w")
    notebook = ttk.Notebook(frame)
    notebook.pack(fill="both", expand=True)
    output = tk.Text(notebook, height=20, wrap="word")
    debug_output = tk.Text(notebook, height=20, wrap="word")
    notebook.add(output, text="Result / Observed labels")
    notebook.add(debug_output, text="Workflow / Clef debug")

    def worker(function, kind):
        def run():
            try:
                result = asyncio.run(function())
                events.put((kind, result))
            except Exception as exc:
                events.put(("error", str(exc)))
        threading.Thread(target=run, daemon=True).start()

    def refresh():
        nonlocal busy
        if busy:
            return
        busy = True
        worker(lambda: WindowsAdapter().windows(), "windows")

    def chosen():
        index = selected.current()
        if index < 0:
            raise ValueError("Select a window first.")
        return windows[index]

    def observe():
        nonlocal busy
        if busy:
            return
        try:
            adapter = WindowsAdapter(chosen())
            busy = True
            worker(adapter.observe, "observation")
        except Exception as exc:
            status.set(str(exc))

    def start():
        nonlocal current_session, busy
        if busy:
            return
        try:
            debug_output.delete("1.0", "end")
            current_session = DesktopSession(WindowsAdapter(chosen()), goal.get(),
                Acceptance(automation_id=aid.get(), name_equals=expected.get()),
                debug_sink=(lambda event: events.put(("debug",event))) if debug_enabled.get() else None,
                inspect_only=inspect_only.get())
            if debug_enabled.get():
                notebook.select(debug_output)
            busy = True
            status.set("Running — Stop remains available")
            worker(current_session.run, "result")
        except Exception as exc:
            status.set(str(exc))

    def stop():
        if current_session is not None:
            current_session.stop()
            status.set("Stop requested — current input cannot be undone; further actions are blocked.")

    ttk.Button(buttons, text="Refresh windows", command=refresh).pack(side="left", padx=4)
    ttk.Button(buttons, text="Observe", command=observe).pack(side="left", padx=4)
    ttk.Button(buttons, text="Start", command=start).pack(side="left", padx=4)
    tk.Button(buttons, text="STOP", command=stop, bg="#a82020", fg="white", width=15).pack(side="right", padx=4)

    def poll():
        nonlocal windows, busy
        try:
            while True:
                kind, result = events.get_nowait()
                if kind == "debug":
                    debug_output.insert("end", json.dumps(result, indent=2, ensure_ascii=False)+"\n\n")
                    if int(debug_output.index("end-1c").split(".")[0]) > 4000:
                        debug_output.delete("1.0", "1000.0")
                    debug_output.see("end")
                    continue
                busy = False
                if kind == "windows":
                    windows = result
                    selected["values"] = [f"{w.application} — window {w.handle}" for w in windows]
                    if windows:
                        selected.current(0)
                    status.set(f"{len(windows)} supported windows found")
                elif kind == "error":
                    status.set(result)
                else:
                    output.delete("1.0", "end")
                    output.insert("end", json.dumps(result.model_dump(), indent=2))
                    status.set(result.message if kind == "result" else "Observed — select exact acceptance fields above")
        except queue.Empty:
            pass
        root.after(200, poll)

    def close():
        stop()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", close)
    refresh()
    poll()
    root.mainloop()

if __name__ == "__main__":
    main()
