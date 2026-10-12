import React, { useState, useEffect, useCallback } from 'react';
import { Asset, Case, ImpactSummary, DemoRole, ApiErrorDetail } from './types';
import { apiClient, ApiConnectionMode } from './api/client';
import { useAlertsPolling } from './api/polling';
import { SampleDataBanner } from './components/SampleDataBanner';
import { Header, ActiveTab } from './components/Header';
import { AlertsDrawer } from './components/AlertsDrawer';
import { ErrorBanner } from './components/ErrorBanner';
import { ImpactCards } from './features/impact/ImpactCards';
import { AssetList } from './features/assets/AssetList';
import { RepairCaseForm } from './features/repair/RepairCaseForm';
import { CaseView } from './features/repair/CaseView';
import { ComputerAssistancePanel } from './features/computer-assistance/ComputerAssistancePanel';
import { FactoryDashboard } from './features/factory/FactoryDashboard';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('repair');
  const [apiMode, setApiMode] = useState<ApiConnectionMode>(apiClient.getMode());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState<boolean>(false);
  const [role, setRole] = useState<DemoRole>('technician');

  // Core Data
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('asset_laptop_1');
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('case_1');
  const [impact, setImpact] = useState<ImpactSummary | null>(null);

  // States
  const [loading, setLoading] = useState<boolean>(true);
  const [globalError, setGlobalError] = useState<ApiErrorDetail | string | null>(null);

  // 15-second Alert polling with user-enabled audio chime
  const { alerts, acknowledge: ackAlert, refetch: refetchAlerts } = useAlertsPolling(soundEnabled);
  const unackCount = alerts.filter((a) => !a.acknowledged_at).length;

  // Listen to ApiClient mode changes
  useEffect(() => {
    return apiClient.subscribeMode((mode) => setApiMode(mode));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsData, casesData, impactData] = await Promise.all([
        apiClient.getAssets(),
        apiClient.getCases(),
        apiClient.getImpact(),
      ]);
      setAssets(assetsData);
      setCases(casesData);
      setImpact(impactData);

      if (assetsData.length > 0 && !selectedAssetId) {
        setSelectedAssetId(assetsData[0].id);
      }
      if (casesData.length > 0 && !selectedCaseId) {
        setSelectedCaseId(casesData[0].id);
      }
    } catch (err: any) {
      setGlobalError(err?.error || 'Failed to load initial workspace data');
    } finally {
      setLoading(false);
    }
  }, [selectedAssetId, selectedCaseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler: Toggle API connection mode
  const handleToggleApiMode = () => {
    const nextMode = apiMode === 'live' ? 'mock' : 'live';
    apiClient.setMode(nextMode);
    loadData();
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
    const imp = await apiClient.getImpact();
    setImpact(imp);
  };

  const handleRefreshCurrentCase = async () => {
    if (!selectedCaseId) return;
    try {
      const updated = await apiClient.getCase(selectedCaseId);
      setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      const imp = await apiClient.getImpact();
      setImpact(imp);
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
        const imp = await apiClient.getImpact();
        setImpact(imp);
      } catch (err: any) {
        setGlobalError(err?.error || 'Failed to delete case');
      }
    }
  };

  const currentCase = cases.find((c) => c.id === selectedCaseId) || null;
  const currentAsset = assets.find((a) => a.id === selectedAssetId) || null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Mandatory Sample Data Banner */}
      <SampleDataBanner
        apiMode={apiMode}
        onToggleMode={handleToggleApiMode}
        onResetDemo={handleResetDemo}
      />

      {/* 2. Top Navigation Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unacknowledgedAlertsCount={unackCount}
        onOpenAlerts={() => setIsAlertsDrawerOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        role={role}
        onSelectRole={setRole}
      />

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '24px' }}>
        {/* Global Error Notice with Retry */}
        <ErrorBanner
          error={globalError}
          onRetry={loadData}
          onDismiss={() => setGlobalError(null)}
        />

        {/* Impact Cards (Always prominent on both views) */}
        <ImpactCards impact={impact} loading={loading} />

        {/* TAB 1: REPAIR GUIDANCE & CASES */}
        {activeTab === 'repair' && (
          <div id="repair-tab-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Desktop side-by-side, mobile stacked */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Asset Selection, Case Form, and Case History */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Asset List & Status Manager */}
                <AssetList
                  assets={assets}
                  selectedAssetId={selectedAssetId}
                  onSelectAsset={(a) => setSelectedAssetId(a.id)}
                  onCreateAsset={async (input) => {
                    await apiClient.createAsset(input);
                    const fresh = await apiClient.getAssets();
                    setAssets(fresh);
                  }}
                  onUpdateAsset={async (id, input) => {
                    await apiClient.updateAsset(id, input);
                    const fresh = await apiClient.getAssets();
                    setAssets(fresh);
                    refetchAlerts();
                  }}
                />

                {/* Repair Case Form */}
                <RepairCaseForm
                  assets={assets}
                  selectedAssetId={selectedAssetId}
                  onCaseCreated={handleCaseCreated}
                  onError={(err) => setGlobalError(err?.error || err)}
                />

                {/* Case Selector / History Panel */}
                <div className="card" id="cases-history-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-bright)' }}>
                      Active &amp; Historical Cases ({cases.length})
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {cases.map((c) => {
                      const isSelected = c.id === selectedCaseId;
                      const a = assets.find((item) => item.id === c.asset_id);
                      return (
                        <div
                          key={c.id}
                          id={`case-item-${c.id}`}
                          onClick={() => setSelectedCaseId(c.id)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            border: `1px solid ${isSelected ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--brand-cyan)' }}>
                              {c.id}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                color: c.status === 'ready' ? '#34d399' : c.status === 'closed' ? '#94a3b8' : '#fbbf24',
                              }}
                            >
                              {c.outcome ? `● ${c.outcome}` : c.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-bright)', marginTop: '4px' }}>
                            {a?.name || c.asset_id}
                          </div>
                          <p
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-muted)',
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
              onError={(err) => setGlobalError(err?.error || err)}
            />
          </div>
        )}

        {/* TAB 2: FACTORY OPERATIONS & SCHEDULING */}
        {activeTab === 'factory' && (
          <FactoryDashboard
            assets={assets}
            onError={(err) => setGlobalError(err?.error || err)}
            onRefreshImpact={async () => {
              const imp = await apiClient.getImpact();
              setImpact(imp);
            }}
          />
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

      {/* Footer */}
      <footer
        style={{
          padding: '20px 24px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(7, 10, 18, 0.9)',
          fontSize: '12px',
          color: 'var(--text-dim)',
          textAlign: 'center',
          marginTop: '40px',
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <span>
            Repair Before Replace • Architecture Target: 5-Hour Modular MVP • Timezone: Asia/Kolkata (IST)
          </span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            API: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}
          </span>
        </div>
      </footer>
    </div>
  );
};
