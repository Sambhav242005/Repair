import {
  Asset,
  Case,
  Diagnostic,
  Maintenance,
  Lesson,
  Production,
  Alert,
  BrowserSource,
  ImpactSummary,
} from '../types';

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'asset_laptop_1',
    name: 'College Student ThinkPad T480 (Core i5 / 16GB)',
    category: 'computer',
    manufacturer: 'Lenovo',
    model: 'ThinkPad T480 (20L5)',
    status: 'operational',
    mass_kg: 1.65,
  },
  {
    id: 'asset_phone_1',
    name: 'Student Smartphone (OLED / USB-C)',
    category: 'computer',
    manufacturer: 'Apple / Google',
    model: 'Flagship 6.1" OLED',
    status: 'maintenance',
    mass_kg: 0.18,
  },
  {
    id: 'asset_headphones_1',
    name: 'Noise-Cancelling Studio Headphones & Cable',
    category: 'appliance',
    manufacturer: 'Sony / Bose',
    model: 'ANC Over-Ear Wireless/Wired',
    status: 'maintenance',
    mass_kg: 0.25,
  },
  {
    id: 'asset_machine_1',
    name: 'CNC Milling Center Haas VF-2',
    category: 'factory_machine',
    manufacturer: 'Haas Automation',
    model: 'VF-2SS High-Speed 3-Axis',
    status: 'operational',
    mass_kg: 3540.0,
  },
  {
    id: 'asset_machine_2',
    name: 'Robotic Pick & Place Arm Alpha',
    category: 'factory_machine',
    manufacturer: 'KUKA',
    model: 'KR 6 R900 sixx Agilus',
    status: 'operational',
    mass_kg: 52.0,
  },
];

export const INITIAL_DIAGNOSTICS: Diagnostic[] = [
  {
    id: 'diag_1',
    asset_id: 'asset_laptop_1',
    collected_at: '2026-10-12T08:30:00Z',
    os: {
      name: 'Ubuntu GNU/Linux',
      version: '24.04 LTS (x86_64)',
    },
    memory: {
      total_bytes: 16777216000, // 16 GB
      available_bytes: 1887436800, // 1.75 GB
    },
    disks: [
      {
        label: '/ (NVMe Root)',
        total_bytes: 512110190592, // 512 GB
        free_bytes: 17179869184, // 16 GB
      },
    ],
    cpu: {
      logical_count: 8,
    },
    collector_version: '1.0.0-cli-safe',
  },
];

export const INITIAL_BROWSER_SOURCES: BrowserSource[] = [
  {
    id: 'source_lenovo_support',
    title: 'Lenovo ThinkPad T480 Hardware Maintenance Manual',
    url: 'https://support.lenovo.com/manuals/thinkpad-t480-hmm',
  },
  {
    id: 'source_haas_cnc',
    title: 'Haas VF Series Spindle & Lubrication Technical Service Guide',
    url: 'https://support.haascnc.com/service/vf-series-manual',
  },
  {
    id: 'source_kuka_robotics',
    title: 'KUKA KR AGILUS Sixx Safety Interlock & Calibration Documentation',
    url: 'https://support.kuka.com/robotics/agilus-maintenance-portal',
  },
];

