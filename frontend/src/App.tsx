import React, { useState, useEffect, useCallback } from 'react';
import { Asset, Case, ApiErrorDetail } from './types';
import { apiClient, ApiConnectionMode } from './api/client';
import { useAlertsPolling } from './api/polling';
import { SampleDataBanner } from './components/SampleDataBanner';
import { Header, ActiveTab } from './components/Header';
import { AlertsDrawer } from './components/AlertsDrawer';
import { ErrorBanner } from './components/ErrorBanner';
import { SvvvAcademicModal } from './components/SvvvAcademicModal';
import { AssetList } from './features/assets/AssetList';
import { RepairCaseForm } from './features/repair/RepairCaseForm';
import { CaseView } from './features/repair/CaseView';
import { ComputerAssistancePanel } from './features/computer-assistance/ComputerAssistancePanel';
import { FactoryDashboard } from './features/factory/FactoryDashboard';
import { ArrowRight, ClipboardList, CircleAlert, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('repair');
  const [apiMode, setApiMode] = useState<ApiConnectionMode>(apiClient.getMode());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState<boolean>(false);
  const [isAcademicModalOpen, setIsAcademicModalOpen] = useState<boolean>(false);

  // Core Data
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // States
  const [loading, setLoading] = useState<boolean>(true);
  const [globalError, setGlobalError] = useState<ApiErrorDetail | string | null>(null);

  // 15-second Alert polling with user-enabled audio chime
  const { alerts, acknowledge: ackAlert, refetch: refetchAlerts } = useAlertsPolling(soundEnabled);
  const unackCount = alerts.filter((a) => !a.acknowledged_at).length;

  // Listen to ApiClient mode changes
  useEffect(() => {
    const unsubscribe = apiClient.subscribeMode((mode) => setApiMode(mode));
    void apiClient.checkBackendHealth();
    return unsubscribe;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsData, casesData] = await Promise.all([
        apiClient.getAssets(),
        apiClient.getCases(),
      ]);
      setAssets(assetsData);
      setCases(casesData);

      if (!assetsData.some((asset) => asset.id === selectedAssetId)) setSelectedAssetId(assetsData[0]?.id || '');
      if (!casesData.some((item) => item.id === selectedCaseId)) setSelectedCaseId(casesData[0]?.id || '');
    } catch (err: any) {
      setGlobalError(err?.error || 'Failed to load initial workspace data');
    } finally {
      setLoading(false);
    }
  }, [selectedAssetId, selectedCaseId]);

  useEffect(() => {
    loadData();
  }, [loadData, apiMode]);

  // Handler: Toggle API connection mode
  const handleToggleApiMode = () => {
    const nextMode = apiMode === 'live' ? 'mock' : 'live';
    apiClient.setMode(nextMode);
  };

  // Handler: Reset demo data
  const handleResetDemo = () => {
    if (window.confirm('Reset all sample records back to initial seeded demo data?')) {
      apiClient.resetDemoData();
      loadData();
      refetchAlerts();
    }
  };

  const handleCaseCreated = async (newCaseId: string) => {
    const allCases = await apiClient.getCases();
    setCases(allCases);
    setSelectedCaseId(newCaseId);
  };

  const handleRefreshCurrentCase = async () => {
    if (!selectedCaseId) return;
    try {
      const updated = await apiClient.getCase(selectedCaseId);
      setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err: any) {
      console.warn('Could not refresh case:', err);
    }
  };

  const handleDeleteCase = async (id: string) => {
    if (window.confirm(`Delete case ${id}?`)) {
      try {
        await apiClient.deleteCase(id);
        const remCases = await apiClient.getCases();
        setCases(remCases);
        if (remCases.length > 0) {
          setSelectedCaseId(remCases[0].id);
        } else {
          setSelectedCaseId('');
        }
      } catch (err: any) {
        setGlobalError(err?.error || 'Failed to delete case');
      }
    }
  };

  const currentCase = cases.find((c) => c.id === selectedCaseId) || null;
  const currentAsset = assets.find((a) => a.id === (currentCase?.asset_id || selectedAssetId)) || null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }}>
      {/* 1. Mandatory Sample Data Banner */}
      <SampleDataBanner
        apiMode={apiMode}
        onToggleMode={handleToggleApiMode}
        onResetDemo={handleResetDemo}
      />

      {/* 2. Top Navigation Header with SVVV Branding */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unacknowledgedAlertsCount={unackCount}
        onOpenAlerts={() => setIsAlertsDrawerOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        onOpenAcademicModal={() => setIsAcademicModalOpen(true)}
      />

      {/* Main Container */}
      <main id="workspace" className="teacher-main">

        {/* Global Error Notice with Retry */}
        <ErrorBanner
          error={globalError}
          onRetry={loadData}
          onDismiss={() => setGlobalError(null)}
        />

        {activeTab === 'repair' && (
          <div id="repair-tab-layout" className="teacher-content">
            <section className="teacher-welcome">
              <div>
                <p className="eyebrow">TEACHING &amp; LAB SUPPORT</p>
                <h1>What needs attention today?</h1>
                <p>Record an equipment problem, review safe troubleshooting guidance, and keep your class and lab work moving.</p>
              </div>
              <button className="welcome-action" onClick={() => document.getElementById('repair-case-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                Record a problem <ArrowRight size={17} />
              </button>
            </section>
            <section className="teacher-summary" aria-label="Workspace summary" aria-busy={loading}>
              <div><ClipboardList size={19} /><span><strong>{cases.length}</strong><small>reported problems</small></span></div>
              <div><CircleAlert size={19} /><span><strong>{cases.filter((item) => item.status === 'open' || item.status === 'analysing').length}</strong><small>need follow-up</small></span></div>
              <div><CheckCircle2 size={19} /><span><strong>{assets.filter((asset) => asset.status === 'operational').length}</strong><small>equipment available</small></span></div>
            </section>

            {/* Desktop side-by-side, mobile stacked */}
            <div
              className="teacher-case-layout"
            >
              {/* Left Column: Asset Selection, Case Form, and Case History */}
              <div className="teacher-column">
                {/* Repair Case Form */}
                <RepairCaseForm
                  assets={assets}
                  selectedAssetId={selectedAssetId}
                  onCaseCreated={handleCaseCreated}
                  onError={(err) => setGlobalError(err?.error || err)}
                />

                {/* Case Selector / History Panel */}
                <div
                  className="card"
                  id="cases-history-panel"
                  style={{
                    padding: '20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      Reported problems ({cases.length})
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                    {cases.length === 0 && <p className="empty-state">No problems have been reported yet. Start with the form above.</p>}
                    {cases.map((c) => {
                      const isSelected = c.id === selectedCaseId;
                      const a = assets.find((item) => item.id === c.asset_id);
                      return (
                        <div
                          key={c.id}
                          id={`case-item-${c.id}`}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedCaseId(c.id); if (c.asset_id) setSelectedAssetId(c.asset_id); } }}
                          onClick={() => {
                            setSelectedCaseId(c.id);
                            if (c.asset_id) setSelectedAssetId(c.asset_id);
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                            border: `2px solid ${isSelected ? '#0071ce' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 2px 6px rgba(0, 113, 206, 0.15)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0071ce' }}>
                              {c.id}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: c.status === 'ready' ? '#ecfdf5' : c.status === 'closed' ? '#f1f5f9' : '#fffbeb',
                                color: c.status === 'ready' ? '#059669' : c.status === 'closed' ? '#64748b' : '#d97706',
                              }}
                            >
                              {c.outcome ? `● ${c.outcome}` : c.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                            {a?.name || c.asset_id}
                          </div>
                          <p
                            style={{
                              fontSize: '12px',
                              color: '#64748b',
                              marginTop: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.symptoms}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <details className="equipment-management">
                  <summary>Manage lab equipment <span>{assets.length} records</span></summary>
                  <AssetList
                    assets={assets}
                    liveMode={apiMode === 'live'}
                    selectedAssetId={selectedAssetId}
                    onSelectAsset={(a) => setSelectedAssetId(a.id)}
                    onCreateAsset={async (input) => { await apiClient.createAsset(input); setAssets(await apiClient.getAssets()); }}
                    onUpdateAsset={async (id, input) => { await apiClient.updateAsset(id, input); setAssets(await apiClient.getAssets()); refetchAlerts(); }}
                  />
                </details>
              </div>

              {/* Right Column: Case Analysis & Ordered Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <CaseView
                  currentCase={currentCase}
                  asset={currentAsset}
                  onRefreshCase={handleRefreshCurrentCase}
                  onDeleteCase={handleDeleteCase}
                  onError={(err) => setGlobalError(err?.error || err)}
                />
              </div>
            </div>

            {/* Bottom Section: Multi-tab Computer Assistance Panel */}
            <ComputerAssistancePanel
              assets={assets}
              selectedAssetId={selectedAssetId}
              liveMode={apiMode === 'live'}
              onError={(err) => setGlobalError(err?.error || err)}
            />
          </div>
        )}

        {/* TAB 2: FACTORY OPERATIONS & SCHEDULING */}
        {activeTab === 'factory' && (
          <div className="teacher-content">
          <section className="teacher-welcome compact-welcome">
            <div><p className="eyebrow">TEACHING &amp; LAB PLANNING</p><h1>Turn your syllabus into a teaching plan</h1><p>Plan each lecture around your timetable, holidays, and syllabus deadline.</p></div>
          </section>
          <FactoryDashboard
            assets={assets}
            onError={(err) => setGlobalError(err?.error || err)}
          />
          </div>
        )}
      </main>

      {/* Slide-out Alert Center Drawer */}
      <AlertsDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={alerts}
        onAcknowledge={ackAlert}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
      />

      {/* SVVV Academic Project Evaluation Modal */}
      <SvvvAcademicModal
        isOpen={isAcademicModalOpen}
        onClose={() => setIsAcademicModalOpen(false)}
      />

      <footer className="teacher-footer">Faculty workspace · Times shown in Asia/Kolkata</footer>
    </div>
  );
};
