import React, { useState, useEffect } from 'react';
import {
  Case,
  Asset,
  StepStatus,
  CaseOutcome,
  Recommendation,
  Likelihood,
} from '../../types';
import {
  Sparkles,
  CheckCircle,
  AlertOctagon,
  Clock,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { pollJob } from '../../api/polling';
import { formatKolkata, formatPaise } from '../../utils/datetime';

interface CaseViewProps {
  currentCase: Case | null;
  asset: Asset | null;
  onRefreshCase: () => void;
  onDeleteCase: (id: string) => void;
  onError: (error: any) => void;
}

export const CaseView: React.FC<CaseViewProps> = ({
  currentCase,
  asset,
  onRefreshCase,
  onDeleteCase,
  onError,
}) => {
  const [analysing, setAnalysing] = useState<boolean>(false);
  const [outcome, setOutcome] = useState<CaseOutcome>(currentCase?.outcome || 'repaired');
  const [outcomeNote, setOutcomeNote] = useState<string>(currentCase?.outcome_note || '');
  const [savingOutcome, setSavingOutcome] = useState<boolean>(false);
  const [outcomeSuccessMsg, setOutcomeSuccessMsg] = useState<string | null>(null);

  // Sync state if case changes
  useEffect(() => {
    if (currentCase) {
      setOutcome(currentCase.outcome || 'repaired');
      setOutcomeNote(currentCase.outcome_note || '');
      setOutcomeSuccessMsg(null);
    }
  }, [currentCase?.id]);

  if (!currentCase) {
    return (
      <div
        className="card"
        id="case-view-empty"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          padding: '40px 20px',
        }}
      >
        <Sparkles size={42} color="var(--brand-cyan)" style={{ marginBottom: '14px', opacity: 0.4 }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
          No Active Investigation Selected
        </h3>
        <p style={{ maxWidth: '420px', fontSize: '13px' }}>
          Select an existing case from the history panel or submit a new fault description on the left to review sequential AI repair guidance.
        </p>
      </div>
    );
  }

  const handleStartAnalysis = async () => {
    setAnalysing(true);
    const abortCtrl = new AbortController();
    try {
      const { job_id } = await apiClient.analyseCase(currentCase.id);
      await pollJob(job_id, { signal: abortCtrl.signal, intervalMs: 2000 });
      onRefreshCase();
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        onError(err);
      }
    } finally {
      setAnalysing(false);
    }
  };

  const handleStepStatusChange = async (stepId: string, newStatus: StepStatus) => {
    try {
      await apiClient.updateStepStatus(currentCase.id, stepId, newStatus);
      onRefreshCase();
    } catch (err: any) {
      onError(err);
    }
  };

  const handleSaveOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) {
      onError({ error: { code: 'VALIDATION_ERROR', message: 'Please select an outcome.' } });
      return;
    }
    setSavingOutcome(true);
    setOutcomeSuccessMsg(null);
    try {
      await apiClient.recordOutcome(currentCase.id, outcome, outcomeNote);
      setOutcomeSuccessMsg(`Outcome "${outcome}" recorded successfully! Updated confirmed impact metrics.`);
      onRefreshCase();
    } catch (err: any) {
      onError(err);
    } finally {
      setSavingOutcome(false);
    }
  };

  const getRecommendationBadge = (rec: Recommendation) => {
    switch (rec) {
      case 'troubleshoot':
        return (
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            ✓ Recommended: Non-Invasive Troubleshooting
          </span>
        );
      case 'professional_repair':
        return (
          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            ▲ Technician Escalation Recommended
          </span>
        );
      case 'replace':
        return (
          <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            ✖ Replacement Considered (Irreparable)
          </span>
        );
      case 'insufficient_evidence':
        return (
          <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' }}>
            ? Insufficient Telemetry Evidence
          </span>
        );
    }
  };

  const getLikelihoodBadge = (likelihood: Likelihood) => {
    switch (likelihood) {
      case 'high':
        return <span style={{ color: '#f43f5e', fontWeight: 700, fontSize: '11px' }}>HIGH LIKELIHOOD</span>;
      case 'medium':
        return <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '11px' }}>MEDIUM LIKELIHOOD</span>;
      case 'low':
        return <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '11px' }}>LOW LIKELIHOOD</span>;
    }
  };

  const analysis = currentCase.analysis;

  return (
    <div className="card" id={`case-view-${currentCase.id}`} style={{ padding: '24px' }}>
      {/* Case Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--brand-cyan)',
                background: 'rgba(14, 165, 233, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              CASE {currentCase.id}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '4px',
                background:
                  currentCase.status === 'ready'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : currentCase.status === 'analysing'
                    ? 'rgba(14, 165, 233, 0.15)'
                    : currentCase.status === 'closed'
                    ? 'rgba(148, 163, 184, 0.15)'
                    : 'rgba(245, 158, 11, 0.15)',
                color:
                  currentCase.status === 'ready'
                    ? '#34d399'
                    : currentCase.status === 'analysing'
                    ? '#38bdf8'
                    : currentCase.status === 'closed'
                    ? '#94a3b8'
                    : '#fbbf24',
              }}
            >
              {currentCase.status === 'analysing' ? (
                <>
                  <span className="pulse-dot pulse-dot-cyan" style={{ marginRight: '6px' }} />
                  Analysing...
                </>
              ) : (
                `Status: ${currentCase.status}`
              )}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Created: {formatKolkata(currentCase.created_at)}
            </span>
          </div>

          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-bright)', wordBreak: 'break-word' }}>
            {asset ? asset.name : currentCase.asset_id}
          </h2>
          <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px', wordBreak: 'break-word', lineHeight: 1.5 }}>
            <strong>Symptoms:</strong> {currentCase.symptoms}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            id="btn-delete-case"
            onClick={() => onDeleteCase(currentCase.id)}
            style={{
              color: 'var(--text-dim)',
              padding: '6px 8px',
              borderRadius: '6px',
            }}
            title="Delete this repair case"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Analysis Content or Analysing Trigger */}
      {!analysis ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)',
            marginBottom: '24px',
          }}
        >
          <Sparkles size={36} color="var(--brand-cyan)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
            AI Diagnostic Assessment Pending
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 16px' }}>
            Submit this case to the backend Gemini AI engine to cross-reference equipment symptoms against safe sequential recovery steps.
          </p>

          <button
            id="btn-analyse-case"
            onClick={handleStartAnalysis}
            disabled={analysing || currentCase.status === 'analysing'}
            className="btn-primary"
            style={{ padding: '10px 24px' }}
          >
            {analysing || currentCase.status === 'analysing' ? (
              <>
                <div className="spinner" /> Evaluating Telemetry (2s polling)...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Run Diagnostic Assessment
              </>
            )}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Banner */}
          <div
            id="case-analysis-summary"
            style={{
              padding: '16px 20px',
              backgroundColor: 'rgba(14, 165, 233, 0.08)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--brand-cyan)" />
                <strong style={{ fontSize: '14px', color: 'var(--text-bright)' }}>
                  Diagnostic Assessment &amp; Guidance
                </strong>
              </div>
              {getRecommendationBadge(analysis.recommendation)}
            </div>

            <p style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {analysis.summary}
            </p>

            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span>
                Estimated Repair Cost:{' '}
                <strong style={{ color: '#38bdf8' }}>{formatPaise(analysis.estimated_repair_cost_paise)}</strong>
              </span>
              {analysis.cost_basis && (
                <span>
                  Cost Basis: <em>{analysis.cost_basis}</em>
                </span>
              )}
            </div>
          </div>

          {/* Hypotheses and Uncertainties */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Hypotheses */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '10px' }}>
                Hypotheses &amp; Potential Causes
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analysis.hypotheses.map((h, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--brand-cyan)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{h.cause}</strong>
                      {getLikelihoodBadge(h.likelihood)}
                    </div>
                    {h.evidence.length > 0 && (
                      <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        {h.evidence.map((ev, eIdx) => (
                          <li key={eIdx}>{ev}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Uncertainties & Evidence */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '10px' }}>
                Known Uncertainties &amp; Verification Gaps
              </h4>
              <ul style={{ paddingLeft: '16px', fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {analysis.uncertainties.map((u, uIdx) => (
                  <li key={uIdx}>{u}</li>
                ))}
              </ul>

              {analysis.evidence.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Documented Evidence References:
                  </h5>
                  {analysis.evidence.map((ev, idx) => (
                    <div key={idx} style={{ fontSize: '12px', color: 'var(--brand-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ChevronRight size={12} /> {ev.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Safe Ordered Steps (FR-03 & FR-04) */}
          <div id="repair-steps-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-bright)' }}>
                Sequential Safe Troubleshooting Steps
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                FR-04: Completing steps does not imply verified repair.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {analysis.steps.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isFailed = step.status === 'failed';
                const isSkipped = step.status === 'skipped';

                return (
                  <div
                    key={step.id}
                    id={`step-card-${step.id}`}
                    style={{
                      background: isCompleted ? 'rgba(16, 185, 129, 0.06)' : 'rgba(18, 26, 43, 0.65)',
                      border: `1px solid ${
                        isCompleted
                          ? 'rgba(16, 185, 129, 0.3)'
                          : isFailed
                          ? 'rgba(244, 63, 94, 0.3)'
                          : 'var(--border-subtle)'
                      }`,
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isCompleted ? '#10b981' : 'var(--bg-subtle)',
                            color: isCompleted ? '#ffffff' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <strong style={{ fontSize: '14px', color: 'var(--text-bright)', lineHeight: 1.5 }}>
                            {step.instruction}
                          </strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <strong>Expected Result:</strong> {step.expected_result}
                          </div>
                          {step.stop_condition && (
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#fb7185',
                                marginTop: '4px',
                                background: 'rgba(244, 63, 94, 0.1)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                display: 'inline-block',
                              }}
                            >
                              <strong>Stop Condition:</strong> {step.stop_condition}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Dropdown/Selector */}
                      <select
                        id={`select-step-status-${step.id}`}
                        value={step.status}
                        onChange={(e) => handleStepStatusChange(step.id, e.target.value as StepStatus)}
                        style={{
                          width: 'auto',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          background: isCompleted ? '#064e3b' : '#0f172a',
                          color: isCompleted ? '#34d399' : '#e2e8f0',
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="skipped">Skipped</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Outcome Recording Section (FR-05) */}
          <div
            id="outcome-recording-panel"
            style={{
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              marginTop: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={20} color="var(--brand-emerald)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-bright)' }}>
                Record Final Case Outcome
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              FR-05: User records case outcome repaired / unresolved / replaced with a note. Only repaired cases contribute to confirmed retained mass.
            </p>

            {outcomeSuccessMsg && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle size={16} /> {outcomeSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveOutcome} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Outcome Result *
                  </label>
                  <select
                    id="select-case-outcome"
                    value={outcome || ''}
                    onChange={(e) => setOutcome(e.target.value as CaseOutcome)}
                    required
                  >
                    <option value="repaired">Repaired (Operational Restored)</option>
                    <option value="unresolved">Unresolved (Fault Persists)</option>
                    <option value="replaced">Replaced (Decommissioned)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Technician Outcome Note *
                </label>
                <textarea
                  id="textarea-outcome-note"
                  rows={2}
                  required
                  value={outcomeNote}
                  onChange={(e) => setOutcomeNote(e.target.value)}
                  placeholder="e.g. Cleared 24 GB disk caches; thermals stabilized at 68°C under load. Restored to service."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  id="btn-save-case-outcome"
                  type="submit"
                  disabled={savingOutcome}
                  className="btn-primary"
                  style={{ fontSize: '13px', padding: '8px 20px' }}
                >
                  {savingOutcome ? 'Saving Outcome...' : 'Save & Close Case Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
