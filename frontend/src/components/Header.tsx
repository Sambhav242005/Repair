import React from 'react';
import {
  Wrench,
  Factory,
  Bell,
  Volume2,
  VolumeX,
  UserCheck,
} from 'lucide-react';
import { DemoRole } from '../types';

export type ActiveTab = 'repair' | 'factory';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  unacknowledgedAlertsCount: number;
  onOpenAlerts: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  role: DemoRole;
  onSelectRole: (role: DemoRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  unacknowledgedAlertsCount,
  onOpenAlerts,
  soundEnabled,
  onToggleSound,
  role,
  onSelectRole,
}) => {
  return (
    <header
      id="main-header"
      style={{
        backgroundColor: 'rgba(11, 16, 28, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 24px',
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        {/* Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px var(--brand-cyan-glow)',
            }}
          >
            <Wrench size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: 'var(--text-bright)',
                  textTransform: 'uppercase',
                }}
              >
                Repair Before Replace
              </h1>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(14, 165, 233, 0.15)',
                  color: '#38bdf8',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                }}
              >
                MVP v1.0
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Diagnostic Guidance &amp; Factory Continuity
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            id="nav-tab-repair"
            onClick={() => onSelectTab('repair')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '14px',
              background:
                activeTab === 'repair' ? 'rgba(14, 165, 233, 0.16)' : 'transparent',
              color: activeTab === 'repair' ? '#38bdf8' : 'var(--text-muted)',
              border: `1px solid ${
                activeTab === 'repair' ? 'rgba(14, 165, 233, 0.35)' : 'transparent'
              }`,
            }}
          >
            <Wrench size={17} />
            Repair &amp; Diagnostics
          </button>

          <button
            id="nav-tab-factory"
            onClick={() => onSelectTab('factory')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '14px',
              background:
                activeTab === 'factory' ? 'rgba(14, 165, 233, 0.16)' : 'transparent',
              color: activeTab === 'factory' ? '#38bdf8' : 'var(--text-muted)',
              border: `1px solid ${
                activeTab === 'factory' ? 'rgba(14, 165, 233, 0.35)' : 'transparent'
              }`,
            }}
          >
            <Factory size={17} />
            Factory Operations
          </button>
        </nav>

        {/* Controls: Sound, Alert Bell, Demo Role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Sound opt-in button */}
          <button
            id="btn-sound-optin"
            onClick={onToggleSound}
            title={soundEnabled ? 'Alert chime enabled. Click to mute.' : 'Alarm sound works after user opt-in. Click to enable sound.'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: soundEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: soundEnabled ? '#34d399' : 'var(--text-dim)',
              border: `1px solid ${soundEnabled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>

          {/* Alert Bell */}
          <button
            id="btn-alert-bell"
            onClick={onOpenAlerts}
            aria-label="View alerts"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: unacknowledgedAlertsCount > 0 ? '#fb7185' : 'var(--text-muted)',
            }}
          >
            <Bell size={18} />
            {unacknowledgedAlertsCount > 0 && (
              <span
                id="badge-alert-count"
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#f43f5e',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(244, 63, 94, 0.6)',
                }}
              >
                {unacknowledgedAlertsCount}
              </span>
            )}
          </button>

          {/* Demo Role Switch */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <UserCheck size={14} color="var(--text-dim)" />
            <select
              id="select-demo-role"
              value={role}
              onChange={(e) => onSelectRole(e.target.value as DemoRole)}
              aria-label="Demo role switch"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '2px 4px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-main)',
                cursor: 'pointer',
                width: 'auto',
              }}
            >
              <option value="technician" style={{ background: '#0b101c' }}>Role: Technician</option>
              <option value="operator" style={{ background: '#0b101c' }}>Role: Operator</option>
              <option value="planner" style={{ background: '#0b101c' }}>Role: Factory Planner</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
