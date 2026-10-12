import React, { useState, useEffect } from 'react';
import {
  Asset,
  BrowserSource,
  BrowserResult,
  ScreenshotAdvice,
  Diagnostic,
} from '../../types';
import {
  Monitor,
  Globe,
  HardDrive,
  Upload,
  Play,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { pollJob } from '../../api/polling';
import { formatBytes, formatKolkata } from '../../utils/datetime';

interface ComputerAssistancePanelProps {
  assets: Asset[];
  selectedAssetId?: string;
  onError: (error: any) => void;
}

type PanelTab = 'screenshot' | 'browser' | 'diagnostics';

export const ComputerAssistancePanel: React.FC<ComputerAssistancePanelProps> = ({
  assets,
  selectedAssetId,
  onError,
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('screenshot');

  // --- Screenshot guidance state ---
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotQuestion, setScreenshotQuestion] = useState<string>(
    'What visible controls and buttons should be inspected on this screen?'
  );
  const [screenshotAdvice, setScreenshotAdvice] = useState<ScreenshotAdvice | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState<boolean>(false);

  // --- Browser assistant state ---
  const [browserSources, setBrowserSources] = useState<BrowserSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [browserAssetId, setBrowserAssetId] = useState<string>(selectedAssetId || assets[0]?.id || '');
  const [browserQuestion, setBrowserQuestion] = useState<string>(
    'Retrieve verified manufacturer preventive maintenance and thermal clearance guidelines.'
  );
  const [browserResult, setBrowserResult] = useState<BrowserResult | null>(null);
  const [browserLoading, setBrowserLoading] = useState<boolean>(false);

  // --- Diagnostics state ---
  const [diagnosticsList, setDiagnosticsList] = useState<Diagnostic[]>([]);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<Diagnostic | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState<boolean>(false);

  // Sync selectedAssetId
  useEffect(() => {
    if (selectedAssetId) {
      setBrowserAssetId(selectedAssetId);
    }
  }, [selectedAssetId]);

  // Load browser sources & diagnostics
  useEffect(() => {
    apiClient
      .getBrowserSources()
      .then((sources) => {
        setBrowserSources(sources);
        if (sources.length > 0) {
          setSelectedSourceId(sources[0].id);
        }
      })
      .catch((err) => console.warn('Failed to load browser sources:', err));

    // Load initial diagnostics from mock/api
    if (browserAssetId) {
      // In mock engine, diag_1 exists
      setSelectedDiagnostic({
        id: 'diag_1',
        asset_id: 'asset_laptop_1',
        collected_at: '2026-10-12T08:30:00Z',
        os: { name: 'Ubuntu GNU/Linux', version: '24.04 LTS (x86_64)' },
        memory: { total_bytes: 16777216000, available_bytes: 1887436800 },
        disks: [{ label: '/ (NVMe Root)', total_bytes: 512110190592, free_bytes: 17179869184 }],
        cpu: { logical_count: 8 },
        collector_version: '1.0.0-cli-safe',
      });
    }
  }, [browserAssetId]);

  // Handler: Screenshot upload & advice
  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRunScreenshotAdvice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotFile && !screenshotPreview) {
      // Create a dummy canvas snapshot if none selected to demonstrate immediately
      setScreenshotPreview('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" fill="%231e293b"><rect width="400" height="250"/><text x="50" y="50" fill="%23fff" font-size="16">System Storage Settings</text><rect x="50" y="80" width="300" height="25" fill="%23f43f5e"/><text x="60" y="98" fill="%23fff" font-size="12">C: Drive - 96% Full (16 GB Free)</text><rect x="50" y="130" width="160" height="30" rx="4" fill="%230ea5e9"/><text x="65" y="150" fill="%23fff" font-size="12">Clean up system files</text></svg>');
    }

    setScreenshotLoading(true);
    setScreenshotAdvice(null);
    const abortCtrl = new AbortController();

    try {
      let scrId = 'scr_demo_1';
      if (screenshotFile) {
        const uploadRes = await apiClient.uploadScreenshot(screenshotFile);
        scrId = uploadRes.id;
      }
      const { job_id } = await apiClient.requestScreenshotAdvice(scrId, screenshotQuestion);
      const completedJob = await pollJob<ScreenshotAdvice>(job_id, {
        signal: abortCtrl.signal,
        intervalMs: 2000,
      });
      setScreenshotAdvice(completedJob.result);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        onError(err);
      }
    } finally {
      setScreenshotLoading(false);
    }
  };

  // Handler: Playwright Browser Assistant
  const handleRunBrowserAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceId) {
      onError({ error: { code: 'VALIDATION_ERROR', message: 'Please select an approved documentation source.' } });
      return;
    }

    setBrowserLoading(true);
    setBrowserResult(null);
    const abortCtrl = new AbortController();

    try {
      const { job_id } = await apiClient.startBrowserRun(browserAssetId, selectedSourceId, browserQuestion);
      const completedJob = await pollJob<BrowserResult>(job_id, {
        signal: abortCtrl.signal,
        intervalMs: 2000,
        maxWaitMs: 30000,
      });
      setBrowserResult(completedJob.result);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        onError(err);
      }
    } finally {
      setBrowserLoading(false);
    }
  };

  // Handler: Diagnostics upload
  const handleDiagnosticFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDiagnosticsLoading(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const created = await apiClient.createDiagnostic({
        ...parsed,
        asset_id: browserAssetId || 'asset_laptop_1',
      });
      setSelectedDiagnostic(created);
    } catch (err: any) {
      onError(err);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  return (
    <div className="card" id="computer-assistance-panel" style={{ padding: '24px', marginTop: '24px' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={20} color="var(--brand-cyan)" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-bright)' }}>
              Computer Assistance &amp; Diagnostics Panel
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Multi-modal investigation: screenshot vision, sandboxed Playwright browser navigation, and host telemetry.
          </p>
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            id="tab-btn-screenshot"
            onClick={() => setActiveTab('screenshot')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              background: activeTab === 'screenshot' ? 'var(--brand-cyan)' : 'transparent',
              color: activeTab === 'screenshot' ? '#ffffff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Monitor size={14} /> Screenshot Guidance
          </button>

          <button
            id="tab-btn-browser"
            onClick={() => setActiveTab('browser')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              background: activeTab === 'browser' ? 'var(--brand-cyan)' : 'transparent',
              color: activeTab === 'browser' ? '#ffffff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Globe size={14} /> Browser Assistant
          </button>

          <button
            id="tab-btn-diagnostics"
            onClick={() => setActiveTab('diagnostics')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              background: activeTab === 'diagnostics' ? 'var(--brand-cyan)' : 'transparent',
              color: activeTab === 'diagnostics' ? '#ffffff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <HardDrive size={14} /> PC Diagnostics
          </button>
        </div>
      </div>

      {/* TAB 1: Screenshot Guidance */}
      {activeTab === 'screenshot' && (
        <div id="tab-content-screenshot" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: '#fde68a',
            }}
          >
            <Info size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>
              <strong>Contract Rule:</strong> Screenshot response provides visual control guidance only. It is never labeled as an executed action on the user’s computer.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Input Form & Preview */}
            <form onSubmit={handleRunScreenshotAdvice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Upload Screen Snapshot (PNG / JPEG &lt; 5MB)
                </label>
                <input
                  id="input-assistance-screenshot"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleScreenshotSelect}
                  style={{ fontSize: '12px', padding: '8px' }}
                />
              </div>

              {screenshotPreview && (
                <div
                  style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-medium)',
                    background: '#000000',
                    textAlign: 'center',
                    padding: '8px',
                  }}
                >
                  <img
                    src={screenshotPreview}
                    alt="Screen Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px' }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Inspection Question / Context
                </label>
                <input
                  id="input-screenshot-question"
                  type="text"
                  value={screenshotQuestion}
                  onChange={(e) => setScreenshotQuestion(e.target.value)}
                  placeholder="Ask about visible buttons, error text, or menus..."
                />
              </div>

              <button
                id="btn-run-screenshot-advice"
                type="submit"
                disabled={screenshotLoading}
                className="btn-primary"
                style={{ padding: '10px' }}
              >
                {screenshotLoading ? (
                  <>
                    <div className="spinner" /> Analysing Visible Controls (Polling 2s)...
                  </>
                ) : (
                  <>
                    <Play size={14} /> Request Visual Guidance
                  </>
                )}
              </button>
            </form>

            {/* Results Display */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: '18px',
                minHeight: '260px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '12px' }}>
                Vision Inspection Results
              </h3>

              {screenshotLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ width: '28px', height: '28px', marginBottom: '12px' }} />
                  <p style={{ fontSize: '13px' }}>Evaluating visual OCR controls with vision model...</p>
                </div>
              ) : screenshotAdvice ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Observations */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-cyan)', textTransform: 'uppercase' }}>
                      Visible UI Observations:
                    </h4>
                    <ul style={{ paddingLeft: '16px', fontSize: '13px', color: '#e2e8f0', marginTop: '6px' }}>
                      {screenshotAdvice.observations.map((obs, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{obs}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggested Actions */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
                      Suggested Next Actions:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      {screenshotAdvice.suggested_actions.map((act, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                          }}
                        >
                          <div>{act.instruction}</div>
                          {act.visible_label && (
                            <div style={{ marginTop: '4px', color: '#6ee7b7' }}>
                              Visible Label: <code>"{act.visible_label}"</code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Limitations */}
                  {screenshotAdvice.limitations.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
                      <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                        Known Vision Limitations:
                      </h4>
                      <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {screenshotAdvice.limitations.map((lim, idx) => (
                          <li key={idx}>{lim}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: '13px' }}>
                  Upload a screenshot or click "Request Visual Guidance" to test AI control observation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Playwright Browser Assistant */}
      {activeTab === 'browser' && (
        <div id="tab-content-browser" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'rgba(14, 165, 233, 0.08)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: '#93c5fd',
            }}
          >
            <Globe size={16} color="var(--brand-cyan)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Sandboxed Automation (FR-07):</strong> Real Playwright browser launches an isolated context, navigates strictly to approved manufacturer technical URLs, extracts page text, and reports the verifiable action trace. Unknown source IDs are rejected.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Run Form */}
            <form onSubmit={handleRunBrowserAssistant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Approved Documentation Source ID *
                </label>
                <select
                  id="select-browser-source"
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  required
                >
                  {browserSources.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: '#0b101c' }}>
                      {s.title} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target Equipment Asset
                </label>
                <select
                  id="select-browser-asset"
                  value={browserAssetId}
                  onChange={(e) => setBrowserAssetId(e.target.value)}
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id} style={{ background: '#0b101c' }}>
                      {a.name} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Query Context / Search Prompt
                </label>
                <textarea
                  id="textarea-browser-question"
                  rows={3}
                  value={browserQuestion}
                  onChange={(e) => setBrowserQuestion(e.target.value)}
                  placeholder="e.g. Find fan exhaust clearance and maximum thermal rating..."
                />
              </div>

              <button
                id="btn-run-browser-assistant"
                type="submit"
                disabled={browserLoading}
                className="btn-primary"
                style={{ padding: '10px' }}
              >
                {browserLoading ? (
                  <>
                    <div className="spinner" /> Launching Playwright Context (2s poll)...
                  </>
                ) : (
                  <>
                    <Play size={14} /> Launch Sandboxed Browser Run
                  </>
                )}
              </button>
            </form>

            {/* Browser Result & Playwright Trace */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: '18px',
                minHeight: '260px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '12px' }}>
                Playwright Action Trace &amp; Page Extraction
              </h3>

              {browserLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ width: '28px', height: '28px', marginBottom: '12px' }} />
                  <p style={{ fontSize: '13px' }}>Operating Chromium headless browser session...</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Timeout limit: 30 seconds</p>
                </div>
              ) : browserResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                      {browserResult.page_title}
                    </h4>
                    <a
                      href={browserResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: 'var(--brand-cyan)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                    >
                      {browserResult.url}
                    </a>
                  </div>

                  {/* Playwright Action Trace */}
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                      Execution Action Trace ({browserResult.trace.length} steps):
                    </span>
                    <div
                      style={{
                        marginTop: '6px',
                        background: '#070a12',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        padding: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      {browserResult.trace.map((tr, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: '#cbd5e1' }}>
                            <span style={{ color: '#0ea5e9' }}>[{tr.action}]</span> {tr.target}
                          </span>
                          <span
                            style={{
                              color: tr.status === 'succeeded' ? '#34d399' : '#fb7185',
                              fontWeight: 600,
                            }}
                          >
                            ✓ {tr.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#cbd5e1',
                      borderLeft: '3px solid var(--brand-cyan)',
                    }}
                  >
                    <strong>DOM Excerpt:</strong> {browserResult.excerpt}
                  </div>

                  {/* AI Advice */}
                  {browserResult.advice && (
                    <div style={{ fontSize: '12px', color: '#93c5fd', lineHeight: 1.5 }}>
                      <strong>Synthesized Advice:</strong> {browserResult.advice}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: '13px' }}>
                  Select an approved source and launch to inspect the headless browser execution trace.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PC Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div id="tab-content-diagnostics" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: '#a7f3d0',
            }}
          >
            <Info size={16} color="#10b981" style={{ flexShrink: 0 }} />
            <span>
              <strong>Read-Only Telemetry (FR-08):</strong> Imports standard system telemetry JSON. Collects only non-sensitive metrics (RAM, partition capacity, OS kernel). Redacts usernames, credentials, and hostnames. High RAM utilization alone is an observation, not a proof of hardware failure.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Import / Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Upload Diagnostic JSON from Collector Script
                </label>
                <input
                  id="input-assistance-diag"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleDiagnosticFileUpload}
                  style={{ fontSize: '12px', padding: '8px' }}
                />
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                }}
              >
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '8px' }}>
                  Collector CLI Reference
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Generate read-only telemetry safely without root privilege:
                </p>
                <pre
                  style={{
                    background: '#070a12',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: '#38bdf8',
                    overflowX: 'auto',
                  }}
                >
                  python scripts/collect_diagnostics.py --redact-all &gt; diag.json
                </pre>
              </div>
            </div>

            {/* Telemetry Display */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: '18px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '12px' }}>
                Structured Telemetry Metrics
              </h3>

              {selectedDiagnostic ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Operating System:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {selectedDiagnostic.os.name} {selectedDiagnostic.os.version}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>CPU Cores:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {selectedDiagnostic.cpu.logical_count} Logical Threads
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Physical Memory:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {formatBytes(selectedDiagnostic.memory.available_bytes)} free of {formatBytes(selectedDiagnostic.memory.total_bytes)}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Mounted Disk Partitions:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedDiagnostic.disks.map((d, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: '#070a12',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: '#cbd5e1' }}>{d.label}</span>
                          <span style={{ color: d.free_bytes < 20 * 1024 * 1024 * 1024 ? '#fb7185' : '#34d399' }}>
                            {formatBytes(d.free_bytes)} free / {formatBytes(d.total_bytes)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' }}>
                    Collected at: {formatKolkata(selectedDiagnostic.collected_at)} • Collector v{selectedDiagnostic.collector_version}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: '13px' }}>
                  No diagnostic JSON imported yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
