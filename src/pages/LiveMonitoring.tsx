import React, { useState, useEffect } from 'react';
import { Camera, Detection } from '../types';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import {
  Video,
  Search,
  Eye,
  Radio,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  Zap,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Camera as CameraIcon,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { LiveVideoPlayer } from '../components/video/LiveVideoPlayer';
import { LiveStreamGuideModal } from '../components/modals/LiveStreamGuideModal';

interface LiveMonitoringProps {
  onOpenCamera: (cameraId: string) => void;
  onOpenDetection: (detectionId: string) => void;
}

export const LiveMonitoring: React.FC<LiveMonitoringProps> = ({
  onOpenCamera,
  onOpenDetection,
}) => {
  const { addToast } = useToast();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'warning' | 'offline'>('all');
  const [fullscreenCamId, setFullscreenCamId] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [webcamCamId, setWebcamCamId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [cams, dets] = await Promise.all([api.getCameras(), api.getRecentDetections()]);
      setCameras(cams);
      setDetections(dets);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = api.subscribe(() => loadData());
    return unsub;
  }, []);

  // Listen for Escape key to exit fullscreen camera zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenCamId) {
        setFullscreenCamId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenCamId]);

  const handleTriggerPipeline = async (fumble: boolean) => {
    setIsTriggering(true);
    try {
      const res = await api.runLivePipelineTest({
        isPossibleMatchFumble: fumble,
        targetWatchlistPlate: 'DL3CAM1234',
        multiCameraSequence: true,
      });
      addToast({
        type: fumble ? 'alert' : 'error',
        title: fumble ? 'Possible Watchlist Match' : 'Watchlist Hit Triggered',
        message: fumble
          ? `AI aggregated '${res.plateNumber}' (${res.agreement} agreement) &bull; Possible Match for DL3CAM1234`
          : `AI aggregated '${res.plateNumber}' (${res.agreement} agreement) &bull; Exact hit on CAM-01`,
      });
      await loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Pipeline Error',
        message: err.message || 'Failed to trigger CCTV loop.',
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const filteredCameras = cameras.filter((cam) => {
    const matchesStatus = statusFilter === 'all' || cam.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      cam.name.toLowerCase().includes(q) ||
      cam.id.toLowerCase().includes(q) ||
      cam.location.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="live-monitoring-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Simulation Notice Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Live Camera Monitoring</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
              {cameras.length} Active Grid Nodes
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-angle video surveillance & YOLOv8 + OCR edge stream matrix with ~13/16 consensus aggregation.
          </p>
        </div>

        {/* Live Pipeline Test Actions & Stream Guide */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="open-live-guide-btn"
            onClick={() => setIsGuideOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Connect Live Feeds / Setup Guide
          </button>

          <button
            id="cctv-test-exact-btn"
            disabled={isTriggering}
            onClick={() => handleTriggerPipeline(false)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            {isTriggering ? 'Running...' : 'Test CCTV Hit (DL3CAM1234)'}
          </button>

          <button
            id="cctv-test-fumble-btn"
            disabled={isTriggering}
            onClick={() => handleTriggerPipeline(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isTriggering ? 'Running...' : 'Test OCR Fumble (DL3CAM123A)'}
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="camera-search-input"
            type="text"
            placeholder="Search by name, ID, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter:
          </span>
          {(['all', 'online', 'warning', 'offline'] as const).map((st) => (
            <button
              key={st}
              id={`filter-camera-${st}`}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Camera Feeds Grid */}
      {filteredCameras.length === 0 ? (
        <EmptyState
          icon="camera"
          title="No Cameras Found"
          description="No camera nodes match your active search or filter selection."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCameras.map((cam) => {
            const camDetections = detections.filter((d) => d.cameraId === cam.id);
            const latestDetection = camDetections[0];

            return (
              <div
                key={cam.id}
                id={`camera-card-${cam.id}`}
                className={`rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 overflow-hidden shadow-sm flex flex-col ${
                  cam.status === 'online'
                    ? 'border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-slate-700'
                    : cam.status === 'warning'
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                }`}
              >
                {/* Live Camera Video / Stream / Webcam Player */}
                <div className="border-b border-slate-200 dark:border-slate-800">
                  <LiveVideoPlayer
                    camera={cam}
                    cardIndex={idx}
                    latestDetection={latestDetection}
                    onOpenDetection={onOpenDetection}
                    onOpenGuide={() => setIsGuideOpen(true)}
                    isWebcamActive={webcamCamId === cam.id}
                    onToggleWebcam={(id) => setWebcamCamId((prev) => (prev === id ? null : id))}
                    isFullscreen={false}
                    onToggleFullscreen={() => setFullscreenCamId(cam.id)}
                  />
                </div>

                {/* Camera Information Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{cam.name}</h3>
                      <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-bold shrink-0">{cam.id}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mb-3">{cam.location}</p>

                    {/* Stats metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-slate-800/80 mb-3">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Last Detection</span>
                        <span className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                          {cam.lastPlateDetected || 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Registered Sightings</span>
                        <span className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                          {cam.sightingCount || 0} hits
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => onOpenCamera(cam.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-500" /> Camera Details
                    </button>
                    <span className="text-[11px] font-mono text-slate-400">{cam.ipAddress}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dedicated Fullscreen / Zoomed Camera Lightbox Modal */}
      {(() => {
        const activeFullscreenCam = cameras.find((c) => c.id === fullscreenCamId);
        if (!activeFullscreenCam) return null;

        const camDetections = detections.filter((d) => d.cameraId === activeFullscreenCam.id);
        const latestDetection = camDetections[0];

        return (
          <div
            id="camera-fullscreen-overlay"
            className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 animate-in fade-in duration-150"
            onClick={() => setFullscreenCamId(null)}
          >
            {/* Top Header Bar with prominent Close / Exit Zoom Button */}
            <div
              className="flex items-center justify-between pb-3 border-b border-slate-800 text-white shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {activeFullscreenCam.name}
                    </h2>
                    <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-800 px-2 py-0.5 rounded">
                      {activeFullscreenCam.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{activeFullscreenCam.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 hidden sm:inline font-mono">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200 text-[11px]">ESC</kbd> or click outside
                </span>
                <button
                  id="close-camera-zoom-btn"
                  onClick={() => setFullscreenCamId(null)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer"
                  title="Exit Zoom (Esc)"
                >
                  <X className="w-4 h-4" />
                  <span>Exit Zoom (Esc)</span>
                </button>
              </div>
            </div>

            {/* Centered Large Video Feed strictly scaled to fit viewport */}
            <div
              className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-3 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-6xl max-h-[82vh] aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-black">
                <LiveVideoPlayer
                  camera={activeFullscreenCam}
                  cardIndex={cameras.findIndex((c) => c.id === activeFullscreenCam.id)}
                  latestDetection={latestDetection}
                  onOpenDetection={onOpenDetection}
                  onOpenGuide={() => setIsGuideOpen(true)}
                  isWebcamActive={webcamCamId === activeFullscreenCam.id}
                  onToggleWebcam={(id) => setWebcamCamId((prev) => (prev === id ? null : id))}
                  isFullscreen={true}
                  onToggleFullscreen={() => setFullscreenCamId(null)}
                />
              </div>
            </div>
          </div>
        );
      })()}
      {/* Live Stream Integration Setup Modal */}
      <LiveStreamGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onActivateWebcam={() => setWebcamCamId('CAM-01')}
      />
    </div>
  );
};
