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
      id="sample-data-banner"
      aria-label="Demo environment notice"
      style={{
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 24px',
        fontSize: '13px',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {isLive ? (
          <Server size={16} color="#059669" style={{ flexShrink: 0 }} />
        ) : (
          <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
        )}
        <span>
          <strong style={{ color: '#0f172a' }}>
            {isLive ? 'LIVE BACKEND MODE (/api/v1):' : 'SAMPLE DEMO FIXTURES:'}
          </strong>{' '}
          {isLive
            ? 'Connected to live FastAPI backend. Network failures are surfaced explicitly with zero silent fallback.'
            : 'Metrics reflect verified test fixtures. Only physical repairs count toward retained equipment mass.'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button
          id="btn-toggle-api-mode"
          onClick={onToggleMode}
          title={
            isLive
              ? 'Currently in Live Backend mode. Click to switch to Simulated Fixtures.'
              : 'Currently in Mock Fixtures mode. Click to switch to Live Backend.'
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '9999px',
            background: isLive ? '#ecfdf5' : '#fffbeb',
            color: isLive ? '#047857' : '#b45309',
            border: `1px solid ${isLive ? '#a7f3d0' : '#fde68a'}`,
            cursor: 'pointer',
          }}
        >
          {isLive ? <Server size={12} /> : <Cpu size={12} />}
          {isLive ? 'MODE: LIVE BACKEND' : 'MODE: SAMPLE FIXTURES'}
        </button>

        <button
          id="btn-reset-demo"
          onClick={onResetDemo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#0071ce',
            padding: '4px 10px',
            borderRadius: '6px',
            background: '#ebf5ff',
            border: '1px solid #b9e1ff',
            cursor: 'pointer',
          }}
          title="Reset sample records back to initial seed data"
        >
          <RotateCcw size={13} />
          Reset Demo
        </button>
      </div>
    </aside>
  );
};
