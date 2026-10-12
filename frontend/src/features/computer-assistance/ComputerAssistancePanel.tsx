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
  ChevronRight,
  ExternalLink,
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
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        onError({ error: { code: 'FILE_TOO_LARGE', message: 'Screenshot must be under 5MB.' } });
        return;
      }
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setScreenshotPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunScreenshotAdvice = async (e: React.FormEvent) => {
    e.preventDefault();
    setScreenshotLoading(true);
    setScreenshotAdvice(null);
    const abortCtrl = new AbortController();

    try {
      let uploadId = 'upload_mock_1';
      if (screenshotFile) {
        const uploadRes = await apiClient.uploadScreenshot(screenshotFile);
        uploadId = uploadRes.id;
      }

      const { job_id } = await apiClient.requestScreenshotAdvice(uploadId, screenshotQuestion);
      const completedJob = await pollJob<ScreenshotAdvice>(job_id, {
        signal: abortCtrl.signal,
        intervalMs: 2000,
        maxWaitMs: 30000,
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

  // Handler: Playwright Browser assistant
  const handleRunBrowserAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceId) {
      onError({ error: { code: 'VALIDATION_ERROR', message: 'Select an approved source ID.' } });
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
    <div
      className="card"
      id="computer-assistance-panel"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '2px solid #f1f5f9',
          paddingBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ebf5ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Terminal size={18} color="#0071ce" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Computer Assistance &amp; Diagnostics Tools
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Multi-modal investigation: screen inspection advice, sandboxed OEM manual lookup, and system diagnostics.
          </p>
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            gap: '4px',
          }}
        >
          <button
            id="tab-btn-screenshot"
            onClick={() => setActiveTab('screenshot')}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              backgroundColor: activeTab === 'screenshot' ? '#ffffff' : 'transparent',
              color: activeTab === 'screenshot' ? '#0071ce' : '#64748b',
              boxShadow: activeTab === 'screenshot' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Monitor size={14} /> Screen Guidance
          </button>

          <button
            id="tab-btn-browser"
            onClick={() => setActiveTab('browser')}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              backgroundColor: activeTab === 'browser' ? '#ffffff' : 'transparent',
              color: activeTab === 'browser' ? '#0071ce' : '#64748b',
              boxShadow: activeTab === 'browser' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Globe size={14} /> OEM Manuals
          </button>

          <button
            id="tab-btn-diagnostics"
            onClick={() => setActiveTab('diagnostics')}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              backgroundColor: activeTab === 'diagnostics' ? '#ffffff' : 'transparent',
              color: activeTab === 'diagnostics' ? '#0071ce' : '#64748b',
              boxShadow: activeTab === 'diagnostics' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <HardDrive size={14} /> PC Telemetry
          </button>
        </div>
      </div>

      {/* TAB 1: Screenshot Guidance */}
      {activeTab === 'screenshot' && (
        <div id="tab-content-screenshot" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#92400e',
            }}
          >
            <Info size={16} color="#d97706" style={{ flexShrink: 0 }} />
            <span>
              <strong>Visual Guidance Only:</strong> This panel identifies visible controls and buttons from your image. It never executes or clicks actions inside the computer.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Input Form & Preview */}
            <form onSubmit={handleRunScreenshotAdvice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Upload Screen Snapshot (PNG / JPEG &lt; 5MB)
                </label>
                <input
                  id="input-assistance-screenshot"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleScreenshotSelect}
                  style={{
                    fontSize: '12px',
                    padding: '8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              {screenshotPreview && (
                <div
                  style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
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
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
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
                  <>Analysing Visible Controls...</>
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
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '18px',
                minHeight: '240px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                Vision Inspection Results
              </h3>

              {screenshotLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>Evaluating visual OCR controls with vision model...</p>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Polling 2s intervals</span>
                </div>
              ) : screenshotAdvice ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Observations */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0071ce', textTransform: 'uppercase' }}>
                      Visible UI Observations:
                    </h4>
                    <ul style={{ paddingLeft: '16px', fontSize: '13px', color: '#334155', marginTop: '6px' }}>
                      {screenshotAdvice.observations.map((obs, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{obs}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggested Actions */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                      Suggested Next Steps:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      {screenshotAdvice.suggested_actions.map((act, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            fontSize: '12.5px',
                            color: '#065f46',
                          }}
                        >
                          <div><strong>Step:</strong> {act.instruction}</div>
                          {act.visible_label && (
                            <div style={{ marginTop: '4px', color: '#047857' }}>
                              Visible Label: <code>"{act.visible_label}"</code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Limitations */}
                  {screenshotAdvice.limitations.length > 0 && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                      <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                        Vision Model Limitations:
                      </h4>
                      <ul style={{ paddingLeft: '16px', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {screenshotAdvice.limitations.map((lim, idx) => (
                          <li key={idx}>{lim}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
                  Upload a screenshot and click "Request Visual Guidance" to test AI control observation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Playwright Browser Assistant */}
      {activeTab === 'browser' && (
        <div id="tab-content-browser" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#ebf5ff',
              border: '1px solid #b9e1ff',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#0369a1',
            }}
          >
            <Globe size={16} color="#0071ce" style={{ flexShrink: 0 }} />
            <span>
              <strong>Sandboxed OEM Manual Lookup (FR-07):</strong> Headless Playwright launches an isolated context, queries verified manufacturer technical portals, and logs the execution trace.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Run Form */}
            <form onSubmit={handleRunBrowserAssistant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Approved Documentation Source ID *
                </label>
                <select
                  id="select-browser-source"
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  required
                >
                  {browserSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Target Equipment Asset
                </label>
                <select
                  id="select-browser-asset"
                  value={browserAssetId}
                  onChange={(e) => setBrowserAssetId(e.target.value)}
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
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
                  <>Querying OEM Manual Source...</>
                ) : (
                  <>
                    <Play size={14} /> Launch Sandboxed Manual Lookup
                  </>
                )}
              </button>
            </form>

            {/* Browser Result & Playwright Trace */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '18px',
                minHeight: '240px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                Playwright Action Trace &amp; Page Extraction
              </h3>

              {browserLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>Launching isolated browser session...</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Timeout limit: 30 seconds</p>
                </div>
              ) : browserResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                      {browserResult.page_title}
                    </h4>
                    <a
                      href={browserResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: '#0071ce', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                    >
                      {browserResult.url} <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Playwright Action Trace */}
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                      Execution Action Trace ({browserResult.trace.length} steps):
                    </span>
                    <div
                      style={{
                        marginTop: '6px',
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
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
                          <span style={{ color: '#334155' }}>
                            <strong style={{ color: '#0071ce' }}>[{tr.action}]</strong> {tr.target}
                          </span>
                          <span
                            style={{
                              color: tr.status === 'succeeded' ? '#059669' : '#dc2626',
                              fontWeight: 700,
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
                      backgroundColor: '#ffffff',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      color: '#334155',
                      borderLeft: '3px solid #0071ce',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <strong>Documentation Extract:</strong> {browserResult.excerpt}
                  </div>

                  {/* AI Advice */}
                  {browserResult.advice && (
                    <div style={{ fontSize: '12.5px', color: '#0369a1', lineHeight: 1.5, backgroundColor: '#ebf5ff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #b9e1ff' }}>
                      <strong>Synthesized Advice:</strong> {browserResult.advice}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
                  Select an approved source and click "Launch Sandboxed Manual Lookup" to inspect execution.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PC Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div id="tab-content-diagnostics" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#065f46',
            }}
          >
            <Info size={16} color="#059669" style={{ flexShrink: 0 }} />
            <span>
              <strong>Read-Only Telemetry (FR-08):</strong> Imports standard system telemetry JSON. Collects only non-sensitive metrics (RAM, partition capacity, CPU threads). Usernames and credentials are fully redacted.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Import / Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Upload Diagnostic JSON from Collector Script
                </label>
                <input
                  id="input-assistance-diag"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleDiagnosticFileUpload}
                  style={{
                    fontSize: '12px',
                    padding: '8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                />
              </div>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Collector CLI Reference
                </h4>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                  Generate safe, read-only telemetry without root privileges:
                </p>
                <pre
                  style={{
                    backgroundColor: '#0f172a',
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
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '18px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                Structured Telemetry Metrics
              </h3>

              {selectedDiagnostic ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Operating System:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedDiagnostic.os.name} {selectedDiagnostic.os.version}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>CPU Cores:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedDiagnostic.cpu.logical_count} Logical Threads
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Physical Memory:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {formatBytes(selectedDiagnostic.memory.available_bytes)} free / {formatBytes(selectedDiagnostic.memory.total_bytes)}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Mounted Disk Partitions:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedDiagnostic.disks.map((d, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: '#334155', fontWeight: 600 }}>{d.label}</span>
                          <span style={{ color: d.free_bytes < 20 * 1024 * 1024 * 1024 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                            {formatBytes(d.free_bytes)} free / {formatBytes(d.total_bytes)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                    Collected at: {formatKolkata(selectedDiagnostic.collected_at)} • Collector v{selectedDiagnostic.collector_version}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
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
