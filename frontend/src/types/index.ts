// Authoritative TypeScript interfaces matching 00_SRS.md specifications

export type AssetCategory = 'computer' | 'factory_machine' | 'appliance';
export type AssetStatus = 'operational' | 'maintenance' | 'faulty' | 'retired';

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  manufacturer: string | null;
  model: string | null;
  status: AssetStatus;
  mass_kg: number | null;
}

export interface CreateAssetInput {
  name: string;
  category: AssetCategory;
  manufacturer?: string | null;
  model?: string | null;
  mass_kg?: number | null;
}

export interface UpdateAssetInput {
  name?: string;
  category?: AssetCategory;
  manufacturer?: string | null;
  model?: string | null;
  status?: AssetStatus;
  mass_kg?: number | null;
}

export interface LocalDeviceCandidate {
  manufacturer: string;
  model: string;
  suggested_name: string;
  existing_asset_id: string | null;
  existing_asset_name: string | null;
}

export type CaseStatus = 'open' | 'analysing' | 'ready' | 'closed';
export type CaseOutcome = 'repaired' | 'unresolved' | 'replaced' | null;

export type Likelihood = 'low' | 'medium' | 'high';
export type StepStatus = 'pending' | 'completed' | 'failed' | 'skipped';
export type Recommendation = 'troubleshoot' | 'professional_repair' | 'replace' | 'insufficient_evidence';

export interface Hypothesis {
  cause: string;
  likelihood: Likelihood;
  evidence: string[];
}

export interface Step {
  id: string;
  instruction: string;
  expected_result: string;
  stop_condition: string | null;
  status: StepStatus;
}

export interface EvidenceSource {
  source_id: string;
  title: string;
  url: string | null;
}

export interface Analysis {
  summary: string;
  hypotheses: Hypothesis[];
  uncertainties: string[];
  steps: Step[];
  recommendation: Recommendation;
  evidence: EvidenceSource[];
  estimated_repair_cost_paise: number | null;
  cost_basis: string | null;
}

export interface Case {
  id: string;
  asset_id: string;
  symptoms: string;
  screenshot_id: string | null;
  diagnostic_id: string | null;
  status: CaseStatus;
  analysis: Analysis | null;
  outcome: CaseOutcome;
  outcome_note: string | null;
  created_at: string;
}

export interface CreateCaseInput {
  asset_id: string;
  symptoms: string;
  screenshot_id?: string | null;
  diagnostic_id?: string | null;
}

export interface ScreenshotAction {
  instruction: string;
  visible_label: string | null;
}

export interface ScreenshotAdvice {
  observations: string[];
  suggested_actions: ScreenshotAction[];
  limitations: string[];
}

export interface UploadScreenshotResponse {
  id: string;
  mime_type: string;
  size_bytes: number;
}

export interface DiagnosticDisk {
  label: string;
  total_bytes: number;
  free_bytes: number;
}

export interface Diagnostic {
  id: string;
  asset_id: string;
  collected_at: string;
  os: {
    name: string;
    version: string;
  };
  memory: {
    total_bytes: number;
    available_bytes: number;
  };
  disks: DiagnosticDisk[];
  cpu: {
    logical_count: number;
  };
  collector_version: string;
}

export interface CreateDiagnosticInput {
  asset_id: string;
  collected_at: string;
  os: {
    name: string;
    version: string;
  };
  memory: {
    total_bytes: number;
    available_bytes: number;
  };
  disks: DiagnosticDisk[];
  cpu: {
    logical_count: number;
  };
  collector_version: string;
}

export interface DiagnosticTriageResponse {
  focus: string;
  title: string;
  recommendation: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export type MaintenanceStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Maintenance {
  id: string;
  asset_id: string;
  title: string;
  description: string;
  interval_days: number | null;
  due_at: string;
  starts_at: string | null;
  ends_at: string | null;
  assignee: string;
  status: MaintenanceStatus;
  completed_at: string | null;
}

export interface CreateMaintenanceInput {
  asset_id: string;
  title: string;
  description: string;
  due_at: string;
  assignee: string;
  interval_days?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface CompleteMaintenanceResult {
  completed: Maintenance;
  next: Maintenance | null;
}

export type LessonStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Lesson {
  id: string;
  asset_id: string | null;
  title: string;
  instructions: string;
  starts_at: string;
  ends_at: string;
  assignee: string;
  blocks_asset: boolean;
  status: LessonStatus;
}

export interface CreateLessonInput {
  title: string;
  instructions: string;
  starts_at: string;
  ends_at: string;
  assignee: string;
  asset_id?: string | null;
  blocks_asset?: boolean;
}

export type ProductionStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Production {
  id: string;
  asset_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  quantity: number;
  status: ProductionStatus;
}

export interface CreateProductionInput {
  asset_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  quantity: number;
}

export type EntityType = 'maintenance' | 'lesson' | 'production';
export type AlertKind = 'due_soon' | 'due' | 'overdue' | 'equipment_unavailable';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  message: string;
  triggered_at: string;
  acknowledged_at: string | null;
}

export type JobKind = 'case_analysis' | 'screenshot_analysis' | 'browser_run' | 'desktop_run';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface JobError {
  code: string;
  message: string;
}

export interface Job<T = any> {
  id: string;
  kind: JobKind;
  status: JobStatus;
  result: T | null;
  error: JobError | null;
}

export interface BrowserSource {
  id: string;
  title: string;
  url: string;
}

export interface BrowserTraceItem {
  action: string;
  target: string;
  status: 'succeeded' | 'failed';
}

export interface BrowserResult {
  source_id: string;
  url: string;
  page_title: string;
  excerpt: string;
  trace: BrowserTraceItem[];
  advice: string | null;
}

// --- Native Desktop Session Types (Clef + UI Automation) ---
export type DesktopAppId = 'calculator' | 'settings' | 'taskmgr';
export type DesktopSessionStatus = 'running' | 'needs_approval' | 'needs_user' | 'stopped' | 'completed' | 'failed';

export interface DesktopWindow {
  handle: number;
  process_id: number;
  application: 'Calculator' | 'TaskManager' | 'Settings';
}

export interface DesktopDebugEvent {
  at: string;
  event: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DesktopTraceStep {
  step_number: number;
  timestamp: string;
  control_name: string;
  control_type: string;
  action: 'invoke' | 'select' | 'text' | 'key' | 'scroll' | 'wait' | 'ask_user' | 'stop';
  value?: string | null;
  verified_state?: string | null;
  status: 'succeeded' | 'failed' | 'stopped';
}

export interface DesktopSession {
  id: string;
  app_id: DesktopAppId;
  app_title: string;
  goal: string;
  status: DesktopSessionStatus;
  stage: 'inspection' | 'execution';
  message: string;
  window: DesktopWindow;
  proposed_action?: Record<string, unknown> | null;
  debug_events: DesktopDebugEvent[];
  approval_scope: { max_actions: number; deadline_seconds: number; inspect_only: boolean };
  started_at: string;
  stopped_at?: string | null;
  steps: DesktopTraceStep[];
  verified_result?: string | null;
  error?: string | null;
}

export interface DesktopSessionCreate {
  window: DesktopWindow;
  goal: string;
  acceptance: { automation_id: string; name_equals: string };
}

export interface ImpactSummary {
  confirmed_repairs: number;
  estimated_retained_mass_kg: number;
  assets_missing_mass: number;
  methodology: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, any> | null;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export type DemoRole = 'operator' | 'technician' | 'planner' | 'professor';
