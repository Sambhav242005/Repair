import React, { useState, useEffect, useCallback } from 'react';
import { Asset, Case, ImpactSummary, DemoRole, ApiErrorDetail } from './types';
import { apiClient, ApiConnectionMode } from './api/client';
import { useAlertsPolling } from './api/polling';
import { SampleDataBanner } from './components/SampleDataBanner';
import { Header, ActiveTab } from './components/Header';
import { AlertsDrawer } from './components/AlertsDrawer';
import { ErrorBanner } from './components/ErrorBanner';
import { SvvvAcademicModal } from './components/SvvvAcademicModal';
import { ImpactCards } from './features/impact/ImpactCards';
import { AssetList } from './features/assets/AssetList';
import { RepairCaseForm } from './features/repair/RepairCaseForm';
import { CaseView } from './features/repair/CaseView';
import { CollegeRepairsBanner } from './features/repair/CollegeRepairsBanner';
import { ComputerAssistancePanel } from './features/computer-assistance/ComputerAssistancePanel';
import { FactoryDashboard } from './features/factory/FactoryDashboard';
import { GraduationCap, Award, ChevronRight } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('repair');
  const [apiMode, setApiMode] = useState<ApiConnectionMode>(apiClient.getMode());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState<boolean>(false);
  const [isAcademicModalOpen, setIsAcademicModalOpen] = useState<boolean>(false);
  const [role, setRole] = useState<DemoRole>('professor');

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

  const handleSelectCollegeRepair = (caseId: string, assetId: string) => {
    setSelectedAssetId(assetId);
    setSelectedCaseId(caseId);
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
        role={role}
        onSelectRole={setRole}
        onOpenAcademicModal={() => setIsAcademicModalOpen(true)}
      />

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '24px' }}>
        {/* Professor / Evaluator Academic Banner */}
        {role === 'professor' && (
          <div
            id="svvv-professor-banner"
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderLeft: '4px solid #0071ce',
              borderRadius: '10px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 2px 6px rgba(0, 113, 206, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#0071ce',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <GraduationCap size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                    Shri Vaishnav Vidyapeeth Vishwavidyalaya (SVVV) — Faculty Evaluator Mode
                  </strong>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: '#dbeafe',
                      color: '#1d4ed8',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                    }}
                  >
                    Capstone 2026
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#334155', marginTop: '2px', lineHeight: 1.4 }}>
                  Evaluating AI-guided diagnosis, read-only telemetry, circular material retention, and collision-free workshop scheduling.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAcademicModalOpen(true)}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '12.5px' }}
            >
              <Award size={15} /> Review Viva &amp; Architecture Details
            </button>
          </div>
        )}

        {/* Global Error Notice with Retry */}
        <ErrorBanner
          error={globalError}
          onRetry={loadData}
          onDismiss={() => setGlobalError(null)}
        />

        {/* Impact Cards (Right to Repair circularity metrics) */}
        <ImpactCards impact={impact} loading={loading} />

        {/* TAB 1: REPAIR GUIDANCE & CASES */}
        {activeTab === 'repair' && (
          <div id="repair-tab-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* SVVV Student & Lab Repairs Feature Showcase Banner */}
            <CollegeRepairsBanner
              onSelectRepair={handleSelectCollegeRepair}
              selectedCaseId={selectedCaseId}
            />

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
                      Active &amp; Historical Cases ({cases.length})
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                    {cases.map((c) => {
                      const isSelected = c.id === selectedCaseId;
                      const a = assets.find((item) => item.id === c.asset_id);
                      return (
                        <div
                          key={c.id}
                          id={`case-item-${c.id}`}
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

      {/* SVVV Academic Project Evaluation Modal */}
      <SvvvAcademicModal
        isOpen={isAcademicModalOpen}
        onClose={() => setIsAcademicModalOpen(false)}
      />

      {/* SVVV Institutional Footer */}
      <footer
        style={{
          padding: '24px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          fontSize: '12.5px',
          color: '#64748b',
          textAlign: 'center',
          marginTop: '40px',
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <span>
            <strong>Shri Vaishnav Vidyapeeth Vishwavidyalaya (SVVV), Indore</strong> • Faculty of Engineering &amp; Technology • Capstone 2026
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#0071ce', fontWeight: 600 }}>
            API Endpoint: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'} • Timezone: Asia/Kolkata (IST)
          </span>
        </div>
      </footer>
    </div>
  );
};
