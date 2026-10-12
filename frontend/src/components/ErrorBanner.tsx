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
        backgroundColor: isConflict ? '#fffbeb' : '#fef2f2',
        border: `1px solid ${isConflict ? '#fde68a' : '#fecaca'}`,
        borderLeft: `4px solid ${isConflict ? '#f59e0b' : '#ef4444'}`,
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
      }}
    >
      <AlertTriangle
        size={22}
        color={isConflict ? '#d97706' : '#dc2626'}
        style={{ flexShrink: 0, marginTop: '2px' }}
      />

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '4px',
              background: isConflict ? '#fef3c7' : '#fee2e2',
              color: isConflict ? '#b45309' : '#b91c1c',
              border: `1px solid ${isConflict ? '#fde68a' : '#fca5a5'}`,
            }}
          >
            {code}
          </span>
          <strong style={{ fontSize: '14px', color: '#0f172a' }}>
            {isConflict ? 'Schedule Conflict Rejected' : 'Operation Notice'}
          </strong>
        </div>

        <p style={{ color: '#334155', fontSize: '14px', lineHeight: 1.5, margin: '4px 0' }}>
          {message}
        </p>

        {details && (
          <div
            style={{
              marginTop: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: '#334155',
            }}
          >
            {Object.entries(details).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{k}:</span> {String(v)}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn-secondary"
              id="btn-error-retry"
              style={{ fontSize: '12px', padding: '6px 14px' }}
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
                color: '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600,
                padding: '6px 10px',
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
