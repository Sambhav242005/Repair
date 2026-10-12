import {
  Asset,
  Case,
  Diagnostic,
  Maintenance,
  Lesson,
  Production,
  Alert,
  BrowserSource,
  BrowserResult,
  ScreenshotAdvice,
  Job,
  ImpactSummary,
  CreateAssetInput,
  UpdateAssetInput,
  CreateCaseInput,
  StepStatus,
  CaseOutcome,
  CreateMaintenanceInput,
  CompleteMaintenanceResult,
  CreateLessonInput,
  CreateProductionInput,
  UploadScreenshotResponse,
  CreateDiagnosticInput,
} from '../types';
import {
  INITIAL_ASSETS,
  INITIAL_CASES,
  INITIAL_DIAGNOSTICS,
  INITIAL_MAINTENANCE,
  INITIAL_LESSONS,
  INITIAL_PRODUCTION,
  INITIAL_ALERTS,
  INITIAL_BROWSER_SOURCES,
} from './fixtures';

const STORAGE_KEY = 'repair_before_replace_state_v1';

interface StoredState {
  assets: Asset[];
  cases: Case[];
  diagnostics: Diagnostic[];
  maintenance: Maintenance[];
  lessons: Lesson[];
  production: Production[];
  alerts: Alert[];
  browserSources: BrowserSource[];
  jobs: Record<string, Job>;
  screenshots: Record<string, { id: string; url: string; mime_type: string; size_bytes: number }>;
}

function loadState(): StoredState {
  try {
    if (typeof localStorage === 'undefined') return getInitialState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load local storage state:', e);
  }
  return getInitialState();
}

function saveState(state: StoredState) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to persist local storage state:', e);
  }
}

function getInitialState(): StoredState {
  return {
    assets: [...INITIAL_ASSETS],
    cases: [...INITIAL_CASES],
    diagnostics: [...INITIAL_DIAGNOSTICS],
    maintenance: [...INITIAL_MAINTENANCE],
    lessons: [...INITIAL_LESSONS],
    production: [...INITIAL_PRODUCTION],
    alerts: [...INITIAL_ALERTS],
    browserSources: [...INITIAL_BROWSER_SOURCES],
    jobs: {},
    screenshots: {},
  };
}

export class MockEngine {
  private state: StoredState;

  constructor() {
    this.state = loadState();
  }

  public reset() {
    this.state = getInitialState();
    saveState(this.state);
  }

  public getAssets(): Asset[] {
    return this.state.assets;
  }

  public createAsset(input: CreateAssetInput): Asset {
    const asset: Asset = {
      id: `asset_${Date.now()}`,
      name: input.name,
      category: input.category,
      manufacturer: input.manufacturer ?? null,
      model: input.model ?? null,
      status: 'operational',
      mass_kg: input.mass_kg !== undefined ? input.mass_kg : null,
    };
    this.state.assets.push(asset);
    saveState(this.state);
    return asset;
  }

  public updateAsset(id: string, input: UpdateAssetInput): Asset {
    const asset = this.state.assets.find((a) => a.id === id);
    if (!asset) {
      throw { error: { code: 'NOT_FOUND', message: `Asset ${id} not found` } };
    }
    if (input.name !== undefined) asset.name = input.name;
    if (input.category !== undefined) asset.category = input.category;
    if (input.manufacturer !== undefined) asset.manufacturer = input.manufacturer;
    if (input.model !== undefined) asset.model = input.model;
    if (input.status !== undefined) {
      asset.status = input.status;
      // If asset changed to faulty/maintenance, raise alert for affected active or future production jobs
      if (asset.status === 'faulty' || asset.status === 'maintenance') {
        const affectedProd = this.state.production.filter(
          (p) => p.asset_id === id && p.status === 'scheduled'
        );
        for (const p of affectedProd) {
          const alertId = `alert_equip_unavail_${p.id}_${Date.now()}`;
          if (!this.state.alerts.some((al) => al.entity_id === p.id && al.kind === 'equipment_unavailable')) {
            this.state.alerts.unshift({
              id: alertId,
              entity_type: 'production',
              entity_id: p.id,
              kind: 'equipment_unavailable',
              severity: 'critical',
              message: `Equipment ${asset.name} status changed to ${asset.status}; production job "${p.title}" cannot proceed.`,
              triggered_at: new Date().toISOString(),
              acknowledged_at: null,
            });
          }
        }
      }
    }
    if (input.mass_kg !== undefined) asset.mass_kg = input.mass_kg;
    saveState(this.state);
    return asset;
  }

