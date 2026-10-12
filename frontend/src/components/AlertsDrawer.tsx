import React from 'react';
import { X, CheckCircle, Bell, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Alert } from '../types';
import { formatKolkata } from '../utils/datetime';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onAcknowledge,
  soundEnabled,
  onToggleSound,
}) => {
  if (!isOpen) return null;

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged_at).length;

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle size={18} color="#f43f5e" />;
      case 'warning':
        return <AlertTriangle size={18} color="#f59e0b" />;
      default:
        return <Info size={18} color="#0ea5e9" />;
    }
  };

  return (
    <div
      id="alerts-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        id="alerts-drawer"
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          backgroundColor: '#0c111e',
          borderLeft: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(18, 26, 43, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} color="var(--brand-cyan)" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-bright)' }}>
              Alert Center
            </h2>
            {unacknowledgedCount > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(244, 63, 94, 0.25)',
                  color: '#fb7185',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                }}
              >
                {unacknowledgedCount} unacknowledged
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            id="btn-close-alerts"
            style={{ color: 'var(--text-muted)', padding: '6px' }}
            aria-label="Close alerts"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sound toggle notice in drawer */}
        <div
          style={{
            padding: '12px 24px',
            background: soundEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
          }}
        >
          <span style={{ color: soundEnabled ? '#34d399' : 'var(--text-muted)' }}>
            {soundEnabled ? '🔔 Chime enabled for new alerts' : '🔕 Alert chime disabled (user opt-in)'}
          </span>
          <button
            onClick={onToggleSound}
            id="btn-drawer-toggle-sound"
            style={{
              fontSize: '12px',
              color: 'var(--brand-cyan)',
              fontWeight: 600,
            }}
          >
            {soundEnabled ? 'Disable sound' : 'Enable sound'}
          </button>
        </div>

        {/* Alerts List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
              <Bell size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>No alerts recorded at this time.</p>
            </div>
          ) : (
            alerts.map((al) => {
              const isAck = !!al.acknowledged_at;
              return (
                <div
                  key={al.id}
                  id={`alert-card-${al.id}`}
                  style={{
                    backgroundColor: isAck ? 'rgba(255, 255, 255, 0.02)' : 'rgba(18, 26, 43, 0.9)',
                    border: `1px solid ${
                      isAck
                        ? 'var(--border-subtle)'
                        : al.severity === 'critical'
                        ? 'rgba(244, 63, 94, 0.4)'
                        : 'rgba(245, 158, 11, 0.4)'
                    }`,
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    opacity: isAck ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getSeverityIcon(al.severity)}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-mono)',
                          color:
                            al.severity === 'critical'
                              ? '#fb7185'
                              : al.severity === 'warning'
                              ? '#fbbf24'
                              : '#38bdf8',
                        }}
                      >
                        {al.kind.replace('_', ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-dim)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        [{al.entity_type}]
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {formatKolkata(al.triggered_at)}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    {al.message}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
                    {isAck ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12px',
                          color: '#34d399',
                        }}
                      >
                        <CheckCircle size={14} />
                        Acknowledged ({formatKolkata(al.acknowledged_at)})
                      </span>
                    ) : (
                      <button
                        id={`btn-ack-${al.id}`}
                        onClick={() => onAcknowledge(al.id)}
                        className="btn-secondary"
                        style={{
                          fontSize: '12px',
                          padding: '5px 12px',
                          marginLeft: 'auto',
                        }}
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
