import React from 'react';
import { Info, RotateCcw, Server, Cpu, AlertTriangle } from 'lucide-react';
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
  const isLive = apiMode === 'live';

  return (
    <aside
      className="sample-banner"
      id="sample-data-banner"
      aria-label="Demo notice"
      style={{
        background: isLive
          ? 'linear-gradient(90deg, #0f231e, #132e35)'
          : 'linear-gradient(90deg, #2b1f0d, #251b14)',
        borderBottom: `1px solid ${isLive ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.35)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {isLive ? (
          <Server size={16} color="#34d399" style={{ flexShrink: 0 }} />
        ) : (
          <AlertTriangle size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
        )}
        <span style={{ color: isLive ? '#a7f3d0' : '#fde68a' }}>
          <strong>
            {isLive ? 'LIVE BACKEND MODE (/api/v1):' : 'SAMPLE FIXTURE MODE (Simulated Contract):'}
          </strong>{' '}
          {isLive
            ? 'Connected to live FastAPI service. Network errors are surfaced explicitly without silent mock fallback.'
            : 'Explicitly running in standalone fixture mode. Telemetry & AI responses run against local simulated contract state.'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button
          id="btn-toggle-api-mode"
          onClick={onToggleMode}
          title={isLive ? 'Currently in Live Backend mode. Click to switch to Simulated Fixtures.' : 'Currently in Mock Fixtures mode. Click to switch to Live Backend.'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '9999px',
            background: isLive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
            color: isLive ? '#34d399' : '#fbbf24',
            border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`,
            cursor: 'pointer',
          }}
        >
          {isLive ? <Server size={12} /> : <Cpu size={12} />}
          {isLive ? 'MODE: LIVE BACKEND' : 'MODE: SAMPLE FIXTURES'}
        </button>

        {!isLive && (
          <button
            id="btn-reset-demo"
            onClick={onResetDemo}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              color: '#fde68a',
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}
            title="Reset sample records back to initial seed data"
          >
            <RotateCcw size={12} />
            Reset Fixtures
          </button>
        )}
      </div>
    </aside>
  );
};
