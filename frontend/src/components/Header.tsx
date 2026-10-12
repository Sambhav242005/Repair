import React from 'react';
import { BookOpen, Bell, Volume2, VolumeX, Wrench } from 'lucide-react';

export type ActiveTab = 'repair' | 'factory';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  unacknowledgedAlertsCount: number;
  onOpenAlerts: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAcademicModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab, onSelectTab, unacknowledgedAlertsCount, onOpenAlerts,
  soundEnabled, onToggleSound, onOpenAcademicModal,
}) => (
  <header className="teacher-header" id="main-header">
    <a className="teacher-brand" href="#workspace" aria-label="Repair Before Replace faculty workspace">
      <span className="teacher-brand-mark"><Wrench size={20} /></span>
      <span><strong>Repair Before Replace</strong><small>Faculty workspace</small></span>
    </a>
    <nav className="teacher-nav" aria-label="Main navigation">
      <button id="tab-repair" aria-current={activeTab === 'repair' ? 'page' : undefined} onClick={() => onSelectTab('repair')}>
        <Wrench size={17} /> Cases &amp; troubleshooting
      </button>
      <button id="tab-factory" aria-current={activeTab === 'factory' ? 'page' : undefined} onClick={() => onSelectTab('factory')}>
        <BookOpen size={17} /> Class &amp; lab planning
      </button>
    </nav>
    <div className="teacher-header-actions">
      {onOpenAcademicModal && <button className="quiet-action" onClick={onOpenAcademicModal}>Project notes</button>}
      <button className="icon-action" id="toggle-sound-btn" onClick={onToggleSound} aria-label={soundEnabled ? 'Turn alert sound off' : 'Turn alert sound on'} title={soundEnabled ? 'Alert sound on' : 'Alert sound off'}>
        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      <button className="icon-action alert-action" id="open-alerts-btn" onClick={onOpenAlerts} aria-label={`Open alerts${unacknowledgedAlertsCount ? `, ${unacknowledgedAlertsCount} unacknowledged` : ''}`}>
        <Bell size={18} />{unacknowledgedAlertsCount > 0 && <span className="alert-count">{unacknowledgedAlertsCount}</span>}
      </button>
    </div>
  </header>
);
