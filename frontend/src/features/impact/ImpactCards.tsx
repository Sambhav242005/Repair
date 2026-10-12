import React from 'react';
import { ImpactSummary } from '../../types';
import { ShieldCheck, Scale, Info } from 'lucide-react';

interface ImpactCardsProps {
  impact: ImpactSummary | null;
  loading?: boolean;
}

export const ImpactCards: React.FC<ImpactCardsProps> = ({ impact, loading }) => {
  return (
    <div id="impact-section" style={{ marginBottom: '28px' }}>
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
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #10b981',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Confirmed Reuse
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} color="#059669" />
            </div>
          </div>

          <div style={{ margin: '14px 0 8px' }}>
            <div
              id="stat-confirmed-repairs"
              style={{
                fontSize: '34px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.1,
              }}
            >
              {loading ? '...' : impact ? impact.confirmed_repairs : '0'}
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '4px' }}>
              Confirmed Repaired Equipment
            </p>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
            Unique machines and PCs with completed physical repairs, excluding retired equipment.
          </div>
        </div>

        {/* Card 2: Estimated Retained Mass */}
        <div
          className="card"
          id="impact-card-mass"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #0071ce',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0071ce', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Material Retention
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ebf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={18} color="#0071ce" />
            </div>
          </div>

          <div style={{ margin: '14px 0 8px' }}>
            <div
              id="stat-retained-mass"
              style={{
                fontSize: '34px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.1,
              }}
            >
              {loading ? '...' : impact ? `${impact.estimated_retained_mass_kg} kg` : '0 kg'}
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '4px' }}>
              Estimated Hardware Retained in Use
            </p>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
            Physical hardware preserved in active service before premature retirement.
          </div>
        </div>

        {/* Card 3: Missing Mass & Data Integrity */}
        <div
          className="card"
          id="impact-card-integrity"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #f59e0b',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Strict Accounting
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info size={18} color="#d97706" />
            </div>
          </div>

          <div style={{ margin: '14px 0 8px' }}>
            <div
              id="stat-missing-mass"
              style={{
                fontSize: '34px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.1,
              }}
            >
              {loading ? '...' : impact ? impact.assets_missing_mass : '0'}
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '4px' }}>
              Repaired Units Without Known Mass
            </p>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
            No fabricated estimates: unknown device weights contribute 0 kg to avoid speculative inflation.
          </div>
        </div>
      </div>
    </div>
  );
};
