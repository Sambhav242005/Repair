import React from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { ApiErrorDetail } from '../types';

interface ErrorBannerProps {
  error: ApiErrorDetail | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onRetry, onDismiss }) => {
  if (!error) return null;

  const code = typeof error === 'object' ? error.code : 'ERROR';
  const message = typeof error === 'object' ? error.message : error;
  const details = typeof error === 'object' ? error.details : null;

  const isConflict = code === 'SCHEDULE_CONFLICT' || code === 'ASSET_UNAVAILABLE' || code === 'ALREADY_COMPLETED';

  return (
    <div
      className="card"
      id="error-banner"
      role="alert"
      style={{
        background: isConflict ? 'rgba(245, 158, 11, 0.12)' : 'rgba(244, 63, 94, 0.12)',
        borderColor: isConflict ? 'rgba(245, 158, 11, 0.4)' : 'rgba(244, 63, 94, 0.4)',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
      }}
    >
      <AlertTriangle
        size={22}
        color={isConflict ? '#f59e0b' : '#f43f5e'}
        style={{ flexShrink: 0, marginTop: '2px' }}
      />

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '4px',
              background: isConflict ? 'rgba(245, 158, 11, 0.25)' : 'rgba(244, 63, 94, 0.25)',
              color: isConflict ? '#fde68a' : '#fecdd3',
            }}
          >
            {code}
          </span>
          <strong style={{ fontSize: '14px', color: '#ffffff' }}>
            {isConflict ? 'Conflict Rejected by System' : 'Request Error'}
          </strong>
        </div>

        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.5, margin: '4px 0' }}>
          {message}
        </p>

        {details && (
          <div
            style={{
              marginTop: '8px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: '#cbd5e1',
            }}
          >
            {Object.entries(details).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: '#94a3b8' }}>{k}:</span> {String(v)}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn-secondary"
              id="btn-error-retry"
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              <RefreshCw size={13} />
              Retry Operation
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <XCircle size={13} />
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
