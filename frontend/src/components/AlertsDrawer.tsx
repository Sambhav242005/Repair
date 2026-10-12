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
        return <AlertCircle size={18} color="#dc2626" />;
      case 'warning':
        return <AlertTriangle size={18} color="#d97706" />;
      default:
        return <Info size={18} color="#0071ce" />;
    }
  };

  return (
    <div
      id="alerts-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
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
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #cbd5e1',
          boxShadow: '-8px 0 25px rgba(0, 0, 0, 0.15)',
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
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ebf5ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} color="#0071ce" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Alert Center
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Automated equipment monitoring &amp; conflicts
              </span>
            </div>
            {unacknowledgedCount > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                }}
              >
                {unacknowledgedCount} new
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            id="btn-close-alerts"
            style={{
              color: '#64748b',
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
            }}
            aria-label="Close alerts"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sound toggle notice in drawer */}
        <div
          style={{
            padding: '12px 24px',
            background: soundEnabled ? '#ecfdf5' : '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
          }}
        >
          <span style={{ color: soundEnabled ? '#047857' : '#64748b', fontWeight: 600 }}>
            {soundEnabled ? '🔔 Sound chime active for new alerts' : '🔕 Alert sound chime muted'}
          </span>
          <button
            onClick={onToggleSound}
            id="btn-drawer-toggle-sound"
            style={{
              fontSize: '12px',
              color: '#0071ce',
              fontWeight: 700,
              textDecoration: 'underline',
            }}
          >
            {soundEnabled ? 'Disable' : 'Enable sound'}
          </button>
        </div>

        {/* Alerts List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f8fafc',
          }}
        >
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} color="#94a3b8" />
              <p style={{ fontWeight: 600 }}>No active alerts recorded.</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                Factory sensors and scheduling telemetry are all nominal.
              </p>
            </div>
          ) : (
            alerts.map((al) => {
              const isAck = !!al.acknowledged_at;
              const isCrit = al.severity === 'critical';
              const isWarn = al.severity === 'warning';

              return (
                <div
                  key={al.id}
                  id={`alert-card-${al.id}`}
                  style={{
                    backgroundColor: isAck ? '#ffffff' : isCrit ? '#fff5f5' : isWarn ? '#fffbeb' : '#f0f9ff',
                    border: `1px solid ${
                      isAck
                        ? '#e2e8f0'
                        : isCrit
                        ? '#fecaca'
                        : isWarn
                        ? '#fde68a'
                        : '#bae6fd'
                    }`,
                    borderLeft: `4px solid ${
                      isAck
                        ? '#cbd5e1'
                        : isCrit
                        ? '#ef4444'
                        : isWarn
                        ? '#f59e0b'
                        : '#0071ce'
                    }`,
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    opacity: isAck ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getSeverityIcon(al.severity)}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-mono)',
                          color: isCrit ? '#b91c1c' : isWarn ? '#b45309' : '#0369a1',
                        }}
                      >
                        {al.kind.replace('_', ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        [{al.entity_type}]
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {formatKolkata(al.triggered_at)}
                    </span>
                  </div>

                  <p style={{ fontSize: '13.5px', color: '#1e293b', lineHeight: 1.5, fontWeight: 500 }}>
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
                          color: '#059669',
                          fontWeight: 600,
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
                          padding: '5px 14px',
                          marginLeft: 'auto',
                          backgroundColor: '#ffffff',
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