export const INITIAL_CASES: Case[] = [
  {
    id: 'case_1',
    asset_id: 'asset_laptop_1',
    symptoms: 'System hangs on application launch; thermal throttling observed and storage critically low (<5% available).',
    screenshot_id: null,
    diagnostic_id: 'diag_1',
    status: 'ready',
    created_at: '2026-10-12T08:45:00Z',
    analysis: {
      summary: 'Diagnostic logs indicate 96.6% disk volume capacity exhaustion and high physical memory pressure (1.75 GB free out of 16 GB). No permanent hardware degradation is evidenced.',
      hypotheses: [
        {
          cause: 'Temporary log file & system cache accumulation filling root storage partition',
          likelihood: 'high',
          evidence: [
            'Root NVMe filesystem is at 96.6% usage with only 16 GB free out of 512 GB',
            'Linux kernel page thrashing occurs when root drive has inadequate swap & temporary buffer space',
          ],
        },
        {
          cause: 'Heavy background resident processes or browser memory leak',
          likelihood: 'medium',
          evidence: [
            'Physical memory reported available is 1.75 GB (11% headroom remaining)',
          ],
        },
        {
          cause: 'Physical NVMe NAND flash degradation',
          likelihood: 'low',
          evidence: [
            'Read-only collector detected normal block device mount flags without filesystem I/O corruption errors',
          ],
        },
      ],
      uncertainties: [
        'SMART attribute parameters were excluded by read-only non-privileged collector script',
        'Specific PID memory attribution requires inspecting non-redacted local process tables',
      ],
      steps: [
        {
          id: 'step_1',
          instruction: 'Execute journal vacuum and package cache cleanup: run `sudo journalctl --vacuum-time=3d` and clean package caches.',
          expected_result: 'Reclaims at least 15 GB to 30 GB of storage space on NVMe partition.',
          stop_condition: 'Abort if file system mounts as read-only or reports kernel EXT4/BTRFS I/O errors.',
          status: 'completed',
        },
        {
          id: 'step_2',
          instruction: 'Audit `/var/log` and user cache directories (`~/.cache`) for unbounded log runaway.',
          expected_result: 'Identify any runaway container log or lingering core dumps.',
          stop_condition: null,
          status: 'pending',
        },
        {
          id: 'step_3',
          instruction: 'Inspect system fan vent intake with canned air; ensure cooling exhaust is unobstructed.',
          expected_result: 'Restores CPU thermal headroom and lowers idle temperature.',
          stop_condition: 'Do not insert metallic probes or unapproved tools into chassis vent openings.',
          status: 'pending',
        },
      ],
      recommendation: 'troubleshoot',
      evidence: [
        {
          source_id: 'source_lenovo_support',
          title: 'Lenovo ThinkPad T480 Hardware Maintenance Manual Section 4 (Thermal & Storage)',
          url: 'https://support.lenovo.com/manuals/thinkpad-t480-hmm',
        },
      ],
      estimated_repair_cost_paise: 0,
      cost_basis: 'In-house diagnostic maintenance and storage partition maintenance; no replacement parts required.',
    },
    outcome: null,
    outcome_note: null,
  },
  {
    id: 'case_phone_1',
    asset_id: 'asset_phone_1',
    symptoms: 'Cracked outer display glass and battery capacity degraded to 68% after dropping on dorm floor.',
    screenshot_id: null,
    diagnostic_id: null,
    status: 'ready',
    created_at: '2026-10-12T09:15:00Z',
    analysis: {
      summary: 'Visual inspection shows fractured Gorilla Glass digitizer and degraded Li-ion pouch cell. Core logic board and camera modules are functional.',
      hypotheses: [
        {
          cause: 'Physical drop impact fractured front glass and delaminated capacitive touch layer',
          likelihood: 'high',
          evidence: ['Spiderweb glass cracks originating from lower chassis corner impact point'],
        },
        {
          cause: 'Electrolyte degradation after 700+ charge cycles causing accelerated discharge',
          likelihood: 'high',
          evidence: ['Battery health reports 68% maximum capacity; unexpected shutoff below 20%'],
        },
      ],
      uncertainties: ['Verify biometric face ID sensor flex cable was not severed during chassis flex.'],
      steps: [
        {
          id: 'step_p1',
          instruction: 'Warm perimeter display adhesive with an iOpener heat pad or thermal mat at 75°C for 3 minutes.',
          expected_result: 'Perimeter waterproof adhesive softens sufficiently for prying.',
          stop_condition: 'Do not exceed 80°C or expose camera sensors to concentrated heat.',
          status: 'completed',
        },
        {
          id: 'step_p2',
          instruction: 'Apply suction cup near bottom edge, gently lift to create gap, and slice adhesive with an iFixit opening pick.',
          expected_result: 'Separates bottom clips without tearing ambient light sensor flex cable.',
          stop_condition: 'Do not insert pick deeper than 3mm near right edge where display flex cable is routed.',
          status: 'pending',
        },
        {
          id: 'step_p3',
          instruction: 'Disconnect battery connector bracket with a nylon spudger before unfastening display ribbons.',
          expected_result: 'Safely cuts motherboard power to prevent short-circuiting sensitive capacitors.',
          stop_condition: 'CAUTION: Always disconnect battery first using nylon spudger; never use metal tweezers.',
          status: 'pending',
        },
        {
          id: 'step_p4',
          instruction: 'Pull stretch-release battery adhesive strips horizontally at a low 15° angle; install replacement OEM battery & OLED panel.',
          expected_result: 'Clean battery release without puncturing pouch; screen boots with crisp image and full touch response.',
          stop_condition: 'If adhesive strip breaks, do NOT pry with sharp metal tools. Apply 99% isopropyl alcohol under battery.',
          status: 'pending',
        },
      ],
      recommendation: 'replace',
      evidence: [
        {
          source_id: 'source_ifixit_college',
          title: 'iFixit College Tech Maintenance Guide: Smartphone Screen & Battery Overhaul',
          url: 'https://www.ifixit.com/News/64177/here-are-the-three-repairs-youll-need-to-know-in-college',
        },
      ],
      estimated_repair_cost_paise: 350000,
      cost_basis: 'Replacement OEM-grade OLED display assembly and genuine high-capacity battery cell.',
    },
    outcome: null,
    outcome_note: null,
  },
  {
    id: 'case_headphones_1',
    asset_id: 'asset_headphones_1',
    symptoms: 'USB-C charging port only connects when pushed at an angle; left audio channel crackles when cable is jostled.',
    screenshot_id: null,
    diagnostic_id: null,
    status: 'ready',
    created_at: '2026-10-12T09:30:00Z',
    analysis: {
      summary: 'Inspection reveals tightly compacted pocket lint jammed inside USB-C receptacle preventing pin seating. Audio cable strain-relief shows micro-fractured ground braid.',
      hypotheses: [
        {
          cause: 'Compacted fabric lint and pocket debris obstructing USB-C connector pins',
          likelihood: 'high',
          evidence: ['Cable plug does not seat with full tactile click; 1.5mm gap visible'],
        },
        {
          cause: 'Repeated backpack cable bending caused copper wire fatigue inside rubber collar',
          likelihood: 'high',
          evidence: ['Multimeter continuity test beeps intermittently when wiggling strain-relief neck'],
        },
      ],
      uncertainties: ['Confirm internal dynamic driver voice coil has no physical voice coil rub.'],
      steps: [
        {
          id: 'step_h1',
          instruction: 'Use a wooden toothpick or precision non-conductive ESD probe under bright task lighting to extract compacted lint from USB-C socket.',
          expected_result: 'Extracts lint bolus; USB-C cable seats with distinct tactile click.',
          stop_condition: 'Never use metal needles or paperclips inside USB-C port to avoid bending spring contacts or shorting VBUS pins.',
          status: 'completed',
        },
        {
          id: 'step_h2',
          instruction: 'Clean internal copper connector pins with 99.9% Isopropyl Alcohol and micro-swabs.',
          expected_result: 'Removes surface oxidation; steady 5V/2A charging negotiated.',
          stop_condition: 'Ensure device is fully powered off and alcohol evaporates completely before plugging in.',
          status: 'pending',
        },
        {
          id: 'step_h3',
          instruction: 'Cut fatigued strain-relief collar, strip outer jacket, solder broken ground wire, and seal with dual-wall adhesive heat-shrink tubing.',
          expected_result: 'Zero ohm continuity on multimeter beep test; left audio channel fully restored.',
          stop_condition: 'Avoid touching adjacent audio shielding wires with hot soldering iron tip.',
          status: 'pending',
        },
      ],
      recommendation: 'troubleshoot',
      evidence: [
        {
          source_id: 'source_ifixit_college',
          title: 'iFixit College Repairs: Cable Splice, Connector Pin Cleaning & Lint Extraction',
          url: 'https://www.ifixit.com/News/64177/here-are-the-three-repairs-youll-need-to-know-in-college',
        },
      ],
      estimated_repair_cost_paise: 0,
      cost_basis: 'Zero-cost mechanical lint extraction, contact cleaning, and solder wire splice.',
    },
    outcome: null,
    outcome_note: null,
  },
];