  public uploadScreenshot(file: File): Promise<UploadScreenshotResponse> {
    const id = `scr_${Date.now()}`;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        this.state.screenshots[id] = {
          id,
          url,
          mime_type: file.type || 'image/png',
          size_bytes: file.size,
        };
        saveState(this.state);
        resolve({
          id,
          mime_type: file.type || 'image/png',
          size_bytes: file.size,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  public getScreenshot(id: string) {
    return this.state.screenshots[id] || null;
  }

  public createDiagnostic(input: CreateDiagnosticInput): Diagnostic {
    const diag: Diagnostic = {
      id: `diag_${Date.now()}`,
      asset_id: input.asset_id,
      collected_at: input.collected_at || new Date().toISOString(),
      os: input.os,
      memory: input.memory,
      disks: input.disks,
      cpu: input.cpu,
      collector_version: input.collector_version || '1.0.0-cli-safe',
    };
    this.state.diagnostics.push(diag);
    saveState(this.state);
    return diag;
  }

  public getDiagnostics(assetId?: string): Diagnostic[] {
    if (assetId) {
      return this.state.diagnostics.filter((d) => d.asset_id === assetId);
    }
    return this.state.diagnostics;
  }

  public createCase(input: CreateCaseInput): Case {
    const asset = this.state.assets.find((a) => a.id === input.asset_id);
    if (!asset) {
      throw { error: { code: 'NOT_FOUND', message: `Asset ${input.asset_id} not found` } };
    }
    const c: Case = {
      id: `case_${Date.now()}`,
      asset_id: input.asset_id,
      symptoms: input.symptoms,
      screenshot_id: input.screenshot_id || null,
      diagnostic_id: input.diagnostic_id || null,
      status: 'open',
      analysis: null,
      outcome: null,
      outcome_note: null,
      created_at: new Date().toISOString(),
    };
    this.state.cases.unshift(c);
    saveState(this.state);
    return c;
  }

  public getCases(assetId?: string): Case[] {
    if (assetId) {
      return this.state.cases.filter((c) => c.asset_id === assetId);
    }
    return this.state.cases;
  }

  public getCase(id: string): Case {
    const c = this.state.cases.find((item) => item.id === id);
    if (!c) {
      throw { error: { code: 'NOT_FOUND', message: `Case ${id} not found` } };
    }
    return c;
  }

  public deleteCase(id: string): void {
    const idx = this.state.cases.findIndex((item) => item.id === id);
    if (idx >= 0) {
      this.state.cases.splice(idx, 1);
      saveState(this.state);
    }
  }

  public analyseCase(caseId: string): { job_id: string } {
    const c = this.getCase(caseId);
    // If already analysing and active job exists, return it
    const existingJob = Object.values(this.state.jobs).find(
      (j) => j.kind === 'case_analysis' && (j.result as any)?.case_id === caseId && j.status === 'running'
    );
    if (existingJob) {
      return { job_id: existingJob.id };
    }

    c.status = 'analysing';
    const jobId = `job_case_${Date.now()}`;
    const job: Job<{ case_id: string }> = {
      id: jobId,
      kind: 'case_analysis',
      status: 'running',
      result: null,
      error: null,
    };
    this.state.jobs[jobId] = job;
    saveState(this.state);

    // Simulate async AI analysis completion after 2.5 seconds
    setTimeout(() => {
      const asset = this.state.assets.find((a) => a.id === c.asset_id);
      const isLaptop = asset?.category === 'computer';

      c.status = 'ready';
      c.analysis = {
        summary: isLaptop
          ? `Analysis of ${asset?.name || 'system'} identified heavy storage consumption and process memory allocation. Primary diagnosis: low free disk headroom impacting swap cache.`
          : `Operational inspection for ${asset?.name || 'machine'} indicates potential mechanical clearance or lubrication deficit under sustained cycle load.`,
        hypotheses: isLaptop
          ? [
              {
                cause: 'Root disk partition nearing capacity exhaustion',
                likelihood: 'high',
                evidence: [
                  'Reported symptoms match disk thrashing behavior',
                  'Collector observations confirm high partition utilization',
                ],
              },
              {
                cause: 'Resident process leak or unclosed browser tabs',
                likelihood: 'medium',
                evidence: ['Available RAM headroom degraded under load'],
              },
              {
                cause: 'Hardware controller fault',
                likelihood: 'low',
                evidence: ['No permanent controller I/O timeouts logged'],
              },
            ]
          : [
              {
                cause: 'Spindle lubricant pressure drop or contaminated inline filter',
                likelihood: 'high',
                evidence: ['Matches scheduled 30-day lubrication maintenance cycle interval'],
              },
              {
                cause: 'Guide rail calibration offset drift',
                likelihood: 'medium',
                evidence: ['Continuous precision milling cycles without zero-point re-probe'],
              },
            ],
        uncertainties: [
          'Detailed hardware SMART parameters omitted by read-only non-invasive collector',
          'Acoustic vibration spectrogram not provided in initial telemetry upload',
        ],
        steps: isLaptop
          ? [
              {
                id: `step_${Date.now()}_1`,
                instruction: 'Purge package caches and system crash core dump directories.',
                expected_result: 'Frees 10-25 GB of immediate storage space on primary disk.',
                stop_condition: 'Abort if kernel reports EXT4/NTFS physical bad sectors.',
                status: 'pending',
              },
              {
                id: `step_${Date.now()}_2`,
                instruction: 'Inspect background startup services and uninstall unused resident utilities.',
                expected_result: 'Reduces idle memory footprint by >1 GB.',
                stop_condition: null,
                status: 'pending',
              },
              {
                id: `step_${Date.now()}_3`,
                instruction: 'Verify cooling exhaust port airflow with non-contact thermometer or fan test.',
                expected_result: 'CPU core temperatures stabilize below 75°C under sustained load.',
                stop_condition: 'Do not probe chassis with metallic implements or open enclosure while energized.',
                status: 'pending',
              },
            ]
          : [
              {
                id: `step_${Date.now()}_1`,
                instruction: 'Inspect fluid reservoir pressure gauge; check brass mesh filter screen.',
                expected_result: 'Fluid level in safe green band; mesh free of metallic swarf.',
                stop_condition: 'Isolate main breaker (Lockout/Tagout) before opening hydraulic chamber.',
                status: 'pending',
              },
              {
                id: `step_${Date.now()}_2`,
                instruction: 'Perform zero-point probe calibration verification across X/Y axis datum.',
                expected_result: 'Runout deviation under 0.005mm tolerance.',
                stop_condition: 'Halt sequence immediately if emergency interlock tripped.',
                status: 'pending',
              },
            ],
        recommendation: 'troubleshoot',
        evidence: [
          {
            source_id: 'source_doc_verified',
            title: isLaptop
              ? 'Lenovo ThinkPad Maintenance Guide (Chapter 3: Diagnostics & Power)'
              : 'Haas Machining Center Preventive Maintenance Standard Manual',
            url: null,
          },
        ],
        estimated_repair_cost_paise: 0,
        cost_basis: 'In-house diagnostic resolution; zero replacement component procurement cost.',
      };

      job.status = 'succeeded';
      job.result = { case_id: caseId };
      saveState(this.state);
    }, 2200);

    return { job_id: jobId };
  }

  public updateStepStatus(caseId: string, stepId: string, status: StepStatus): Case {
    const c = this.getCase(caseId);
    if (!c.analysis) {
      throw { error: { code: 'VALIDATION_ERROR', message: 'Case has not been analysed yet' } };
    }
    const step = c.analysis.steps.find((s) => s.id === stepId);
    if (!step) {
      throw { error: { code: 'NOT_FOUND', message: `Step ${stepId} not found` } };
    }
    step.status = status;
    saveState(this.state);
    return c;
  }

  public recordOutcome(caseId: string, outcome: CaseOutcome, note: string): Case {
    const c = this.getCase(caseId);
    c.outcome = outcome;
    c.outcome_note = note;
    c.status = 'closed';
    saveState(this.state);
    return c;
  }

  public requestScreenshotAdvice(screenshotId: string, question: string): { job_id: string } {
    const jobId = `job_scr_${Date.now()}`;
    const job: Job<ScreenshotAdvice> = {
      id: jobId,
      kind: 'screenshot_analysis',
      status: 'running',
      result: null,
      error: null,
    };
    this.state.jobs[jobId] = job;
    saveState(this.state);

    setTimeout(() => {
      job.status = 'succeeded';
      job.result = {
        observations: [
          'Visible UI shows a Storage Settings dialog indicating "Local Disk (C:)" at 96% utilization with a red alert bar.',
          'Detected visible button labeled "Clean up system files" in the lower right quadrant.',
          'A separate notification popup indicates "Low Disk Space: Files may fail to save".',
        ],
        suggested_actions: [
          {
            instruction: 'Click the button labeled "Clean up system files" to initiate automated scan of old Windows/Linux rollback caches.',
            visible_label: 'Clean up system files',
          },
          {
            instruction: 'Select "Temporary Setup Files" and "Previous Installation Backups" in the checklist that appears.',
            visible_label: 'Temporary Setup Files',
          },
        ],
        limitations: [
          'Guidance is based strictly on visible screen controls; this does not execute or click buttons automatically.',
          'Background system processes and un-rendered window menus cannot be observed from a static snapshot.',
        ],
      };
      saveState(this.state);
    }, 2000);

    return { job_id: jobId };
  }

  public getBrowserSources(): BrowserSource[] {
    return this.state.browserSources;
  }

  public startBrowserRun(assetId: string, sourceId: string, question: string): { job_id: string } {
    const source = this.state.browserSources.find((s) => s.id === sourceId);
    if (!source) {
      throw {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Unknown source ID "${sourceId}". Arbitrary URLs are strictly rejected in MVP.`,
        },
      };
    }

    const jobId = `job_browser_${Date.now()}`;
    const job: Job<BrowserResult> = {
      id: jobId,
      kind: 'browser_run',
      status: 'running',
      result: null,
      error: null,
    };
    this.state.jobs[jobId] = job;
    saveState(this.state);

    setTimeout(() => {
      job.status = 'succeeded';
      job.result = {
        source_id: source.id,
        url: source.url,
        page_title: `${source.title} — Official Verified Documentation`,
        excerpt:
          'Section 4.2 Thermal Maintenance: Clean heat pipe vents every 6 months. Section 5.1 Storage Optimization: Use standard disk maintenance utility. Verify SMART attributes before drive replacement.',
        trace: [
          { action: 'launch_browser_context', target: 'Playwright Chromium Isolated Sandbox', status: 'succeeded' },
          { action: 'navigate_url', target: source.url, status: 'succeeded' },
          { action: 'wait_for_selector', target: 'article.documentation-content, main', status: 'succeeded' },
          { action: 'extract_dom_text', target: 'title, h1, p.lead, table.maintenance-specs', status: 'succeeded' },
          { action: 'close_browser_context', target: 'Sandbox Context Destroyed', status: 'succeeded' },
        ],
        advice: `Verified technical manual retrieved from ${source.title}. Recommended procedure confirms performing non-invasive disk cleanup and fan exhaust cleaning before replacing components.`,
      };
      saveState(this.state);
    }, 2800);

    return { job_id: jobId };
  }

  public getJob(id: string): Job {
    const job = this.state.jobs[id];
    if (!job) {
      throw { error: { code: 'NOT_FOUND', message: `Job ${id} not found` } };
    }
    return job;
  }

  public getMaintenance(): Maintenance[] {
    return this.state.maintenance;
  }

  public createMaintenance(input: CreateMaintenanceInput): Maintenance {
    const asset = this.state.assets.find((a) => a.id === input.asset_id);
    if (!asset) {
      throw { error: { code: 'NOT_FOUND', message: `Asset ${input.asset_id} not found` } };
    }

    // Schedule conflict check if window provided: [starts_at, ends_at)
    if (input.starts_at && input.ends_at) {
      const s = new Date(input.starts_at).getTime();
      const e = new Date(input.ends_at).getTime();
      if (s >= e) {
        throw { error: { code: 'VALIDATION_ERROR', message: 'Window start time must precede end time' } };
      }
      this.checkWindowConflicts(input.asset_id, s, e);
    }

    const m: Maintenance = {
      id: `maint_${Date.now()}`,
      asset_id: input.asset_id,
      title: input.title,
      description: input.description,
      interval_days: input.interval_days || null,
      due_at: input.due_at,
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
      assignee: input.assignee,
      status: 'scheduled',
      completed_at: null,
    };
    this.state.maintenance.push(m);
    saveState(this.state);
    return m;
  }

  public completeMaintenance(id: string, completedAt?: string): CompleteMaintenanceResult {
    const m = this.state.maintenance.find((item) => item.id === id);
    if (!m) {
      throw { error: { code: 'NOT_FOUND', message: `Maintenance task ${id} not found` } };
    }
    if (m.status === 'completed') {
      throw { error: { code: 'ALREADY_COMPLETED', message: 'Task has already been completed; repeat completion is rejected.' } };
    }

    const cTime = completedAt || new Date().toISOString();
    m.status = 'completed';
    m.completed_at = cTime;

    let next: Maintenance | null = null;
    if (m.interval_days && m.interval_days > 0) {
      const cDate = new Date(cTime);
      cDate.setDate(cDate.getDate() + m.interval_days);
      next = {
        id: `maint_${Date.now()}_next`,
        asset_id: m.asset_id,
        title: m.title,
        description: m.description,
        interval_days: m.interval_days,
        due_at: cDate.toISOString(),
        starts_at: null,
        ends_at: null,
        assignee: m.assignee,
        status: 'scheduled',
        completed_at: null,
      };
      this.state.maintenance.push(next);
    }

    saveState(this.state);
    return { completed: m, next };
  }

  public getLessons(): Lesson[] {
    return this.state.lessons;
  }

  public createLesson(input: CreateLessonInput): Lesson {
    const s = new Date(input.starts_at).getTime();
    const e = new Date(input.ends_at).getTime();
    if (s >= e) {
      throw { error: { code: 'VALIDATION_ERROR', message: 'Lesson starts_at must be before ends_at' } };
    }
    if (input.blocks_asset) {
      if (!input.asset_id) {
        throw { error: { code: 'VALIDATION_ERROR', message: 'A blocking lesson requires an assigned asset_id' } };
      }
      this.checkWindowConflicts(input.asset_id, s, e);
    }

    const l: Lesson = {
      id: `lesson_${Date.now()}`,
      asset_id: input.asset_id || null,
      title: input.title,
      instructions: input.instructions,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      assignee: input.assignee,
      blocks_asset: !!input.blocks_asset,
      status: 'scheduled',
    };
    this.state.lessons.push(l);
    saveState(this.state);
    return l;
  }

  public completeLesson(id: string): Lesson {
    const l = this.state.lessons.find((item) => item.id === id);
    if (!l) {
      throw { error: { code: 'NOT_FOUND', message: `Lesson ${id} not found` } };
    }
    if (l.status === 'completed') {
      throw { error: { code: 'ALREADY_COMPLETED', message: 'Lesson is already completed' } };
    }
    l.status = 'completed';
    saveState(this.state);
    return l;
  }

  public getProduction(): Production[] {
    return this.state.production;
  }

  public createProduction(input: CreateProductionInput): Production {
    const asset = this.state.assets.find((a) => a.id === input.asset_id);
    if (!asset) {
      throw { error: { code: 'NOT_FOUND', message: `Asset ${input.asset_id} not found` } };
    }
    if (asset.status !== 'operational') {
      throw {
        error: {
          code: 'ASSET_UNAVAILABLE',
          message: `Asset "${asset.name}" is currently ${asset.status}; only operational assets may be scheduled for production.`,
        },
      };
    }
    const s = new Date(input.starts_at).getTime();
    const e = new Date(input.ends_at).getTime();
    if (s >= e) {
      throw { error: { code: 'VALIDATION_ERROR', message: 'Production starts_at must be before ends_at' } };
    }
    if (input.quantity <= 0) {
      throw { error: { code: 'VALIDATION_ERROR', message: 'Quantity must be a positive integer' } };
    }

    // Check conflicts with production, maintenance, and blocking lessons
    this.checkWindowConflicts(input.asset_id, s, e);

    const p: Production = {
      id: `prod_${Date.now()}`,
      asset_id: input.asset_id,
      title: input.title,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      quantity: input.quantity,
      status: 'scheduled',
    };
    this.state.production.push(p);
    saveState(this.state);
    return p;
  }

  public completeProduction(id: string): Production {
    const p = this.state.production.find((item) => item.id === id);
    if (!p) {
      throw { error: { code: 'NOT_FOUND', message: `Production ${id} not found` } };
    }
    p.status = 'completed';
    saveState(this.state);
    return p;
  }

  public getAlerts(unacknowledged?: boolean): Alert[] {
    // Also evaluate any due/overdue items based on time
    this.evaluateAlerts();
    if (unacknowledged) {
      return this.state.alerts.filter((a) => !a.acknowledged_at);
    }
    return this.state.alerts;
  }

  public acknowledgeAlert(id: string): Alert {
    const a = this.state.alerts.find((item) => item.id === id);
    if (!a) {
      throw { error: { code: 'NOT_FOUND', message: `Alert ${id} not found` } };
    }
    a.acknowledged_at = new Date().toISOString();
    saveState(this.state);
    return a;
  }

  public getImpact(): ImpactSummary {
    // confirmed_repairs: unique assets with recorded repaired outcome, excluding subsequently retired/replaced
    const repairedAssetIds = new Set<string>();
    for (const c of this.state.cases) {
      if (c.outcome === 'repaired') {
        const asset = this.state.assets.find((a) => a.id === c.asset_id);
        if (asset && asset.status !== 'retired') {
          repairedAssetIds.add(asset.id);
        }
      }
    }

    let retainedMassKg = 0;
    let missingMassCount = 0;

    for (const id of repairedAssetIds) {
      const asset = this.state.assets.find((a) => a.id === id);
      if (asset?.mass_kg !== null && asset?.mass_kg !== undefined) {
        retainedMassKg += asset.mass_kg;
      } else {
        missingMassCount += 1;
      }
    }

    return {
      confirmed_repairs: repairedAssetIds.size,
      estimated_retained_mass_kg: Math.round(retainedMassKg * 100) / 100,
      assets_missing_mass: missingMassCount,
      methodology:
        'Calculated strictly as sum of known mass for unique assets with confirmed repaired outcome (excluding retired units). Missing mass assets contribute zero rather than invented figures.',
    };
  }

  private checkWindowConflicts(assetId: string, s: number, e: number) {
    // Half open window [s, e) vs [itemS, itemE)
    // Check scheduled maintenance
    for (const m of this.state.maintenance) {
      if (m.asset_id === assetId && m.status === 'scheduled' && m.starts_at && m.ends_at) {
        const ms = new Date(m.starts_at).getTime();
        const me = new Date(m.ends_at).getTime();
        if (Math.max(s, ms) < Math.min(e, me)) {
          throw {
            error: {
              code: 'SCHEDULE_CONFLICT',
              message: `Asset is reserved for maintenance "${m.title}" during this window.`,
              details: { conflicting_entity_id: m.id },
            },
          };
        }
      }
    }

    // Check scheduled production
    for (const p of this.state.production) {
      if (p.asset_id === assetId && p.status === 'scheduled') {
        const ps = new Date(p.starts_at).getTime();
        const pe = new Date(p.ends_at).getTime();
        if (Math.max(s, ps) < Math.min(e, pe)) {
          throw {
            error: {
              code: 'SCHEDULE_CONFLICT',
              message: `Asset has overlapping production run "${p.title}" scheduled during this window.`,
              details: { conflicting_entity_id: p.id },
            },
          };
        }
      }
    }

    // Check blocking lessons
    for (const l of this.state.lessons) {
      if (l.asset_id === assetId && l.status === 'scheduled' && l.blocks_asset) {
        const ls = new Date(l.starts_at).getTime();
        const le = new Date(l.ends_at).getTime();
        if (Math.max(s, ls) < Math.min(e, le)) {
          throw {
            error: {
              code: 'SCHEDULE_CONFLICT',
              message: `Asset is blocked by training lesson "${l.title}" during this window.`,
              details: { conflicting_entity_id: l.id },
            },
          };
        }
      }
    }
  }

  private evaluateAlerts() {
    const now = Date.now();
    // Evaluate maintenance alerts: due_soon (due_at - 24h to due_at), due (first 15m), overdue (after due_at + 15m)
    for (const m of this.state.maintenance) {
      if (m.status !== 'scheduled') continue;
      const dueTime = new Date(m.due_at).getTime();
      const diffMinutes = (dueTime - now) / (1000 * 60);

      let kind: Alert['kind'] | null = null;
      let severity: Alert['severity'] = 'info';

      if (diffMinutes < -15) {
        kind = 'overdue';
        severity = 'critical';
      } else if (diffMinutes <= 0 && diffMinutes >= -15) {
        kind = 'due';
        severity = 'warning';
      } else if (diffMinutes > 0 && diffMinutes <= 1440) {
        kind = 'due_soon';
        severity = 'info';
      }

      if (kind) {
        const exists = this.state.alerts.some(
          (al) => al.entity_type === 'maintenance' && al.entity_id === m.id && al.kind === kind
        );
        if (!exists) {
          const asset = this.state.assets.find((a) => a.id === m.asset_id);
          this.state.alerts.unshift({
            id: `alert_maint_${m.id}_${kind}`,
            entity_type: 'maintenance',
            entity_id: m.id,
            kind,
            severity,
            message: `Maintenance "${m.title}" for ${asset?.name || 'machine'} is ${kind.replace('_', ' ')}.`,
            triggered_at: new Date().toISOString(),
            acknowledged_at: null,
          });
        }
      }
    }
  }
}

export const mockEngine = new MockEngine();
