import React from 'react';
import {
  Wrench,
  Factory,
  Bell,
  Volume2,
  VolumeX,
  UserCheck,
  ShieldCheck,
  GraduationCap,
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
  onOpenAcademicModal?: () => void;
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
  onOpenAcademicModal,
}) => {
  return (
    <header
      id="main-header"
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '2px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Top SVVV Academic Announcement Bar */}
      <div
        style={{
          backgroundColor: '#0071ce',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 600,
          padding: '6px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={14} />
          <span>
            <strong>SHRI VAISHNAV VIDYAPEETH VISHWAVIDYALAYA (SVVV), INDORE</strong> • Department of Engineering &amp; Technology
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.95 }}>
          <span>Academic Evaluation 2026</span>
          <span>•</span>
          <span>Right to Repair Framework</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 24px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        {/* Brand & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#0071ce',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 113, 206, 0.3)',
              position: 'relative',
            }}
          >
            <Wrench size={22} color="#ffffff" />
            <span
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: 900,
                padding: '1px 4px',
                borderRadius: '4px',
                border: '1px solid #ffffff',
              }}
            >
              SVVV
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: '#0071ce',
                  letterSpacing: '-0.02em',
                }}
              >
                SVVV
              </span>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.01em',
                }}
              >
                Repair Before Replace
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
              Campus Equipment Diagnostics &amp; Central Workshop Maintenance System
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            id="tab-repair"
            onClick={() => onSelectTab('repair')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              backgroundColor: activeTab === 'repair' ? '#ebf5ff' : 'transparent',
              color: activeTab === 'repair' ? '#0071ce' : '#475569',
              border: activeTab === 'repair' ? '1px solid #b9e1ff' : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <Wrench size={18} />
            <span>Repair Guides &amp; Cases</span>
          </button>

          <button
            id="tab-factory"
            onClick={() => onSelectTab('factory')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              backgroundColor: activeTab === 'factory' ? '#ebf5ff' : 'transparent',
              color: activeTab === 'factory' ? '#0071ce' : '#475569',
              border: activeTab === 'factory' ? '1px solid #b9e1ff' : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <Factory size={18} />
            <span>Workshop &amp; Lab Machinery</span>
          </button>
        </nav>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Viva Evaluation Modal Trigger */}
          {onOpenAcademicModal && (
            <button
              id="btn-open-svvv-viva"
              onClick={onOpenAcademicModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
                cursor: 'pointer',
              }}
              title="Open SVVV Faculty Project Evaluation & Viva Guide"
            >
              <GraduationCap size={16} />
              <span>SVVV Viva Guide</span>
            </button>
          )}

          {/* Audio Chime Toggle */}
          <button
            id="toggle-sound-btn"
            onClick={onToggleSound}
            title={soundEnabled ? 'Alert chimes enabled' : 'Enable audio chimes for new alerts'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: soundEnabled ? '#ecfdf5' : '#f1f5f9',
              color: soundEnabled ? '#059669' : '#64748b',
              border: `1px solid ${soundEnabled ? '#a7f3d0' : '#cbd5e1'}`,
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Chime On' : 'Chime Off'}</span>
          </button>

          {/* Alert Center Bell */}
          <button
            id="open-alerts-btn"
            onClick={onOpenAlerts}
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: unacknowledgedAlertsCount > 0 ? '#fef2f2' : '#f1f5f9',
              border: `1px solid ${unacknowledgedAlertsCount > 0 ? '#fecaca' : '#cbd5e1'}`,
              color: unacknowledgedAlertsCount > 0 ? '#dc2626' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={18} />
            {unacknowledgedAlertsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.4)',
                }}
              >
                {unacknowledgedAlertsCount}
              </span>
            )}
          </button>

          {/* Role Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <UserCheck size={16} color="#64748b" />
            <select
              id="role-switch"
              value={role}
              onChange={(e) => onSelectRole(e.target.value as DemoRole)}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '12px',
                color: role === 'professor' ? '#0071ce' : '#1e293b',
                padding: '4px',
                cursor: 'pointer',
                outline: 'none',
                width: 'auto',
              }}
            >
              <option value="professor">Role: Professor (SVVV Evaluator)</option>
              <option value="technician">Role: Lab Technician</option>
              <option value="operator">Role: Student Apprentice</option>
              <option value="planner">Role: Workshop Planner</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
