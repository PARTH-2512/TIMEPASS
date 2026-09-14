import React, { useState, useEffect } from 'react';
import { DashboardSummary, Alert, Detection, Camera, PipelineStatus } from '../types';
import { api } from '../lib/api';
import {
  Camera as CameraIcon,
  Video,
  ShieldAlert,
  AlertTriangle,
  Activity,
  RefreshCw,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Eye,
  TrendingUp,
  Cpu,
  Sparkles,
  Zap,
} from 'lucide-react';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfidenceBadge } from '../components/ui/ConfidenceBadge';
import { NavPage } from '../components/layout/Sidebar';

interface DashboardProps {
  onNavigate: (page: NavPage) => void;
  onOpenCamera: (cameraId: string) => void;
  onOpenAlert: (alertId: string) => void;
  onOpenDetection: (detectionId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenCamera,
  onOpenAlert,
  onOpenDetection,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTriggeringLive, setIsTriggeringLive] = useState(false);
  const [lastTriggerResult, setLastTriggerResult] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [sumRes, alertsRes, detRes, camsRes, pipeRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getAlerts(),
        api.getRecentDetections(),
        api.getCameras(),
        api.getPipelineStatus().catch(() => null),
      ]);
      setSummary(sumRes);
      setAlerts(alertsRes);
      setDetections(detRes);
      setCameras(camsRes);
      if (pipeRes) setPipelineStatus(pipeRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Surveillance API service unavailable');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsub = api.subscribe(() => {
      api.getDashboardSummary().then(setSummary).catch(() => {});
      api.getAlerts().then(setAlerts).catch(() => {});
      api.getRecentDetections().then(setDetections).catch(() => {});
      api.getCameras().then(setCameras).catch(() => {});
      api.getPipelineStatus().then(setPipelineStatus).catch(() => {});
    });
    return unsub;
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleRunPipelineTest = async (isFumble: boolean) => {
    setIsTriggeringLive(true);
    setLastTriggerResult(null);
    try {
      const res = await api.runLivePipelineTest({
        isPossibleMatchFumble: isFumble,
        targetWatchlistPlate: 'DL3CAM1234',
        multiCameraSequence: true,
      });
      setLastTriggerResult(
        isFumble
          ? `Detected '${res.plateNumber}' with ${res.agreement} agreement &bull; Triggered "Possible Watchlist Match" for 'DL3CAM1234'`
          : `Detected '${res.plateNumber}' with ${res.agreement} agreement &bull; Triggered High-Priority Watchlist Alert across 3 cameras`
      );
      await fetchData();
    } catch (err: any) {
      setLastTriggerResult(`Error running pipeline: ${err.message}`);
    } finally {
      setIsTriggeringLive(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-72 bg-slate-200 dark:bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          title="Telemetry Feed Inaccessible"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  const activeAlertsList = alerts.filter((a) => a.status === 'new' || a.status === 'under_review');
  const possibleMatches = alerts.filter(
    (a) => a.matchType === 'possible' && (a.status === 'new' || a.status === 'under_review')
  );

  return (
    <div id="dashboard-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold">
              IVMAP CCTV Intelligence
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              YOLOv8 + OCR Pipeline Connected
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            System Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Last system telemetry update:{' '}
            <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">
              {summary?.lastUpdated}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-dashboard-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Cameras */}
        <div
          id="kpi-registered-cameras"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Registered Cameras
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-600 dark:text-sky-400">
              <CameraIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono mb-1">
            {summary?.totalCameras ?? cameras.length}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Across urban ring-roads & toll junctions
          </p>
        </div>

        {/* Online / Offline Cameras */}
        <div
          id="kpi-online-cameras"
          onClick={() => onNavigate('monitoring')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all shadow-sm group relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
              Online Feeds
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {summary?.onlineCameras ?? 6}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              / {summary?.offlineCameras ?? 1} offline
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Click to open Live Monitoring</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-emerald-500" />
          </p>
        </div>

        {/* Active Alerts */}
        <div
          id="kpi-active-alerts"
          onClick={() => onNavigate('alerts')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm group relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-colors">
              Active Alerts
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              {summary?.activeAlerts ?? activeAlertsList.length}
            </span>
            <span className="text-xs text-rose-600/80 dark:text-rose-300/80 font-mono font-medium">
              ({summary?.highPriorityAlerts ?? 2} High Priority)
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              {possibleMatches.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-[10px]">
                  {possibleMatches.length} Possible Match (OCR Fumble)
                </span>
              )}
            </span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-rose-500" />
          </div>
        </div>

        {/* Total ANPR Detections */}
        <div
          id="kpi-total-detections"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Detections
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono mb-1">
            {summary?.totalDetectionsToday.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            System uptime: {summary?.systemUptime || '99.85%'}
          </p>
        </div>
      </div>

      {/* AI Live Pipeline Active Control Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-500/5 via-indigo-500/5 to-purple-500/5 dark:from-sky-950/40 dark:via-slate-900 dark:to-purple-950/30 border border-sky-200 dark:border-sky-900/60 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  YOLOv8 + OCR Multi-Camera Live Pipeline
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  Online ({pipelineStatus?.fps || 28.5} FPS)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-mono">
                  Consensus Agreement: {pipelineStatus?.lastAgreement || '~13/16'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Active multi-camera vehicle tracking + plate detection + OCR consensus. Prevents missing watchlist hits when OCR fumbles a single digit.
              </p>
            </div>
          </div>

          {/* Quick Action Triggers for the AI pipeline */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              id="trigger-exact-hit-btn"
              disabled={isTriggeringLive}
              onClick={() => handleRunPipelineTest(false)}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Simulate CCTV loop sighting: DL3CAM1234 reaches 13/16 agreement -> Exact Watchlist Alert"
            >
              <Zap className="w-3.5 h-3.5" />
              {isTriggeringLive ? 'Processing...' : 'Simulate Exact: DL3CAM1234'}
            </button>

            <button
              id="trigger-fumble-hit-btn"
              disabled={isTriggeringLive}
              onClick={() => handleRunPipelineTest(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Simulate CCTV loop sighting: DL3CAM123A reaches 13/16 agreement -> Possible Watchlist Match"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isTriggeringLive ? 'Processing...' : 'Simulate OCR Fumble: DL3CAM123A'}
            </button>
          </div>
        </div>

        {lastTriggerResult && (
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: lastTriggerResult }} />
          </div>
        )}
      </div>

      {/* Camera Health Summary Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              summary?.cameraHealthSummary.status === 'optimal'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Camera Grid Health Summary</h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {summary?.cameraHealthSummary.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {summary?.cameraHealthSummary.activeFeeds} streams streaming at normal latency &bull; {summary?.cameraHealthSummary.failedPings} heartbeat ping dropped
            </p>
          </div>
        </div>

        {/* Camera Quick Row Buttons */}
        <div className="flex flex-wrap gap-2">
          {cameras.slice(0, 6).map((cam) => (
            <button
              key={cam.id}
              onClick={() => onOpenCamera(cam.id)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono transition-colors flex items-center gap-1.5 ${
                cam.status === 'online'
                  ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-sky-500 text-slate-700 dark:text-slate-300'
                  : cam.status === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  cam.status === 'online'
                    ? 'bg-emerald-500'
                    : cam.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              {cam.id}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts Column */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">Recent Security Alerts</h2>
            </div>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold inline-flex items-center gap-1"
            >
              View all ({alerts.length}) <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {activeAlertsList.length === 0 ? (
            <EmptyState
              icon="alert"
              title="No Active Alerts"
              description="The surveillance grid has not registered any unreviewed security violations or watchlist matches."
              className="flex-1"
            />
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-96">
              {activeAlertsList.slice(0, 5).map((alt, idx) => (
                <div
                  key={`${alt.id}-${idx}`}
                  id={`dashboard-alert-${alt.id}`}
                  onClick={() => onOpenAlert(alt.id)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-sky-500 dark:hover:border-slate-700 cursor-pointer transition-colors flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-xs">
                        {alt.plateNumber || 'TARGET'}
                      </span>
                      {alt.matchType === 'possible' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Possible Match ({alt.similarityScore}%)
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            alt.priority === 'high'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {alt.priority}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{alt.status.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-300 font-medium truncate">{alt.type}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {alt.cameraName} &bull; Consensus: {alt.aggregationAgreement || '13/16'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">{alt.timestamp}</span>
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold group-hover:translate-x-0.5 inline-block transition-transform mt-2">
                      Review &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Vehicle Detections Column */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">Recent Vehicle Detections</h2>
            </div>
            <button
              onClick={() => onNavigate('search')}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold inline-flex items-center gap-1"
            >
              Search Vehicles <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {detections.length === 0 ? (
            <EmptyState
              icon="sighting"
              title="No Detections Stream"
              description="No vehicle sightings have arrived from the camera nodes recently."
              className="flex-1"
            />
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-96">
              {detections.slice(0, 5).map((det, idx) => (
                <div
                  key={`${det.id}-${idx}`}
                  id={`dashboard-detection-${det.id}`}
                  onClick={() => onOpenDetection(det.id)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-sky-500 dark:hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Tiny thumbnail frame */}
                    <div className="w-12 h-8 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0">
                      <img src={det.evidenceUrl} alt="evidence" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{det.normalizedPlate}</span>
                        {det.matchType === 'possible' ? (
                          <span className="text-[10px] font-bold px-1.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            POSSIBLE MATCH
                          </span>
                        ) : det.isWatchlistMatch ? (
                          <span className="text-[10px] font-bold px-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            WATCHLIST
                          </span>
                        ) : null}
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {det.aggregationAgreement || '13/16'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {det.cameraName} &bull; {det.vehicleType}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block mb-1">{det.timestamp}</span>
                    <ConfidenceBadge score={det.detectionConfidence} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
