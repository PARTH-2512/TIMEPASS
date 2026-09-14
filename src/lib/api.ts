import {
  Camera,
  Alert,
  VehicleSighting,
  WatchlistEntry,
  Detection,
  DashboardSummary,
  VehicleRoutePoint,
  ConfidenceThresholds,
  PipelineStatus,
} from '../types';

class ApiClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<() => void> = new Set();
  private alertListeners: Set<(alert: Alert) => void> = new Set();
  private simulateOffline: boolean = false;
  private thresholds: ConfidenceThresholds = { high: 85, medium: 60 };

  constructor() {
    if (typeof window !== 'undefined') {
      const savedThresholds = localStorage.getItem('anpr_confidence_thresholds');
      if (savedThresholds) {
        try {
          this.thresholds = JSON.parse(savedThresholds);
        } catch {
          // ignore
        }
      }
      this.initEventSource();
    }
  }

  private initEventSource() {
    if (typeof window === 'undefined' || !window.EventSource) return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/live/events');

      this.eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'alert:created' && data.payload) {
            this.alertListeners.forEach((fn) => fn(data.payload as Alert));
          }
          // Notify general listeners on any state change
          this.notify();
        } catch {
          // heartbeat or non-json message
        }
      };

      this.eventSource.onerror = () => {
        // Will auto-reconnect
      };
    } catch (err) {
      console.warn('Could not initialize SSE connection:', err);
    }
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public subscribeAlerts(fn: (alert: Alert) => void) {
    this.alertListeners.add(fn);
    return () => this.alertListeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public setOfflineSimulation(offline: boolean) {
    this.simulateOffline = offline;
    this.notify();
  }

  public isOfflineSimulation(): boolean {
    return this.simulateOffline;
  }

  public getThresholds(): ConfidenceThresholds {
    return this.thresholds;
  }

  public setThresholds(t: ConfidenceThresholds) {
    this.thresholds = t;
    if (typeof window !== 'undefined') {
      localStorage.setItem('anpr_confidence_thresholds', JSON.stringify(t));
    }
    this.notify();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (this.simulateOffline) {
      throw new Error('503 Service Unavailable: Backend surveillance node is offline.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errMsg = `Request to ${endpoint} failed (${res.status})`;
      try {
        const errorData = await res.json();
        if (errorData?.error) errMsg = errorData.error;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    return res.json();
  }

  // Dashboard summary
  public async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/api/dashboard/summary');
  }

  // Cameras
  public async getCameras(): Promise<Camera[]> {
    return this.request<Camera[]>('/api/cameras');
  }

  public async getCamera(id: string): Promise<Camera | null> {
    try {
      return await this.request<Camera>(`/api/cameras/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  }

  public async createCamera(cameraData: Partial<Camera>): Promise<Camera> {
    const res = await this.request<Camera>('/api/cameras', {
      method: 'POST',
      body: JSON.stringify(cameraData),
    });
    this.notify();
    return res;
  }

  public async updateCamera(id: string, updates: Partial<Camera>): Promise<Camera> {
    const res = await this.request<Camera>(`/api/cameras/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    this.notify();
    return res;
  }

  public async deleteCamera(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/cameras/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    this.notify();
    return res.success;
  }

  // Alerts
  public async getAlerts(filters?: { status?: string; priority?: string; matchType?: string }): Promise<Alert[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.priority && filters.priority !== 'all') params.set('priority', filters.priority);
    if (filters?.matchType && filters.matchType !== 'all') params.set('matchType', filters.matchType);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Alert[]>(`/api/alerts${query}`);
  }

  public async getAlert(id: string): Promise<Alert | null> {
    try {
      return await this.request<Alert>(`/api/alerts/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  }

  public async updateAlertStatus(id: string, status: Alert['status'], notes?: string): Promise<Alert> {
    const res = await this.request<Alert>(`/api/alerts/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes, reviewedBy: 'Duty Officer' }),
    });
    this.notify();
    return res;
  }

  public async resolveAlert(id: string, notes: string): Promise<Alert> {
    return this.updateAlertStatus(id, 'resolved', notes);
  }

  // Watchlist
  public async getWatchlist(): Promise<WatchlistEntry[]> {
    return this.request<WatchlistEntry[]>('/api/watchlist');
  }

  public async addWatchlistEntry(entry: Partial<WatchlistEntry>): Promise<WatchlistEntry> {
    const res = await this.request<WatchlistEntry>('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
    this.notify();
    return res;
  }

  public async updateWatchlistEntry(id: string, updates: Partial<WatchlistEntry>): Promise<WatchlistEntry> {
    const res = await this.request<WatchlistEntry>(`/api/watchlist/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    this.notify();
    return res;
  }

  public async deleteWatchlistEntry(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/watchlist/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    this.notify();
    return res.success;
  }

  // Detections & Sightings
  public async getDetections(limit = 100): Promise<Detection[]> {
    const sightings = await this.request<VehicleSighting[]>(`/api/sightings?limit=${limit}`);
    // Map sightings to Detection structure expected by components
    return sightings.map((s) => ({
      id: s.id,
      plateNumber: s.plateNumber,
      normalizedPlate: s.plateNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase(),
      rawOcrText: s.plateNumber,
      cameraId: s.cameraId,
      cameraName: s.cameraName,
      location: s.location,
      timestamp: s.timestamp,
      detectionConfidence: s.detectionConfidence,
      ocrConfidence: s.ocrConfidence,
      trackingConfidence: s.trackingConfidence ?? 95.0,
      trackingId: s.trackingId || 'TRK-400',
      aggregationAgreement: s.aggregationAgreement || '13/16 (81.2%)',
      vehicleType: s.vehicleType || 'Sedan',
      vehicleColor: s.vehicleColor || 'Dark Metallic',
      isWatchlistMatch: s.matchType === 'exact' || s.matchType === 'possible',
      matchType: s.matchType || 'none',
      matchedWatchlistPlate: s.matchedWatchlistPlate,
      watchlistReason:
        s.matchType === 'possible'
          ? `Possible Match with ${s.matchedWatchlistPlate}`
          : s.matchType === 'exact'
          ? 'Exact Watchlist Match'
          : undefined,
      evidenceUrl:
        s.evidenceUrl ||
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
    }));
  }

  public async getDetection(id: string): Promise<Detection | null> {
    try {
      return await this.request<Detection>(`/api/detections/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  }

  public async getSighting(id: string): Promise<VehicleSighting | null> {
    try {
      return await this.request<VehicleSighting>(`/api/sightings/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  }

  public async searchVehicles(filters: {
    plateNumber?: string;
    cameraId?: string;
    vehicleType?: string;
    minConfidence?: number;
    matchType?: string;
  }): Promise<VehicleSighting[]> {
    const params = new URLSearchParams();
    if (filters.plateNumber) params.set('query', filters.plateNumber);
    if (filters.cameraId) params.set('cameraId', filters.cameraId);
    if (filters.vehicleType) params.set('vehicleType', filters.vehicleType);
    if (filters.minConfidence !== undefined) params.set('minConfidence', String(filters.minConfidence));
    if (filters.matchType) params.set('matchType', filters.matchType);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<VehicleSighting[]>(`/api/sightings${query}`);
  }

  // Vehicle Multi-Camera Route
  public async getVehicleRoute(plateNumber: string): Promise<VehicleRoutePoint[]> {
    return this.request<VehicleRoutePoint[]>(`/api/routes/${encodeURIComponent(plateNumber)}`);
  }

  // GIS Map helpers
  public async getGisCameras(): Promise<Camera[]> {
    return this.getCameras();
  }

  public async getGisAlerts(): Promise<Alert[]> {
    return this.getAlerts({ status: 'new' });
  }

  // AI Pipeline Controls & Status
  public async getPipelineStatus(): Promise<PipelineStatus> {
    return this.request<PipelineStatus>('/api/pipeline/status');
  }

  public async runLivePipelineTest(options?: {
    plateNumber?: string;
    targetWatchlistPlate?: string;
    isPossibleMatchFumble?: boolean;
    multiCameraSequence?: boolean;
  }): Promise<{
    success: boolean;
    plateNumber: string;
    agreement: string;
    sightings: VehicleSighting[];
    alerts: Alert[];
  }> {
    const res = await this.request<{
      success: boolean;
      plateNumber: string;
      agreement: string;
      sightings: VehicleSighting[];
      alerts: Alert[];
    }>('/api/pipeline/run-live-test', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    this.notify();
    return res;
  }

  // Compatibility helpers for existing frontend views
  public async getRecentDetections(limit = 50): Promise<Detection[]> {
    return this.getDetections(limit);
  }

  public async getVehicleSightings(plateNumber: string): Promise<VehicleSighting[]> {
    return this.searchVehicles({ plateNumber });
  }

  public async patchAlert(id: string, updates: Partial<Alert>): Promise<Alert> {
    return this.updateAlertStatus(id, updates.status || 'under_review', updates.notes);
  }

  public async addCamera(cameraData: Partial<Camera>): Promise<Camera> {
    return this.createCamera(cameraData);
  }

  public async getWatchlistMatchForPlate(plateNumber: string): Promise<WatchlistEntry | null> {
    const res = await this.getWatchlistFuzzyMatchForPlate(plateNumber);
    return res ? res.entry : null;
  }

  public async getWatchlistFuzzyMatchForPlate(plateNumber: string): Promise<{
    entry: WatchlistEntry;
    matchType: 'exact' | 'possible';
    editDistance: number;
    similarityScore: number;
  } | null> {
    const list = await this.getWatchlist();
    const clean = plateNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (!clean) return null;

    // Check exact first
    const exact = list.find(
      (w) => w.plateNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase() === clean && w.status === 'active'
    );
    if (exact) {
      return { entry: exact, matchType: 'exact', editDistance: 0, similarityScore: 100 };
    }

    // Levenshtein helper
    const calcDistance = (a: string, b: string): number => {
      const dp: number[][] = Array(a.length + 1)
        .fill(null)
        .map(() => Array(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) dp[i][0] = i;
      for (let j = 0; j <= b.length; j++) dp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
      }
      return dp[a.length][b.length];
    };

    // Check fuzzy match within 1 edit distance (OCR fumble tolerance)
    for (const item of list.filter((w) => w.status === 'active')) {
      const target = item.plateNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const dist = calcDistance(clean, target);
      if (dist <= 1) {
        const maxLen = Math.max(clean.length, target.length);
        const score = Math.round(((maxLen - dist) / maxLen) * 100);
        return {
          entry: item,
          matchType: 'possible',
          editDistance: dist,
          similarityScore: score,
        };
      }
    }

    return null;
  }

  public async simulateIncomingAlert(customPlate?: string): Promise<{
    success: boolean;
    plateNumber: string;
    agreement: string;
    sightings: VehicleSighting[];
    alerts: Alert[];
  }> {
    return this.runLivePipelineTest({
      plateNumber: customPlate || 'DL3CAM1234',
      targetWatchlistPlate: 'DL3CAM1234',
      multiCameraSequence: true,
    });
  }
}

export const api = new ApiClient();
