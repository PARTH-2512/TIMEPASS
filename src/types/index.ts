export type CameraStatus = 'online' | 'offline' | 'warning';

export type Camera = {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: CameraStatus;
  vendor?: string;
  lastHeartbeat?: string;
  streamUrl?: string;
  uptime?: string;
  fps?: number;
  resolution?: string;
  totalDetections?: number;
  activeAlertsCount?: number;
};

export type VehicleSighting = {
  id: string;
  plateNumber: string;
  cameraId: string;
  cameraName: string;
  location: string;
  timestamp: string;
  detectionConfidence: number;
  ocrConfidence: number;
  trackingConfidence?: number;
  trackingId?: string;
  aggregationAgreement?: string; // e.g. "13/16 (81.2%)"
  matchType?: 'exact' | 'possible' | 'none';
  matchedWatchlistPlate?: string;
  evidenceUrl?: string;
  vehicleType?: string;
  vehicleColor?: string;
  speedKmh?: number;
  lane?: number;
  heading?: string;
};

export type AlertPriority = 'high' | 'medium' | 'low';

export type AlertStatus = 'new' | 'under_review' | 'confirmed' | 'false_positive' | 'resolved';

export type Alert = {
  id: string;
  type: string; // e.g. "Watchlist Alert" | "Possible Watchlist Match"
  priority: AlertPriority;
  plateNumber?: string;
  matchedWatchlistPlate?: string;
  matchType?: 'exact' | 'possible';
  similarityScore?: number; // e.g. 90%
  editDistance?: number; // e.g. 1
  aggregationAgreement?: string; // e.g. "13/16 (81.2%)"
  cameraId?: string;
  cameraName?: string;
  location?: string;
  timestamp: string;
  reason: string;
  status: AlertStatus;
  evidenceUrl?: string;
  confidence?: number;
  ocrConfidence?: number;
  detectionConfidence?: number;
  caseId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
};

export type WatchlistEntry = {
  id: string;
  plateNumber: string;
  category: 'Stolen Vehicle' | 'Wanted Suspect' | 'Traffic Violation' | 'Unregistered' | 'High Risk' | 'Surveillance';
  priority: AlertPriority;
  reason: string;
  caseId: string;
  dateAdded: string;
  status: 'active' | 'disabled';
  lastSighting?: {
    timestamp: string;
    cameraName: string;
    location: string;
  };
  ownerNotes?: string;
};

export type Detection = {
  id: string;
  plateNumber: string;
  normalizedPlate: string;
  rawOcrText: string;
  cameraId: string;
  cameraName: string;
  location: string;
  timestamp: string;
  detectionConfidence: number;
  ocrConfidence: number;
  trackingConfidence: number;
  trackingId: string;
  aggregationAgreement?: string; // e.g. "13/16 (81.2%)"
  vehicleType: string;
  vehicleColor: string;
  isWatchlistMatch: boolean;
  matchType?: 'exact' | 'possible' | 'none';
  matchedWatchlistPlate?: string;
  similarityScore?: number;
  watchlistReason?: string;
  evidenceUrl: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type DashboardSummary = {
  totalCameras: number;
  onlineCameras: number;
  offlineCameras: number;
  warningCameras: number;
  activeAlerts: number;
  highPriorityAlerts: number;
  possibleMatchesCount: number;
  watchlistCount: number;
  totalDetectionsToday: number;
  systemUptime: string;
  lastUpdated: string;
  cameraHealthSummary: {
    status: 'optimal' | 'degraded' | 'critical';
    uptimePercent: number;
    activeFeeds: number;
    failedPings: number;
  };
};

export type VehicleRoutePoint = {
  order: number;
  cameraId: string;
  cameraName: string;
  location: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  plateConfidence: number;
  ocrConfidence: number;
  speedKmh?: number;
  aggregationAgreement?: string;
};

export type ConfidenceThresholds = {
  high: number; // default 85
  medium: number; // default 60
};

export type PipelineStatus = {
  isRunning: boolean;
  activeCameras: number;
  fps: number;
  lastDetectedPlate?: string;
  lastAgreement?: string;
  totalProcessedFrames: number;
  watchlistHitsToday: number;
  possibleMatchesToday: number;
};
