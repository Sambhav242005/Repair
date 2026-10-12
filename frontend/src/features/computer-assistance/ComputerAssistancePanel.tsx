import React, { useEffect, useState } from 'react';
import { Asset, DesktopSession, DesktopWindow, Diagnostic, ScreenshotAdvice } from '../../types';
import { Activity, Check, CircleStop, Computer, FileText, Image, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { apiClient } from '../../api/client';
import { pollJob } from '../../api/polling';
import { formatBytes, formatKolkata } from '../../utils/datetime';

interface Props {
  assets: Asset[];
  selectedAssetId?: string;
  liveMode: boolean;
  onError: (error: any) => void;
}
type PanelTab = 'desktop' | 'screen' | 'diagnostics';
const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const ComputerAssistancePanel: React.FC<Props> = ({ assets, selectedAssetId, liveMode, onError }) => {
  const [tab, setTab] = useState<PanelTab>('desktop');
  const [windows, setWindows] = useState<DesktopWindow[]>([]);
  const [windowKey, setWindowKey] = useState('');
  const [goal, setGoal] = useState('Display 7 in Calculator');
  const [automationId, setAutomationId] = useState('CalculatorResults');
  const [expectedText, setExpectedText] = useState('Display is 7');
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [diagnosticFile, setDiagnosticFile] = useState<File | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotAdvice, setScreenshotAdvice] = useState<ScreenshotAdvice | null>(null);
  const [question, setQuestion] = useState('What should I check on this screen?');

  const selectedWindow = windows.find((item) => `${item.handle}:${item.process_id}` === windowKey);

  const refreshWindows = async () => {
    if (!liveMode) return;
    try {
      const result = await apiClient.getDesktopWindows();
      setWindows(result);
      if (!result.some((item) => `${item.handle}:${item.process_id}` === windowKey)) setWindowKey('');
    } catch (err) { onError(err); }
  };

  const refreshDiagnostics = async () => {
    try { setDiagnostics(await apiClient.getDiagnostics(selectedAssetId)); }
    catch (err) { onError(err); }
  };

  useEffect(() => {
    if (tab === 'desktop' && liveMode) {
      refreshWindows();
      apiClient.getDesktopSessions().then((items) => { if (items.length) setSession((current) => current || items[0]); }).catch(onError);
    }
    if (tab === 'diagnostics') refreshDiagnostics();
    // Refresh only when the teacher changes the active tool or data source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, liveMode, selectedAssetId]);

  useEffect(() => {
    if (!session || session.status !== 'running') return;
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        await pause(1200);
        if (cancelled) return;
        try {
          const fresh = await apiClient.getDesktopSession(session.id);
          setSession(fresh);
          if (fresh.status !== 'running') return;
        } catch (err) { onError(err); return; }
      }
    };
    void poll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status]);

  const startInspection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!liveMode || !selectedWindow) return;
    setLoading(true);
    try {
      const created = await apiClient.startDesktopInspection({
        window: selectedWindow,
        goal: goal.trim(),
        acceptance: { automation_id: automationId.trim(), name_equals: expectedText },
      });
      setSession(created);
    } catch (err) { onError(err); }
    finally { setLoading(false); }
  };

  const approve = async () => {
    if (!session) return;
    setLoading(true);
    try { setSession(await apiClient.approveDesktopSession(session.id)); }
    catch (err) { onError(err); }
    finally { setLoading(false); }
  };

  const stop = async () => {
    if (!session) return;
    setLoading(true);
    try { setSession(await apiClient.stopDesktopSession(session.id)); }
    catch (err) { onError(err); }
    finally { setLoading(false); }
  };

  const uploadDiagnostic = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!diagnosticFile || !selectedAssetId) return;
    setLoading(true);
    try {
      const parsed = JSON.parse(await diagnosticFile.text());
      await apiClient.createDiagnostic({ ...parsed, asset_id: selectedAssetId });
      setDiagnosticFile(null);
      await refreshDiagnostics();
    } catch (err) { onError(err); }
    finally { setLoading(false); }
  };

  const requestScreenAdvice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!screenshotFile) {
      onError({ error: { code: 'SCREENSHOT_REQUIRED', message: 'Choose a PNG or JPEG screenshot first.' } });
      return;
    }
    setLoading(true);
    setScreenshotAdvice(null);
    try {
      const upload = await apiClient.uploadScreenshot(screenshotFile);
      const { job_id } = await apiClient.requestScreenshotAdvice(upload.id, question);
      const completed = await pollJob<ScreenshotAdvice>(job_id, { intervalMs: 1500, maxWaitMs: 30000 });
      setScreenshotAdvice(completed.result);
    } catch (err) { onError(err); }
    finally { setLoading(false); }
  };

  const tabButton = (key: PanelTab, title: string, icon: React.ReactNode) => (
    <button className={`support-tab ${tab === key ? 'selected' : ''}`} aria-pressed={tab === key} onClick={() => setTab(key)} key={key}>{icon}{title}</button>
  );

  return (
    <section className="support-panel" id="computer-assistance-panel">
      <div className="support-heading">
        <div><p className="eyebrow">COMPUTER &amp; EQUIPMENT SUPPORT</p><h2>Get help with a problem</h2><p>Inspect a native desktop app, ask about a screenshot, or review an imported system report.</p></div>
        <div className="support-tabs" role="group" aria-label="Choose support tool">
          {tabButton('desktop', 'Use a computer', <Computer size={16} />)}
          {tabButton('screen', 'Ask about a screen', <Image size={16} />)}
          {tabButton('diagnostics', 'System reports', <Activity size={16} />)}
        </div>
      </div>

      {tab === 'desktop' && <div className="support-body">
        <div className="support-explainer"><ShieldCheck size={18} /><p><strong>Native computer use.</strong> Clef reviews the current app and proposes one bounded action. Nothing is typed or clicked until you review the proposal and approve it.</p></div>
        {!liveMode ? <div className="support-empty"><Computer size={26} /><h3>Connect the local backend to use a computer</h3><p>Switch to Live data above. Native input is unavailable in sample mode.</p></div> : <div className="desktop-grid">
          <form className="support-form" onSubmit={startInspection}>
            <label>Open app window
              <div className="field-inline"><select value={selectedWindow ? `${selectedWindow.handle}:${selectedWindow.process_id}` : ''} onChange={(event) => setWindowKey(event.target.value)} required>
                <option value="">Choose an open app</option>
                {windows.map((item) => <option key={`${item.handle}:${item.process_id}`} value={`${item.handle}:${item.process_id}`}>{item.application === 'Calculator' ? 'Calculator' : item.application === 'Settings' ? 'Settings' : 'Task Manager'} · window {item.handle}</option>)}
              </select><button type="button" className="icon-action" title="Refresh open windows" aria-label="Refresh open windows" onClick={refreshWindows}><RefreshCw size={16} /></button></div>
            </label>
            <label>What should the computer do?
              <textarea rows={2} maxLength={500} value={goal} onChange={(event) => setGoal(event.target.value)} required placeholder="Describe the task in plain language" />
            </label>
            <div className="support-two-fields">
              <label>Expected result control ID
                <input value={automationId} onChange={(event) => setAutomationId(event.target.value)} maxLength={200} required />
              </label>
              <label>Exact expected text
                <input value={expectedText} onChange={(event) => setExpectedText(event.target.value)} maxLength={200} required />
              </label>
            </div>
            <p className="field-hint">The exact result is your success check. For Calculator, use the result display’s UI Automation ID and the value you expect.</p>
            <button className="btn-primary" type="submit" disabled={loading || !selectedWindow}><Sparkles size={16} />{loading ? 'Inspecting the app…' : 'Inspect and prepare a plan'}</button>
          </form>
          <div className="session-card" aria-live="polite">
            <div className="session-title"><h3>{session ? session.app_title : 'Workflow review'}</h3>{session && <span className={`session-status status-${session.status}`}>{session.status.replace('_', ' ')}</span>}</div>
            {!session ? <p className="muted-copy">Choose an open app and describe a small task. You’ll see the proposed step and debug details here before any input is sent.</p> : <>
              <p className="session-message">{session.message}</p>
              {session.status === 'needs_approval' && <div className="approval-card"><h4>Review proposed computer action</h4><p>{String(session.proposed_action?.expected_effect || session.proposed_action?.operation || 'Action details are in the debug record.')}</p><pre>{JSON.stringify(session.proposed_action, null, 2)}</pre><div className="approval-actions"><button className="btn-primary" disabled={loading} onClick={approve}><Check size={16} /> Approve this action</button><button className="btn-secondary" disabled={loading} onClick={stop}><CircleStop size={16} /> Stop</button></div></div>}
              {session.status === 'running' && <button className="btn-danger" disabled={loading} onClick={stop}><CircleStop size={16} /> Request stop</button>}
              {session.verified_result && <div className="verified-result"><Check size={16} /> Verified visible result: <strong>{session.verified_result}</strong></div>}
              {session.error && <p className="session-error">{session.error}</p>}
              <details className="debug-details"><summary>Decision trace &amp; debug details ({session.debug_events.length})</summary>
                {session.debug_events.length ? <ol>{session.debug_events.map((event, index) => <li key={`${event.at}-${index}`}><strong>{event.event}</strong><time>{formatKolkata(event.at)}</time><pre>{JSON.stringify(event.data ?? event, null, 2)}</pre></li>)}</ol> : <p className="muted-copy">No debug events have been recorded yet.</p>}
              </details>
            </>}
          </div>
        </div>}
      </div>}

      {tab === 'screen' && <div className="support-body">
        <div className="support-explainer"><Image size={18} /><p><strong>Guidance only.</strong> The model can describe visible controls and suggest steps from the image. This tool never sends input to your computer.</p></div>
        <form className="support-form screen-form" onSubmit={requestScreenAdvice}>
          <label>Screenshot (PNG or JPEG, up to 5 MB)<input type="file" accept="image/png,image/jpeg" onChange={(event) => {
            const file = event.target.files?.[0] || null;
            if (file && file.size > 5 * 1024 * 1024) {
              setScreenshotFile(null);
              onError({ error: { code: 'FILE_TOO_LARGE', message: 'Choose a screenshot smaller than 5 MB.' } });
              event.target.value = '';
              return;
            }
            setScreenshotFile(file);
          }} /></label>
          <label>What would you like help with?<input value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
          <button className="btn-primary" disabled={loading || !screenshotFile}><Sparkles size={16} />{loading ? 'Reviewing screenshot…' : 'Get screen guidance'}</button>
        </form>
        {screenshotAdvice && <div className="advice-card"><h3>What I can see</h3><ul>{screenshotAdvice.observations.map((item, index) => <li key={index}>{item}</li>)}</ul><h3>Suggested next steps</h3><ol>{screenshotAdvice.suggested_actions.map((item, index) => <li key={index}>{item.instruction}{item.visible_label && <> — look for <strong>{item.visible_label}</strong></>}</li>)}</ol>{screenshotAdvice.limitations.length > 0 && <p className="field-hint">Limitations: {screenshotAdvice.limitations.join(' ')}</p>}</div>}
      </div>}

      {tab === 'diagnostics' && <div className="support-body">
        <div className="support-explainer"><FileText size={18} /><p><strong>Imported reports only.</strong> Reports are supplied by the teacher or collected separately; this screen does not scan or change a computer.</p></div>
        <div className="diagnostic-toolbar"><label>Equipment record<select value={selectedAssetId || ''} onChange={(event) => { const match = assets.find((item) => item.id === event.target.value); if (match) void apiClient.getDiagnostics(match.id).then(setDiagnostics).catch(onError); }}><option value="">Select equipment</option>{assets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><form className="import-form" onSubmit={uploadDiagnostic}><label>Import diagnostic JSON<input type="file" accept="application/json,.json" onChange={(event) => setDiagnosticFile(event.target.files?.[0] || null)} /></label><button className="btn-secondary" disabled={!diagnosticFile || !selectedAssetId || loading}>Import report</button></form></div>
        {diagnostics.length === 0 ? <div className="support-empty"><FileText size={24} /><h3>No report saved for this equipment</h3><p>Import a JSON report to keep it with the equipment record.</p></div> : <div className="diagnostic-list">{diagnostics.map((item) => <article key={item.id}><div><strong>{item.os.name} {item.os.version}</strong><small>{formatKolkata(item.collected_at)} · collector {item.collector_version}</small></div><span>{item.cpu.logical_count} CPU threads</span><span>{formatBytes(item.memory.available_bytes)} available memory</span><span>{item.disks.length} disk{item.disks.length === 1 ? '' : 's'}</span></article>)}</div>}
      </div>}
    </section>
  );
};
