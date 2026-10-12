import {
  Asset,
  Case,
  Diagnostic,
  Maintenance,
  Lesson,
  Production,
  Alert,
  BrowserSource,
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
  ApiErrorResponse,
  PaginatedResponse,
  DesktopAppId,
  DesktopSession,
} from '../types';
import { mockEngine } from './mockEngine';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');

export type ApiConnectionMode = 'live' | 'mock';

class ApiClient {
  private mode: ApiConnectionMode = 'mock';
  private listeners: ((mode: ApiConnectionMode) => void)[] = [];
  private backendChecked = false;

  constructor() {
    this.checkBackendHealth();
  }

  public getMode(): ApiConnectionMode {
    return this.mode;
  }

  public setMode(mode: ApiConnectionMode) {
    this.mode = mode;
    this.notifyListeners();
  }

  public subscribeMode(cb: (mode: ApiConnectionMode) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb(this.mode));
  }

  public async checkBackendHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        this.mode = 'live';
        this.backendChecked = true;
        this.notifyListeners();
        return true;
      }
    } catch {
      // Backend not running
    }
    this.mode = 'mock';
    this.backendChecked = true;
    this.notifyListeners();
    return false;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (this.mode === 'live') {
      try {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers: Record<string, string> = {
          Accept: 'application/json',
          ...(options.headers as Record<string, string>),
        };
        if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.body) {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 204) {
          return {} as T;
        }

        const data = await response.json();
        if (!response.ok) {
          const errData: ApiErrorResponse = data.error
            ? data
            : { error: { code: data.code || 'HTTP_ERROR', message: data.message || data.detail || `Request failed with status ${response.status}`, details: data.details || null } };
          throw errData;
        }

        return data as T;
      } catch (err: any) {
        if (err?.error?.code) {
          throw err;
        }
        // Requirement: Do NOT automatically replay failed live requests against mock data!
        throw {
          error: {
            code: 'NETWORK_ERROR',
            message: `Live backend request to ${endpoint} failed. FastAPI server may be disconnected or unreachable at ${API_BASE_URL}.`,
            details: { endpoint, error: String(err) },
          },
        };
      }
    }

    // In mock mode: handle request using mockEngine
    return this.handleMock<T>(endpoint, options);
  }

  private handleMock<T>(endpoint: string, options: RequestInit): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();

    // /assets
    if (endpoint === '/assets' && method === 'GET') {
      const assets = mockEngine.getAssets();
      return Promise.resolve({ items: assets, total: assets.length } as any);
    }
    if (endpoint === '/assets' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.createAsset(body) as any);
    }
    if (endpoint.startsWith('/assets/') && method === 'PATCH') {
      const id = endpoint.replace('/assets/', '');
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.updateAsset(id, body) as any);
    }

    // /uploads/screenshots
    if (endpoint === '/uploads/screenshots' && method === 'POST') {
      const formData = options.body as FormData;
      const file = formData.get('file') as File;
      return mockEngine.uploadScreenshot(file) as any;
    }

    // /diagnostics
    if (endpoint === '/diagnostics' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.createDiagnostic(body) as any);
    }

    // /cases
    if (endpoint.startsWith('/cases') && method === 'GET') {
      if (endpoint === '/cases' || endpoint.startsWith('/cases?')) {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const assetId = urlParams.get('asset_id') || undefined;
        const cases = mockEngine.getCases(assetId);
        return Promise.resolve({ items: cases, total: cases.length } as any);
      }
      const id = endpoint.replace('/cases/', '');
      return Promise.resolve(mockEngine.getCase(id) as any);
    }
    if (endpoint === '/cases' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.createCase(body) as any);
    }
    if (endpoint.match(/^\/cases\/[^/]+\/analyse$/) && method === 'POST') {
      const match = endpoint.match(/^\/cases\/([^/]+)\/analyse$/)!;
      return Promise.resolve(mockEngine.analyseCase(match[1]) as any);
    }
    if (endpoint.match(/^\/cases\/[^/]+\/steps\/[^/]+$/) && method === 'PATCH') {
      const match = endpoint.match(/^\/cases\/([^/]+)\/steps\/([^/]+)$/)!;
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.updateStepStatus(match[1], match[2], body.status) as any);
    }
    if (endpoint.match(/^\/cases\/[^/]+\/outcome$/) && method === 'POST') {
      const match = endpoint.match(/^\/cases\/([^/]+)\/outcome$/)!;
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.recordOutcome(match[1], body.outcome, body.note) as any);
    }
    if (endpoint.startsWith('/cases/') && method === 'DELETE') {
      const id = endpoint.replace('/cases/', '');
      mockEngine.deleteCase(id);
      return Promise.resolve({} as any);
    }

    // /screenshot-advice
    if (endpoint === '/screenshot-advice' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.requestScreenshotAdvice(body.screenshot_id, body.question) as any);
    }

    // /browser-sources
    if (endpoint === '/browser-sources' && method === 'GET') {
      const items = mockEngine.getBrowserSources();
      return Promise.resolve({ items, total: items.length } as any);
    }

    // /browser-runs
    if (endpoint === '/browser-runs' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.startBrowserRun(body.asset_id, body.source_id, body.question) as any);
    }

    // /jobs/:id
    if (endpoint.startsWith('/jobs/') && method === 'GET') {
      const id = endpoint.replace('/jobs/', '');
      return Promise.resolve(mockEngine.getJob(id) as any);
    }

    // /maintenance
    if (endpoint === '/maintenance' && method === 'GET') {
      const items = mockEngine.getMaintenance();
      return Promise.resolve({ items, total: items.length } as any);
    }
    if (endpoint === '/maintenance' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.createMaintenance(body) as any);
    }
    if (endpoint.match(/^\/maintenance\/[^/]+\/complete$/) && method === 'POST') {
      const match = endpoint.match(/^\/maintenance\/([^/]+)\/complete$/)!;
      const body = options.body ? JSON.parse(options.body as string) : {};
      return Promise.resolve(mockEngine.completeMaintenance(match[1], body.completed_at) as any);
    }

    // /lessons
    if (endpoint === '/lessons' && method === 'GET') {
      const items = mockEngine.getLessons();
      return Promise.resolve({ items, total: items.length } as any);
    }
    if (endpoint === '/lessons' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.createLesson(body) as any);
    }
    if (endpoint.match(/^\/lessons\/[^/]+\/complete$/) && method === 'POST') {
      const match = endpoint.match(/^\/lessons\/([^/]+)\/complete$/)!;
      return Promise.resolve(mockEngine.completeLesson(match[1]) as any);
    }

    // /production
    if (endpoint === '/production' && method === 'GET') {
      const items = mockEngine.getProduction();
      return Promise.resolve({ items, total: items.length } as any);
    }
    if (endpoint === '/production' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.createProduction(body) as any);
    }
    if (endpoint.match(/^\/production\/[^/]+\/complete$/) && method === 'POST') {
      const match = endpoint.match(/^\/production\/([^/]+)\/complete$/)!;
      return Promise.resolve(mockEngine.completeProduction(match[1]) as any);
    }

    // /alerts
    if (endpoint.startsWith('/alerts') && method === 'GET') {
      const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
      const unack = urlParams.get('unacknowledged') === 'true';
      const items = mockEngine.getAlerts(unack);
      return Promise.resolve({ items, total: items.length } as any);
    }
    if (endpoint.match(/^\/alerts\/[^/]+\/acknowledge$/) && method === 'POST') {
      const match = endpoint.match(/^\/alerts\/([^/]+)\/acknowledge$/)!;
      return Promise.resolve(mockEngine.acknowledgeAlert(match[1]) as any);
    }

    // /impact
    if (endpoint === '/impact' && method === 'GET') {
      return Promise.resolve(mockEngine.getImpact() as any);
    }

    // /desktop-sessions
    if (endpoint === '/desktop-sessions' && method === 'POST') {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(mockEngine.startDesktopSession(body.app_id, body.goal) as any);
    }
    if (endpoint.match(/^\/desktop-sessions\/[^/]+\/stop$/) && method === 'POST') {
      const match = endpoint.match(/^\/desktop-sessions\/([^/]+)\/stop$/)!;
      return Promise.resolve(mockEngine.stopDesktopSession(match[1]) as any);
    }
    if (endpoint.startsWith('/desktop-sessions/') && method === 'GET') {
      const id = endpoint.replace('/desktop-sessions/', '');
      return Promise.resolve(mockEngine.getDesktopSession(id) as any);
    }

    return Promise.reject({ error: { code: 'NOT_FOUND', message: `Endpoint ${endpoint} not handled` } });
  }

  // --- Strongly typed public API methods ---

  public async getAssets(): Promise<Asset[]> {
    const res = await this.request<PaginatedResponse<Asset> | Asset[]>('/assets');
    return Array.isArray(res) ? res : res.items;
  }

  public async createAsset(input: CreateAssetInput): Promise<Asset> {
    return this.request<Asset>('/assets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async updateAsset(id: string, input: UpdateAssetInput): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  public async uploadScreenshot(file: File): Promise<UploadScreenshotResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<UploadScreenshotResponse>('/uploads/screenshots', {
      method: 'POST',
      body: formData,
    });
  }

  public async createDiagnostic(input: CreateDiagnosticInput): Promise<Diagnostic> {
    return this.request<Diagnostic>('/diagnostics', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async getCases(assetId?: string): Promise<Case[]> {
    const query = assetId ? `?asset_id=${encodeURIComponent(assetId)}` : '';
    const res = await this.request<PaginatedResponse<Case> | Case[]>(`/cases${query}`);
    return Array.isArray(res) ? res : res.items;
  }

  public async getCase(id: string): Promise<Case> {
    return this.request<Case>(`/cases/${id}`);
  }

  public async createCase(input: CreateCaseInput): Promise<Case> {
    return this.request<Case>('/cases', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async analyseCase(caseId: string): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>(`/cases/${caseId}/analyse`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async updateStepStatus(caseId: string, stepId: string, status: StepStatus): Promise<Case> {
    return this.request<Case>(`/cases/${caseId}/steps/${stepId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  public async recordOutcome(caseId: string, outcome: CaseOutcome, note: string): Promise<Case> {
    return this.request<Case>(`/cases/${caseId}/outcome`, {
      method: 'POST',
      body: JSON.stringify({ outcome, note }),
    });
  }

  public async deleteCase(caseId: string): Promise<void> {
    await this.request<void>(`/cases/${caseId}`, {
      method: 'DELETE',
    });
  }

  public async requestScreenshotAdvice(screenshotId: string, question: string): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>('/screenshot-advice', {
      method: 'POST',
      body: JSON.stringify({ screenshot_id: screenshotId, question }),
    });
  }

  public async getBrowserSources(): Promise<BrowserSource[]> {
    const res = await this.request<PaginatedResponse<BrowserSource> | BrowserSource[]>('/browser-sources');
    return Array.isArray(res) ? res : res.items;
  }

  public async startBrowserRun(assetId: string, sourceId: string, question: string): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>('/browser-runs', {
      method: 'POST',
      body: JSON.stringify({ asset_id: assetId, source_id: sourceId, question }),
    });
  }

  public async getJob<T = any>(jobId: string): Promise<Job<T>> {
    return this.request<Job<T>>(`/jobs/${jobId}`);
  }

  public async getMaintenance(): Promise<Maintenance[]> {
    const res = await this.request<PaginatedResponse<Maintenance> | Maintenance[]>('/maintenance');
    return Array.isArray(res) ? res : res.items;
  }

  public async createMaintenance(input: CreateMaintenanceInput): Promise<Maintenance> {
    return this.request<Maintenance>('/maintenance', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async completeMaintenance(id: string, completedAt?: string): Promise<CompleteMaintenanceResult> {
    const timestamp = completedAt || new Date().toISOString();
    return this.request<CompleteMaintenanceResult>(`/maintenance/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ completed_at: timestamp }),
    });
  }

  public async getLessons(): Promise<Lesson[]> {
    const res = await this.request<PaginatedResponse<Lesson> | Lesson[]>('/lessons');
    return Array.isArray(res) ? res : res.items;
  }

  public async createLesson(input: CreateLessonInput): Promise<Lesson> {
    return this.request<Lesson>('/lessons', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async completeLesson(id: string): Promise<Lesson> {
    return this.request<Lesson>(`/lessons/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async getProduction(): Promise<Production[]> {
    const res = await this.request<PaginatedResponse<Production> | Production[]>('/production');
    return Array.isArray(res) ? res : res.items;
  }

  public async createProduction(input: CreateProductionInput): Promise<Production> {
    return this.request<Production>('/production', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async completeProduction(id: string): Promise<Production> {
    return this.request<Production>(`/production/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async getAlerts(unacknowledged?: boolean): Promise<Alert[]> {
    const query = unacknowledged ? '?unacknowledged=true' : '';
    const res = await this.request<PaginatedResponse<Alert> | Alert[]>(`/alerts${query}`);
    return Array.isArray(res) ? res : res.items;
  }

  public async acknowledgeAlert(id: string): Promise<Alert> {
    return this.request<Alert>(`/alerts/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async getImpact(): Promise<ImpactSummary> {
    return this.request<ImpactSummary>('/impact');
  }

  public async startDesktopSession(appId: DesktopAppId, goal: string): Promise<DesktopSession> {
    return this.request<DesktopSession>('/desktop-sessions', {
      method: 'POST',
      body: JSON.stringify({ app_id: appId, goal }),
    });
  }

  public async stopDesktopSession(sessionId: string): Promise<DesktopSession> {
    return this.request<DesktopSession>(`/desktop-sessions/${sessionId}/stop`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async getDesktopSession(sessionId: string): Promise<DesktopSession> {
    return this.request<DesktopSession>(`/desktop-sessions/${sessionId}`);
  }

  public resetDemoData() {
    mockEngine.reset();
  }
}

export const apiClient = new ApiClient();
