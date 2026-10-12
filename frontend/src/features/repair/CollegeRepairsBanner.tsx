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
  GraduationCap,
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
      title: 'SVVV Lab Laptop Cooling Fan & Battery Overhaul',
      tagline: 'Fix roaring fans & thermal throttling during campus lectures & lab code runs',
      tools: 'iFixit Precision Bits, Arctic MX-4, ESD Spudger',
      savings: 'Saves ₹65,000 • 1.65 kg Hardware Retained',
      difficulty: 'Moderate • 25 Mins',
    },
    {
      id: 'case_phone_1',
      assetId: 'asset_phone_1',
      icon: <Smartphone size={22} color="#0071ce" />,
      number: '2',
      title: 'Student Smartphone Screen & Battery Swap',
      tagline: 'Repair shattered Gorilla glass & 68% battery degradation from dorm drops',
      tools: 'iOpener Heat Mat, Suction Handle, P2 Pentalobe',
      savings: 'Saves ₹25,000 • 0.18 kg Hardware Retained',
      difficulty: 'Moderate • 30 Mins',
    },
    {
      id: 'case_headphones_1',
      assetId: 'asset_headphones_1',
      icon: <Headphones size={22} color="#0071ce" />,
      number: '3',
      title: 'Lab Audio, Multimeter & USB-C Cable Reconditioning',
      tagline: 'Extract compacted pocket lint from charging ports & splice broken signal wires',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              backgroundColor: '#ebf5ff',
              color: '#0071ce',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              padding: '3px 10px',
              borderRadius: '9999px',
              border: '1px solid #b9e1ff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <GraduationCap size={13} /> SVVV Student &amp; Lab Initiative
          </span>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Shri Vaishnav Vidyapeeth Vishwavidyalaya • Right to Repair Education
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
          View Reference Guide on iFixit.com <ExternalLink size={13} />
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
        Here Are the Three Repairs You’ll Need to Know in College — SVVV Student Edition
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
        For students, lab assistants, and researchers at <strong>Shri Vaishnav Vidyapeeth Vishwavidyalaya (SVVV)</strong>: when a laptop fan screams in the campus computer lab, a phone battery drops rapidly, or an electronics multimeter cable snaps, repairing instead of replacing protects student privacy, preserves hardware budgets, and keeps e-waste out of local Indore landfills.
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
