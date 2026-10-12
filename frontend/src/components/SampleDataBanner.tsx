import React from 'react';
import { RotateCcw, Server, FlaskConical } from 'lucide-react';
import { ApiConnectionMode } from '../api/client';

interface SampleDataBannerProps {
  apiMode: ApiConnectionMode;
  onToggleMode: () => void;
  onResetDemo: () => void;
}

export const SampleDataBanner: React.FC<SampleDataBannerProps> = ({ apiMode, onToggleMode, onResetDemo }) => {
  const live = apiMode === 'live';
  return (
    <div className="workspace-status" aria-live="polite">
      <span className={`connection-dot ${live ? 'is-live' : ''}`} />
      <span><strong>{live ? 'Connected to your local workspace' : 'Sample workspace'}</strong><span className="status-caption">{live ? 'Changes are saved to the local backend.' : 'Sample data is for exploring the workflow.'}</span></span>
      <div className="status-actions">
        <button className="quiet-action" id="btn-toggle-api-mode" onClick={onToggleMode} title={live ? 'Switch to sample data' : 'Connect to the local backend'}>
          {live ? <Server size={14} /> : <FlaskConical size={14} />}{live ? 'Live data' : 'Sample data'}
        </button>
        {!live && <button className="quiet-action" id="btn-reset-demo" onClick={onResetDemo}><RotateCcw size={14} /> Reset sample data</button>}
      </div>
    </div>
  );
};
