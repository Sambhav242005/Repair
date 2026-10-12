import React from 'react';
import {
  Laptop,
  Smartphone,
  Headphones,
  Wrench,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Sparkles,
} from 'lucide-react';

interface CollegeRepairsBannerProps {
  onSelectRepair: (caseId: string, assetId: string) => void;
  selectedCaseId: string;
}

export const CollegeRepairsBanner: React.FC<CollegeRepairsBannerProps> = ({
  onSelectRepair,
  selectedCaseId,
}) => {
  const repairs = [
    {
      id: 'case_1',
      assetId: 'asset_laptop_1',
      icon: <Laptop size={22} color="#0071ce" />,
      number: '1',
      title: 'Laptop Cooling Fan & Battery Overhaul',
      tagline: 'Fix screaming fans & thermal throttling in class',
      tools: 'iFixit Precision Bits, Thermal Compound, ESD Spudger',
      savings: 'Saves ₹65,000 • 1.65 kg Hardware Retained',
      difficulty: 'Moderate • 25 Mins',
    },
    {
      id: 'case_phone_1',
      assetId: 'asset_phone_1',
      icon: <Smartphone size={22} color="#0071ce" />,
      number: '2',
      title: 'Phone Screen & Battery Replacement',
      tagline: 'Repair shattered glass & 68% battery degradation',
      tools: 'iOpener Heat Mat, Suction Handle, P2 Pentalobe',
      savings: 'Saves ₹25,000 • 0.18 kg Hardware Retained',
      difficulty: 'Moderate • 30 Mins',
    },
    {
      id: 'case_headphones_1',
      assetId: 'asset_headphones_1',
      icon: <Headphones size={22} color="#0071ce" />,
      number: '3',
      title: 'Headphone Cable & USB-C Port Reconditioning',
      tagline: 'Extract pocket lint & splice broken strain-relief wires',
      tools: 'Non-conductive Probe, Multimeter, Solder Sleeve',
      savings: 'Saves ₹15,000 • 0.25 kg Hardware Retained',
      difficulty: 'Easy • 15 Mins',
    },
  ];

  return (
    <div
      id="college-repairs-feature-banner"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '24px 28px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
        marginBottom: '24px',
      }}
    >
      {/* Category Tag & Byline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              backgroundColor: '#ebf5ff',
              color: '#0071ce',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '3px 10px',
              borderRadius: '9999px',
              border: '1px solid #b9e1ff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <BookOpen size={12} /> iFixit News &amp; Master Guides
          </span>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Right to Repair Initiative
          </span>
        </div>

        <a
          href="https://www.ifixit.com/News/64177/here-are-the-three-repairs-youll-need-to-know-in-college"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '12px',
            color: '#0071ce',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 700,
          }}
        >
          View Original on iFixit.com <ExternalLink size={13} />
        </a>
      </div>

      {/* Main Headline */}
      <h2
        style={{
          fontSize: '26px',
          fontWeight: 800,
          color: '#0f172a',
          letterSpacing: '-0.02em',
          marginBottom: '8px',
          lineHeight: 1.3,
        }}
      >
        Here Are the Three Repairs You’ll Need to Know in College
      </h2>

      <p
        style={{
          fontSize: '14.5px',
          color: '#475569',
          lineHeight: 1.6,
          maxWidth: '960px',
          marginBottom: '20px',
        }}
      >
        You’re off to school, loaded up with the tech you need to get through it. But at some point, a laptop fan will scream, a phone battery will drop like a stone, or a headphone jack will snap. Learning how to repair your own gear keeps your private data secure, saves thousands of dollars, and keeps e-waste out of landfills.
      </p>

      {/* The 3 Interactive Repair Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '16px',
        }}
      >
        {repairs.map((rep) => {
          const isSelected = selectedCaseId === rep.id;
          return (
            <div
              key={rep.id}
              onClick={() => onSelectRepair(rep.id, rep.assetId)}
              style={{
                backgroundColor: isSelected ? '#f0f9ff' : '#f8fafc',
                border: `2px solid ${isSelected ? '#0071ce' : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isSelected ? '0 4px 12px rgba(0, 113, 206, 0.15)' : 'none',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        backgroundColor: '#0071ce',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                      }}
                    >
                      REPAIR {rep.number}
                    </span>
                    <div style={{ color: '#0071ce' }}>{rep.icon}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                    {rep.difficulty}
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  {rep.title}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '10px', lineHeight: 1.4 }}>
                  {rep.tagline}
                </p>

                <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '8px' }}>
                  <strong>Fix Kit Tools:</strong> {rep.tools}
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '10px',
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#059669' }}>
                  {rep.savings}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isSelected ? '#0071ce' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  {isSelected ? 'Loaded in Guide' : 'Open Guide'} <ChevronRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
