import React from 'react';
import { Info, RotateCcw, Server, Cpu } from 'lucide-react';
import { ApiConnectionMode } from '../api/client';

interface SampleDataBannerProps {
  apiMode: ApiConnectionMode;
  onToggleMode: () => void;
  onResetDemo: () => void;
}

export const SampleDataBanner: React.FC<SampleDataBannerProps> = ({
  apiMode,
  onToggleMode,
  onResetDemo,
}) => {
  return (
    <aside className="sample-banner" id="sample-data-banner" aria-label="Demo notice">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <Info size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
        <span>
          <strong>SAMPLE DATA ENVIRONMENT:</strong> All telemetry and metrics are illustrative for evaluation. Confirmed repairs reflect recorded test equipment outcomes; no carbon offsets are asserted.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button
          id="btn-toggle-api-mode"
          onClick={onToggleMode}
          title={apiMode === 'live' ? 'Connected to live FastAPI backend at /api/v1' : 'Running on simulated contract fixtures'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: '9999px',
            background: apiMode === 'live' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: apiMode === 'live' ? '#34d399' : '#fbbf24',
            border: `1px solid ${apiMode === 'live' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
          }}
        >
          {apiMode === 'live' ? <Server size={12} /> : <Cpu size={12} />}
          {apiMode === 'live' ? 'LIVE BACKEND (/api/v1)' : 'CONTRACT FIXTURES'}
        </button>

        <button
          id="btn-reset-demo"
          onClick={onResetDemo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            color: '#93c5fd',
            padding: '3px 8px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
          title="Reset sample records back to initial seed data"
        >
          <RotateCcw size={12} />
          Reset Demo
        </button>
      </div>
    </aside>
  );
};