export const INITIAL_MAINTENANCE: Maintenance[] = [
  {
    id: 'maint_1',
    asset_id: 'asset_machine_1',
    title: 'Spindle Lubrication Reservoir Flush & High-Pressure Filter Replacement',
    description: 'Inspect lubrication pressure level, clean brass fluid mesh, replace 5-micron inline filtration cartridge, and test cycle oil delivery rate.',
    interval_days: 30,
    due_at: '2026-10-12T10:00:00Z',
    starts_at: '2026-10-12T14:00:00Z',
    ends_at: '2026-10-12T15:30:00Z',
    assignee: 'Ravi Kumar (Chief Technician)',
    status: 'scheduled',
    completed_at: null,
  },
];

export const INITIAL_LESSONS: Lesson[] = [
  {
    id: 'lesson_1',
    asset_id: 'asset_machine_1',
    title: 'CNC G-Code Zero-Point Touch Probe Calibration Workshop',
    instructions: 'Hands-on apprentice training covering Renishaw touch probe offset measurement, work coordinate setup (G54), and spindle safety clearance checks.',
    starts_at: '2026-10-12T16:00:00Z',
    ends_at: '2026-10-12T17:30:00Z',
    assignee: 'Aarav Sharma (Apprentice Technician)',
    blocks_asset: true,
    status: 'scheduled',
  },
];

export const INITIAL_PRODUCTION: Production[] = [
  {
    id: 'prod_1',
    asset_id: 'asset_machine_1',
    title: 'Aerospace Structural Bracket Batch #204',
    starts_at: '2026-10-12T11:00:00Z',
    ends_at: '2026-10-12T13:30:00Z',
    quantity: 65,
    status: 'scheduled',
  },
];

export const INITIAL_ALERTS: Alert[] = [
  {
    id: 'alert_maint_1_due_soon',
    entity_type: 'maintenance',
    entity_id: 'maint_1',
    kind: 'due_soon',
    severity: 'warning',
    message: 'Haas VF-2 Spindle Lubrication Reservoir Flush is due within 24 hours (Due: 15:30 IST).',
    triggered_at: '2026-10-12T09:00:00Z',
    acknowledged_at: null,
  },
];

export const INITIAL_IMPACT: ImpactSummary = {
  confirmed_repairs: 1,
  estimated_retained_mass_kg: 1.65,
  assets_missing_mass: 0,
  methodology: 'Strictly counts distinct physical equipment with recorded "repaired" outcomes, excluding retired or replaced units. Retained mass equals sum of known manufacturer/asset mass. Does not extrapolate unverified carbon credits.',
};
