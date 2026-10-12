import React, { useState } from 'react';
import { Asset, CreateCaseInput } from '../../types';
import { Upload, FileText, Send, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [uploadedDiagnosticId, setUploadedDiagnosticId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sync if selectedAssetId changes from parent
  React.useEffect(() => {
    if (selectedAssetId) {
      setAssetId(selectedAssetId);
    }
  }, [selectedAssetId]);

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onError({ error: { code: 'VALIDATION_ERROR', message: 'Screenshot exceeds 5 MB limit (00_SRS.md nonfunctional requirement).' } });
      return;
    }

    setScreenshotFile(file);
    setUploading(true);
    try {
      const res = await apiClient.uploadScreenshot(file);
      setUploadedScreenshotId(res.id);
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
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.os || !parsed.memory || !parsed.disks) {
        throw { error: { code: 'VALIDATION_ERROR', message: 'Diagnostic JSON missing required OS/memory/disk fields.' } };
      }
      const diag = await apiClient.createDiagnostic({
        ...parsed,
        asset_id: assetId,
      });
      setUploadedDiagnosticId(diag.id);
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
        diagnostic_id: uploadedDiagnosticId,
      };
      const created = await apiClient.createCase(input);
      setSymptoms('');
      setScreenshotFile(null);
      setUploadedScreenshotId(null);
      setDiagnosticFile(null);
      setUploadedDiagnosticId(null);
      onCaseCreated(created.id);
    } catch (err: any) {
      onError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const loadSampleDiagnostics = async () => {
    setUploading(true);
    try {
      const sample = {
        asset_id: assetId || 'asset_laptop_1',
        collected_at: new Date().toISOString(),
        os: { name: 'Ubuntu Linux', version: '24.04 LTS' },
        memory: { total_bytes: 16777216000, available_bytes: 1887436800 },
        disks: [{ label: '/ (Root NVMe)', total_bytes: 512110190592, free_bytes: 17179869184 }],
        cpu: { logical_count: 8 },
        collector_version: '1.0.0-cli-safe',
      };
      const diag = await apiClient.createDiagnostic(sample);
      setUploadedDiagnosticId(diag.id);
      setDiagnosticFile(new File([JSON.stringify(sample)], 'diagnostics_sample.json'));
    } catch (err: any) {
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card" id="repair-case-form-card" style={{ height: 'fit-content' }}>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-bright)' }}>
          Create Repair Investigation
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Document equipment symptoms and attach diagnostic telemetry or screenshot guidance.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Asset Selection */}
        <div>
          <label htmlFor="select-case-asset" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Target Asset / Workstation *
          </label>
          <select
            id="select-case-asset"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            required
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id} style={{ background: '#0b101c' }}>
                {a.name} ({a.category}) — [{a.status}]
              </option>
            ))}
          </select>
        </div>

        {/* Symptoms Textarea */}
        <div>
          <label htmlFor="textarea-symptoms" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Observed Symptoms &amp; Fault Description *
          </label>
          <textarea
            id="textarea-symptoms"
            rows={4}
            required
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe the fault symptoms, e.g., 'Laptop is slow and storage is almost full', 'Hydraulic spindle thermal alarm tripped during cycle #4'..."
          />
        </div>

        {/* Diagnostic JSON Attachment */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} color="#38bdf8" /> Attach Diagnostic JSON (Max 100 KB)
            </span>
            <button
              type="button"
              id="btn-use-sample-diag"
              onClick={loadSampleDiagnostics}
              style={{ fontSize: '11px', color: 'var(--brand-cyan)', fontWeight: 600 }}
            >
              + Use Sample Telemetry
            </button>
          </div>

          <input
            id="input-diagnostic-json"
            type="file"
            accept=".json,application/json"
            onChange={handleDiagnosticUpload}
            style={{ fontSize: '12px', padding: '6px' }}
          />

          {uploadedDiagnosticId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#34d399', marginTop: '8px' }}>
              <CheckCircle2 size={14} /> Attached Diagnostic ID: <code style={{ fontFamily: 'var(--font-mono)' }}>{uploadedDiagnosticId}</code>
            </div>
          )}
        </div>

        {/* Screenshot Attachment */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={15} color="#f59e0b" /> Attach Screenshot (Max 5 MB)
            </span>
          </div>

          <input
            id="input-screenshot-file"
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleScreenshotChange}
            style={{ fontSize: '12px', padding: '6px' }}
          />

          {uploadedScreenshotId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#34d399', marginTop: '8px' }}>
              <CheckCircle2 size={14} /> Uploaded Screenshot ID: <code style={{ fontFamily: 'var(--font-mono)' }}>{uploadedScreenshotId}</code>
            </div>
          )}
        </div>

        {/* Submit Case Button */}
        <button
          id="btn-submit-case"
          type="submit"
          disabled={submitting || uploading}
          className="btn-primary"
          style={{ width: '100%', padding: '12px' }}
        >
          {submitting ? (
            <>
              <div className="spinner" /> Creating Case...
            </>
          ) : (
            <>
              <Send size={16} /> Open Repair Case
            </>
          )}
        </button>
      </form>
    </div>
  );
};
