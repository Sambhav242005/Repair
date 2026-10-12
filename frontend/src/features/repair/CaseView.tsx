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
  AlertTriangle,
  Clock,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Trash2,
  Wrench,
  Check,
  X,
  AlertOctagon,
  Award,
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
          backgroundColor: '#ffffff',
          border: '2px dashed #cbd5e1',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#ebf5ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <Wrench size={32} color="#0071ce" />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          No Repair Guide Selected
        </h3>
        <p style={{ maxWidth: '420px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
          Select an equipment case from the left sidebar or submit a new diagnosis to generate step-by-step repair instructions.
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
      setOutcomeSuccessMsg(`Outcome "${outcome}" recorded successfully! Retained mass metrics updated.`);
      onRefreshCase();
    } catch (err: any) {
      onError(err);
    } finally {
      setSavingOutcome(false);
    }
  };

  const analysis = currentCase.analysis;

  return (
    <div
      className="card"
      id={`case-view-${currentCase.id}`}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '28px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Breadcrumb Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#0071ce',
          marginBottom: '14px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        <span>iFixit Repair Manual</span>
        <ChevronRight size={12} color="#94a3b8" />
        <span>{asset?.category || 'Hardware'}</span>
        <ChevronRight size={12} color="#94a3b8" />
        <span style={{ color: '#475569' }}>Case #{currentCase.id}</span>
      </div>

      {/* Hero Guide Title & Meta */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px',
          borderBottom: '2px solid #f1f5f9',
          paddingBottom: '20px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}
          >
            {asset ? asset.name : currentCase.asset_id} Troubleshooting & Repair
          </h1>
          <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.5 }}>
            <strong>Reported Symptoms:</strong> {currentCase.symptoms}
          </p>
        </div>

        <button
          id="btn-delete-case"
          onClick={() => onDeleteCase(currentCase.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            flexShrink: 0,
          }}
          title="Delete this repair case"
        >
          <Trash2 size={14} />
          <span>Delete Guide</span>
        </button>
      </div>

      {/* iFixit Guide Stats Pill Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Clock size={22} color="#0071ce" />
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Time Estimate</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>15–30 Mins</div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Wrench size={22} color="#f59e0b" />
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Difficulty</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#b45309' }}>Moderate</div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Award size={22} color="#059669" />
          <div>
            <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>Repairability</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#065f46' }}>8 / 10 Score</div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#ebf5ff',
            border: '1px solid #b9e1ff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <ShieldCheck size={22} color="#0071ce" />
          <div>
            <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase' }}>Mass Retained</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0c4a6e' }}>
              {asset?.mass_kg ? `${asset.mass_kg} kg` : '1.65 kg'}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Trigger Banner if Not Ready */}
      {currentCase.status !== 'ready' && currentCase.status !== 'closed' && (
        <div
          style={{
            backgroundColor: '#ebf5ff',
            border: '1px solid #b9e1ff',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          <Sparkles size={36} color="#0071ce" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Generate Guided Step-by-Step Instructions
          </h3>
          <p style={{ maxWidth: '480px', margin: '0 auto 16px auto', fontSize: '14px', color: '#475569' }}>
            AI evaluates hardware telemetry, memory/disk observations, and manufacturer documentation to structure safe repair steps.
          </p>
          <button
            id="btn-analyse-case"
            className="btn-primary"
            onClick={handleStartAnalysis}
            disabled={analysing}
            style={{ padding: '12px 28px', fontSize: '15px' }}
          >
            {analysing ? (
              <>
                <span className="pulse-dot pulse-dot-cyan" />
                <span>Structuring Repair Steps...</span>
              </>
            ) : (
              <>
                <Wrench size={18} />
                <span>Generate iFixit Repair Guide</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* When Analysis is Available */}
      {analysis && (
        <>
          {/* Diagnostic Summary & Tools Box */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px',
              marginBottom: '28px',
            }}
          >
            {/* Diagnosis Overview */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} color="#0071ce" />
                <span>Diagnosis Summary</span>
              </h3>
              <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, marginBottom: '14px' }}>
                {analysis.summary}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span className="badge badge-operational">Safe Non-Invasive First</span>
                <span className="badge badge-maintenance">Thermal & Disk Check</span>
              </div>
            </div>

            {/* Tools & Parts Checklist (Iconic iFixit feature) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={18} color="#f59e0b" />
                <span>Recommended Tools & Items</span>
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13.5px', color: '#475569' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="ifixit-dot blue" />
                  <span>Precision Screwdriver (Phillips #00 / Torx)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="ifixit-dot orange" />
                  <span>Plastic Opening Tool / Anti-Static Spudger</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="ifixit-dot green" />
                  <span>Can of Compressed Air or Clean Brush</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="ifixit-dot red" />
                  <span>High-performance thermal paste / isopropyl alcohol</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Hypotheses List */}
          {analysis.hypotheses && analysis.hypotheses.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '28px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
                Fault Hypotheses & Likelihood
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analysis.hypotheses.map((hyp, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{hyp.cause}</div>
                      {hyp.evidence && hyp.evidence.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          Evidence: {hyp.evidence.join(' • ')}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: hyp.likelihood === 'high' ? '#fee2e2' : '#fef3c7',
                        color: hyp.likelihood === 'high' ? '#b91c1c' : '#b45309',
                        border: `1px solid ${hyp.likelihood === 'high' ? '#fca5a5' : '#fde68a'}`,
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {hyp.likelihood} Likelihood
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP BY STEP INSTRUCTIONS (The iconic iFixit section!) */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                Step-by-Step Instructions
              </h2>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                {analysis.steps.filter((s) => s.status === 'completed').length} of {analysis.steps.length} Steps Completed
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {analysis.steps.map((step, idx) => {
                const stepNum = idx + 1;
                const dotColors = ['red', 'orange', 'yellow', 'green', 'blue'];
                const dotColor = dotColors[idx % dotColors.length];

                return (
                  <div
                    key={step.id}
                    id={`step-card-${step.id}`}
                    style={{
                      border: '2px solid',
                      borderColor: step.status === 'completed' ? '#a7f3d0' : '#e2e8f0',
                      borderRadius: '12px',
                      padding: '24px',
                      backgroundColor: step.status === 'completed' ? '#f0fdf4' : '#ffffff',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Step Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="ifixit-step-pill">
                          Step {stepNum}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className={`ifixit-dot ${dotColor}`} />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                            Action Item #{step.id}
                          </span>
                        </div>
                      </div>

                      {/* Step Status Badges / Controls */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleStepStatusChange(step.id, 'completed')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: step.status === 'completed' ? '#10b981' : '#f1f5f9',
                            color: step.status === 'completed' ? '#ffffff' : '#475569',
                            border: `1px solid ${step.status === 'completed' ? '#059669' : '#cbd5e1'}`,
                          }}
                        >
                          <Check size={14} />
                          <span>Complete</span>
                        </button>

                        <button
                          onClick={() => handleStepStatusChange(step.id, 'failed')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: step.status === 'failed' ? '#ef4444' : '#f1f5f9',
                            color: step.status === 'failed' ? '#ffffff' : '#475569',
                            border: `1px solid ${step.status === 'failed' ? '#dc2626' : '#cbd5e1'}`,
                          }}
                        >
                          <X size={14} />
                          <span>Failed</span>
                        </button>
                      </div>
                    </div>

                    {/* Step Instruction */}
                    <p style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600, lineHeight: 1.6, marginBottom: '14px' }}>
                      {step.instruction}
                    </p>

                    {/* Expected Result Callout */}
                    {step.expected_result && (
                      <div className="callout-box callout-success">
                        <CheckCircle size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ display: 'block', marginBottom: '2px' }}>Expected Outcome:</strong>
                          <span>{step.expected_result}</span>
                        </div>
                      </div>
                    )}

                    {/* Stop Condition / Caution Callout */}
                    {step.stop_condition && (
                      <div className="callout-box callout-warning">
                        <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ display: 'block', marginBottom: '2px' }}>⚠️ Caution / Stop Condition:</strong>
                          <span>{step.stop_condition}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Record Case Outcome Box */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '2px solid #0071ce',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 14px rgba(0, 113, 206, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <ShieldCheck size={24} color="#0071ce" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Record Final Repair Outcome
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
              Confirmed physical repairs contribute directly to verified equipment reuse metrics.
            </p>

            <form onSubmit={handleSaveOutcome}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Repair Result
                  </label>
                  <select
                    id="case-outcome-select"
                    value={outcome || 'repaired'}
                    onChange={(e) => setOutcome(e.target.value as CaseOutcome)}
                    style={{ fontWeight: 600 }}
                  >
                    <option value="repaired">✓ Repaired (Confirmed Reuse)</option>
                    <option value="unresolved">? Unresolved (Needs Parts)</option>
                    <option value="replaced">✖ Replaced / Retired</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Technician Notes & Actions Taken
                  </label>
                  <input
                    id="case-outcome-note"
                    type="text"
                    value={outcomeNote}
                    onChange={(e) => setOutcomeNote(e.target.value)}
                    placeholder="e.g. Cleared thermal intake, cleaned heatsink fins, re-seated RAM."
                  />
                </div>
              </div>

              {outcomeSuccessMsg && (
                <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
                  ✓ {outcomeSuccessMsg}
                </div>
              )}

              <button
                type="submit"
                id="btn-save-outcome"
                className="btn-primary"
                disabled={savingOutcome}
                style={{ padding: '12px 24px' }}
              >
                {savingOutcome ? 'Saving...' : 'Submit Final Repair Record'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
