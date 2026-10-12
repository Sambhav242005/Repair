import React from 'react';
import { ImpactSummary } from '../../types';
import { ShieldCheck, Scale, AlertCircle, Info } from 'lucide-react';

interface ImpactCardsProps {
  impact: ImpactSummary | null;
  loading?: boolean;
}

export const ImpactCards: React.FC<ImpactCardsProps> = ({ impact, loading }) => {
  return (
    <div id="impact-section" style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Confirmed Repaired Assets */}
        <div
          className="card"
          id="impact-card-repairs"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderLeft: '4px solid #10b981',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Verified Outcome
            </span>
            <ShieldCheck size={20} color="#10b981" />
          </div>

          <div style={{ margin: '14px 0 8px' }}>
            <div
              id="stat-confirmed-repairs"
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: 'var(--text-bright)',
                lineHeight: 1.1,
              }}
            >
              {loading ? '...' : impact ? impact.confirmed_repairs : '0'}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Confirmed Repaired Assets
            </p>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-dim)', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            Strictly counts distinct devices with recorded outcome = <code>repaired</code>. Excludes retired units.
          </div>
        </div>

        {/* Card 2: Estimated Retained Mass */}
        <div
          className="card"
          id="impact-card-mass"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderLeft: '4px solid #0ea5e9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Material Retention
            </span>
            <Scale size={20} color="#0ea5e9" />
          </div>

          <div style={{ margin: '14px 0 8px' }}>
            <div
              id="stat-retained-mass"
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: 'var(--text-bright)',
                lineHeight: 1.1,
              }}
            >
              {loading ? '...' : impact ? `${impact.estimated_retained_mass_kg} kg` : '0 kg'}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Estimated Device Mass Retained in Use
            </p>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-dim)', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            Sum of physical hardware weight preserved before premature replacement.
          </div>
        </div>

        {/* Card 3: Missing Mass & Data Integrity */}
        <div
          className="card"
          id="impact-card-missing-mass"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Data Integrity
            </span>
            <AlertCircle size={20} color="#f59e0b" />
          </div>

          <div style={{ margin: '14px 0 8px' }}>
            <div
              id="stat-missing-mass"
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: 'var(--text-bright)',
                lineHeight: 1.1,
              }}
            >
              {loading ? '...' : impact ? impact.assets_missing_mass : '0'}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Assets Missing Verified Mass (kg)
            </p>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-dim)', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            Contributes zero kg to retained mass rather than estimating or inventing figures.
          </div>
        </div>
      </div>

      {/* Methodology and Assumptions notice */}
      <div
        id="impact-methodology-card"
        style={{
          marginTop: '12px',
          padding: '12px 18px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <Info size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
        <span>
          <strong>Accounting Methodology:</strong> {impact?.methodology || 'Confirmed repairs reflect unique assets with verified repairs. No carbon reduction or carbon credits are asserted without accredited supplier lifecycle factors.'}
        </span>
      </div>
    </div>
  );
};
