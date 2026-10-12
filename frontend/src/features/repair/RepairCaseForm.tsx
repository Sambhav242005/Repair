import React, { useRef, useState } from 'react';
import { Asset, CreateCaseInput } from '../../types';
import { Upload, FileText, Send, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../api/client';

interface RepairCaseFormProps {
  assets: Asset[];
  selectedAssetId?: string;
  onCaseCreated: (createdCaseId: string) => void;
  onError: (error: any) => void;
}

export const RepairCaseForm: React.FC<RepairCaseFormProps> = ({
  assets,
  selectedAssetId,
  onCaseCreated,
  onError,
}) => {
  const [assetId, setAssetId] = useState<string>(selectedAssetId || assets[0]?.id || '');
  const [symptoms, setSymptoms] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploadedScreenshotId, setUploadedScreenshotId] = useState<string | null>(null);
  const [diagnosticFile, setDiagnosticFile] = useState<File | null>(null);
  const [uploadedDiagnostic, setUploadedDiagnostic] = useState<{id: string; asset_id: string} | null>(null);
  const attachmentEpoch = useRef(0);
  const currentAssetId = useRef(assetId);
  const diagnosticInput = useRef<HTMLInputElement>(null);
  const screenshotInput = useRef<HTMLInputElement>(null);
  const [attachmentNotice, setAttachmentNotice] = useState('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (selectedAssetId) {
      setAssetId(selectedAssetId);
    }
  }, [selectedAssetId]);

  React.useEffect(() => {
    if (currentAssetId.current === assetId) return;
    currentAssetId.current = assetId;
    attachmentEpoch.current += 1;
    if (uploadedDiagnostic || uploadedScreenshotId || uploading) {
      setAttachmentNotice('Equipment changed. Previous attachments were cleared; attach reports for the selected device if needed. Your problem description was kept.');
    }
    setUploadedDiagnostic(null);
    setUploadedScreenshotId(null);
    setDiagnosticFile(null);
    setScreenshotFile(null);
    if (diagnosticInput.current) diagnosticInput.current.value = '';
    if (screenshotInput.current) screenshotInput.current.value = '';
    // Attachment ownership changes only when equipment changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onError({ error: { code: 'VALIDATION_ERROR', message: 'Screenshot exceeds 5 MB limit (00_SRS.md rule).' } });
      return;
    }

    setScreenshotFile(file);
    setUploadedScreenshotId(null);
    const epoch = attachmentEpoch.current;
    const owner = assetId;
    setUploading(true);
    try {
      const res = await apiClient.uploadScreenshot(file);
      if (epoch === attachmentEpoch.current && owner === currentAssetId.current) setUploadedScreenshotId(res.id);
    } catch (err: any) {
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDiagnosticUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024) {
      onError({ error: { code: 'VALIDATION_ERROR', message: 'Diagnostic upload exceeds 100 KB limit.' } });
      return;
    }

    setDiagnosticFile(file);
    setUploadedDiagnostic(null);
    const epoch = attachmentEpoch.current;
    const owner = assetId;
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.os || !parsed.memory || !parsed.disks) {
        throw { error: { code: 'VALIDATION_ERROR', message: 'Diagnostic JSON missing required OS/memory/disk fields.' } };
      }
      const diag = await apiClient.createDiagnostic({
        ...parsed,
        asset_id: owner,
      });
      if (epoch === attachmentEpoch.current && owner === currentAssetId.current) setUploadedDiagnostic({id:diag.id,asset_id:diag.asset_id});
    } catch (err: any) {
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) {
      onError({ error: { code: 'VALIDATION_ERROR', message: 'Please select an asset to investigate.' } });
      return;
    }
    if (!symptoms.trim()) {
      onError({ error: { code: 'VALIDATION_ERROR', message: 'Please describe the observed symptoms or fault.' } });
      return;
    }

    setSubmitting(true);
    try {
      const input: CreateCaseInput = {
        asset_id: assetId,
        symptoms: symptoms.trim(),
        screenshot_id: uploadedScreenshotId,
        diagnostic_id: uploadedDiagnostic?.asset_id === assetId ? uploadedDiagnostic.id : null,
      };
      const created = await apiClient.createCase(input);
      setSymptoms('');
      setScreenshotFile(null);
      setUploadedScreenshotId(null);
      setDiagnosticFile(null);
      setUploadedDiagnostic(null);
      setAttachmentNotice('');
      if (diagnosticInput.current) diagnosticInput.current.value = '';
      if (screenshotInput.current) screenshotInput.current.value = '';
      onCaseCreated(created.id);
    } catch (err: any) {
      onError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const loadSampleDiagnostics = async () => {
    if (!assetId) return;
    const epoch = attachmentEpoch.current;
    const owner = assetId;
    setUploadedDiagnostic(null);
    setUploading(true);
    try {
      const sample = {
        asset_id: owner,
        collected_at: new Date().toISOString(),
        os: { name: 'Ubuntu Linux', version: '24.04 LTS' },
        memory: { total_bytes: 16777216000, available_bytes: 1887436800 },
        disks: [{ label: '/ (Root NVMe)', total_bytes: 512110190592, free_bytes: 17179869184 }],
        cpu: { logical_count: 8 },
        collector_version: '1.0.0-cli-safe',
      };
      const diag = await apiClient.createDiagnostic(sample);
      if (epoch === attachmentEpoch.current && owner === currentAssetId.current) {
        setUploadedDiagnostic({id:diag.id,asset_id:diag.asset_id});
        setDiagnosticFile(new File([JSON.stringify(sample)], 'diagnostics_sample.json'));
      }
    } catch (err: any) {
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="card"
      id="repair-case-form-card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          Report an Equipment Problem
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Describe what happened so the helper can prepare draft troubleshooting guidance.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Asset Selection */}
        <div>
          <label htmlFor="select-case-asset" style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
            Equipment *
          </label>
          <select
            id="select-case-asset"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            required
            disabled={submitting}
            style={{ fontWeight: 600 }}
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.category}) — [{a.status}]
              </option>
            ))}
          </select>
        </div>

        {attachmentNotice && <p role="status" className="planner-notice">{attachmentNotice}</p>}
        {/* Symptoms Textarea */}
        <div>
          <label htmlFor="textarea-symptoms" style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
            What happened? *
          </label>
          <textarea
            id="textarea-symptoms"
            rows={4}
            required
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. 'Laptop fan makes loud rattling noise and CPU throttles under load', 'Spindle vibration alert during cycle #3'..."
            style={{ lineHeight: 1.5 }}
          />
        </div>

        {/* Diagnostic Attachment */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} color="#0071ce" /> PC Diagnostic Telemetry (.json)
            </span>
            <button
              type="button"
              id="btn-use-sample-diag"
              onClick={loadSampleDiagnostics}
              disabled={uploading || submitting || !assetId}
              style={{ fontSize: '11px', color: '#0071ce', fontWeight: 700 }}
            >
              + Use Sample Data
            </button>
          </div>

          <input
            id="input-diagnostic-json"
            ref={diagnosticInput}
            type="file"
            accept=".json,application/json"
            onChange={handleDiagnosticUpload}
            disabled={uploading || submitting || !assetId}
            style={{ fontSize: '12px', padding: '6px' }}
          />

          {uploadedDiagnostic?.asset_id === assetId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#059669', marginTop: '8px', fontWeight: 600 }}>
              <CheckCircle2 size={14} /> Diagnostic attached to {assets.find(asset => asset.id === assetId)?.name || 'this equipment'}
            </div>
          )}
        </div>

        {/* Screenshot Attachment */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={15} color="#f59e0b" /> Visual Screenshot (.png / .jpeg)
            </span>
          </div>

          <input
            id="input-screenshot-file"
            ref={screenshotInput}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleScreenshotChange}
            disabled={uploading || submitting}
            style={{ fontSize: '12px', padding: '6px' }}
          />

          {uploadedScreenshotId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#059669', marginTop: '8px', fontWeight: 600 }}>
              <CheckCircle2 size={14} /> Attached Screenshot ID: {uploadedScreenshotId}
            </div>
          )}
        </div>

        {/* Submit Case Button */}
        <button
          id="btn-submit-case"
          type="submit"
          disabled={submitting || uploading}
          className="btn-primary"
          style={{ width: '100%', padding: '13px', fontSize: '15px' }}
        >
          {submitting ? (
            'Opening Case...'
          ) : (
            <>
              <Send size={16} /> Save Problem Report
            </>
          )}
        </button>
      </form>
    </div>
  );
};
