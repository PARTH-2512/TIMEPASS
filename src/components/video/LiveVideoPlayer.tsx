import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Detection } from '../../types';
import Hls from 'hls.js';
import {
  Camera as CameraIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  HelpCircle,
  X,
  WifiOff,
} from 'lucide-react';

// Backoff constants matching grid operator rules
const BACKOFF_INITIAL_MS = 2_000;  // start at 2 s
const BACKOFF_CAP_MS     = 30_000; // cap at 30 s

interface LiveVideoPlayerProps {
  camera: Camera;
  cardIndex?: number;
  latestDetection?: Detection;
  onOpenDetection?: (detectionId: string) => void;
  onOpenGuide?: () => void;
  isWebcamActive?: boolean;
  onToggleWebcam?: (cameraId: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const LiveVideoPlayer: React.FC<LiveVideoPlayerProps> = ({
  camera,
  cardIndex,
  latestDetection,
  onOpenDetection,
  onOpenGuide,
  isWebcamActive = false,
  onToggleWebcam,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffMsRef = useRef<number>(BACKOFF_INITIAL_MS);
  const isMountedRef = useRef(true);

  // Normalize camera ID (e.g. 'CAM-01' -> 'cam01')
  const normId = (camera.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Feed assignment:
  // Card 1 (CAM-01 / index 0) -> live stream from run_live.py (cam01)
  // Card 2 (CAM-02 / index 1) -> live stream from run_live.py (cam02)
  // Card 3 (CAM-03 / index 2) -> VIDEO1.mp4
  // Card 4 (CAM-04 / index 3) -> VIDEO2.mp4
  // Card 5 (CAM-05 / index 4) -> VIDEO3.mp4
  const isCam01 = normId === 'cam01' || cardIndex === 0;
  const isCam02 = normId === 'cam02' || cardIndex === 1;
  const isCam03 = normId === 'cam03' || cardIndex === 2;
  const isCam04 = normId === 'cam04' || cardIndex === 3;
  const isCam05 = normId === 'cam05' || cardIndex === 4;

  const isLiveRunCam = !isWebcamActive && (isCam01 || isCam02);
  const liveRunCamId = isCam01 ? 'cam01' : isCam02 ? 'cam02' : '';

  const localVideoSrc = !isWebcamActive
    ? isCam03
      ? '/videos/VIDEO1.mp4'
      : isCam04
      ? '/videos/VIDEO2.mp4'
      : isCam05
      ? '/videos/VIDEO3.mp4'
      : null
    : null;

  // Stream image source for live camera from run_live.py (supports direct 8010 and proxy fallback)
  const [streamImgSrc, setStreamImgSrc] = useState<string>(
    () => `http://127.0.0.1:8010/live/${liveRunCamId}`
  );
  const [liveStreamKey, setLiveStreamKey] = useState<number>(0);

  useEffect(() => {
    if (isLiveRunCam && liveRunCamId) {
      setStreamImgSrc(`http://127.0.0.1:8010/live/${liveRunCamId}`);
    }
  }, [liveRunCamId, isLiveRunCam]);

  const handleStreamError = (camId: string) => {
    if (streamImgSrc.includes(':8010')) {
      // Direct 8010 failed or blocked, try Express proxy
      setStreamImgSrc(`/api/live-stream/${camId}`);
    } else {
      // Retry direct stream after 3 seconds
      setTimeout(() => {
        setLiveStreamKey((k) => k + 1);
        setStreamImgSrc(`http://127.0.0.1:8010/live/${camId}?t=${Date.now()}`);
      }, 3000);
    }
  };

  const [isPlayingLive, setIsPlayingLive] = useState(false);
  const [isWebcamStreaming, setIsWebcamStreaming] = useState(false);
  const [reconnectMsg, setReconnectMsg] = useState<string | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const streamUrl = camera.streamUrl || '';
  const isHttpOrHls =
    streamUrl.toLowerCase().startsWith('http://') || streamUrl.toLowerCase().startsWith('https://');
  const isHls = isHttpOrHls && (
    streamUrl.toLowerCase().includes('.m3u8') ||
    streamUrl.toLowerCase().includes('/live/stream/')
  );
  const hasNoUrl = !streamUrl && !isWebcamActive && !isLiveRunCam && !localVideoSrc;


  // ── Webcam ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isWebcamActive) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
        .then((stream) => {
          webcamStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
            setIsWebcamStreaming(true);
            setIsPlayingLive(true);
            setReconnectMsg(null);
          }
        })
        .catch(() => {
          setIsWebcamStreaming(false);
          setIsPlayingLive(false);
        });
    } else {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
        webcamStreamRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
      setIsWebcamStreaming(false);
      setIsPlayingLive(false);
    }

    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isWebcamActive]);

  // ── HLS with exponential backoff ─────────────────────────────────────────────
  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (backoffTimerRef.current) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }
  }, []);

  const initHls = useCallback(() => {
    if (!videoRef.current || !streamUrl || !isHls || isWebcamActive) return;
    if (!isMountedRef.current) return;

    destroyHls();

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        // PTS-driven timing — matches grid operator requirement
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        // We handle all retries ourselves with backoff
        manifestLoadingMaxRetry: 0,
        levelLoadingMaxRetry: 0,
        fragLoadingMaxRetry: 0,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isMountedRef.current) return;
        videoRef.current?.play().catch(() => {});
        setIsPlayingLive(true);
        setReconnectMsg(null);
        // Reset backoff on successful connection
        backoffMsRef.current = BACKOFF_INITIAL_MS;
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!isMountedRef.current) return;

        if (!data.fatal) {
          // Non-fatal: includes manifest/decode warnings right after attaching
          // (mid-GOP join) which the grid operator says are completely normal.
          // Never surface these to the user; log at debug level only.
          console.debug('[HLS] non-fatal', data.type, data.details);
          return;
        }

        // ── Fatal error handling ──
        console.warn('[HLS] fatal error', data.type, data.details);

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Brief network hiccup — attempt low-cost retry via startLoad
          hls.startLoad();
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          // Codec/decode issue — try media recovery first
          hls.recoverMediaError();
          return;
        }

        // Unrecoverable (includes hard scene cut at loop point) —
        // teardown and schedule a cold reinit with exponential backoff.
        destroyHls();
        setIsPlayingLive(false);

        const delay = backoffMsRef.current;
        const delaySec = Math.ceil(delay / 1000);
        setReconnectMsg(`Reconnecting in ${delaySec}s…`);
        console.log(`[HLS] scheduling reinit in ${delay}ms (backoff)`);

        backoffTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          setReconnectMsg(null);
          // Double for next failure, capped at 30 s
          backoffMsRef.current = Math.min(backoffMsRef.current * 2, BACKOFF_CAP_MS);
          initHls();
        }, delay);
      });

    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      videoRef.current.src = streamUrl;
      videoRef.current.play().catch(() => {});
      setIsPlayingLive(true);
      setReconnectMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl, isHls, isWebcamActive]);

  useEffect(() => {
    if (isLiveRunCam || localVideoSrc) return;
    isMountedRef.current = true;
    if (!isWebcamActive && isHls) {
      initHls();
    } else if (!isWebcamActive && isHttpOrHls && !isHls && videoRef.current) {
      // Direct MP4/WebM
      videoRef.current.src = streamUrl;
      videoRef.current.play().catch(() => {});
      setIsPlayingLive(true);
    }
    return () => {
      isMountedRef.current = false;
      destroyHls();
    };
  }, [streamUrl, isHttpOrHls, isHls, isWebcamActive, isLiveRunCam, localVideoSrc, initHls, destroyHls]);

  // Page visibility: tear down when hidden, reinit on return
  useEffect(() => {
    if (isLiveRunCam || localVideoSrc) return;
    const handleVisibility = () => {
      if (document.hidden) {
        destroyHls();
        setIsPlayingLive(false);
      } else if (!isWebcamActive && isHls && streamUrl) {
        backoffMsRef.current = BACKOFF_INITIAL_MS;
        initHls();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [destroyHls, initHls, isHls, isWebcamActive, isLiveRunCam, localVideoSrc, streamUrl]);


  // Ahmedabad background road asset based on camera location
  const locLower = (camera.location + ' ' + camera.name).toLowerCase();
  const ahmedabadBg =
    locLower.includes('riverfront') || locLower.includes('ellis')
      ? '/images/ahmedabad_riverfront_cctv.jpg'
      : '/images/ahmedabad_traffic_feed.jpg';

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen || !onToggleFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onToggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onToggleFullscreen]);

  return (
    <div className="relative aspect-video bg-slate-950 overflow-hidden group select-none">
      {/* 1. Real Video Element for Webcam / HLS stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${
          isWebcamStreaming || (isPlayingLive && !isLiveRunCam && !localVideoSrc) ? 'block' : 'hidden'
        }`}
      />

      {/* 2. Live camera feed from run_live.py (Cards 1 & 2: CAM-01 / CAM-02) */}
      {!isWebcamStreaming && isLiveRunCam && (
        <div className="w-full h-full relative overflow-hidden bg-slate-950">
          <img
            key={liveStreamKey}
            src={streamImgSrc}
            alt={`${camera.name} Live Feed`}
            onError={() => handleStreamError(liveRunCamId)}
            className="w-full h-full object-cover opacity-95 group-hover:scale-105 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
          />

          {/* Scanline CRT overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.55)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />
          <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/60 pointer-events-none" />

          {/* Dynamic Laser Scanning Line */}
          <div className="absolute left-0 right-0 h-0.5 bg-emerald-400/60 shadow-[0_0_8px_#34d399] animate-bounce pointer-events-none top-1/3 opacity-70" />

          {/* Center ANPR Target Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-28 border border-emerald-500/40 rounded-lg relative">
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />

              <div className="absolute top-1 left-2 text-[9px] font-mono font-bold text-emerald-400">
                [LIVE &bull; {liveRunCamId.toUpperCase()} &bull; RUN_LIVE.PY]
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Looping Local CCTV Videos (Cards 3, 4, 5: VIDEO1, VIDEO2, VIDEO3) */}
      {!isWebcamStreaming && !isLiveRunCam && localVideoSrc && (
        <div className="w-full h-full relative overflow-hidden bg-slate-950">
          <video
            autoPlay
            loop
            muted
            playsInline
            src={localVideoSrc}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />

          {/* Scanline CRT overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.55)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />
          <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/60 pointer-events-none" />

          {/* Dynamic Laser Scanning Line */}
          <div className="absolute left-0 right-0 h-0.5 bg-sky-400/60 shadow-[0_0_8px_#38bdf8] animate-bounce pointer-events-none top-1/3 opacity-70" />

          {/* Center ANPR Target Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-28 border border-sky-500/40 rounded-lg relative">
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-sky-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-sky-400" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-sky-400" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-sky-400" />

              <div className="absolute top-1 left-2 text-[9px] font-mono font-bold text-sky-400">
                [{isCam03 ? 'VIDEO1' : isCam04 ? 'VIDEO2' : 'VIDEO3'} &bull; CCTV LOOP]
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Simulated Ahmedabad CCTV View if no live/local video source */}
      {!isWebcamStreaming && !isPlayingLive && !isLiveRunCam && !localVideoSrc && (
        <div className="w-full h-full relative overflow-hidden bg-slate-950">
          {/* Authentic Ahmedabad Road CCTV Photo Background */}
          <img
            src={ahmedabadBg}
            alt={`${camera.name} Ahmedabad Feed`}
            className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
          />

          {/* Scanline CRT overlay simulation */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.65)_50%)] bg-[length:100%_4px] pointer-events-none opacity-45" />
          <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/70 pointer-events-none" />

          {/* Dynamic Laser Scanning Line */}
          <div className="absolute left-0 right-0 h-0.5 bg-sky-400/60 shadow-[0_0_8px_#38bdf8] animate-bounce pointer-events-none top-1/3 opacity-70" />

          {/* Center ANPR Target Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-28 border border-sky-500/40 rounded-lg relative">
              {/* Corner crosshairs */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-sky-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-sky-400" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-sky-400" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-sky-400" />

              <div className="absolute top-1 left-2 text-[9px] font-mono font-bold text-sky-400">
                [AHMEDABAD ANPR SCAN]
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Left Status Watermark */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold border border-slate-700/60 shadow-lg">
        {isWebcamStreaming ? (
          <>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-rose-400">LIVE WEBCAM STREAM</span>
          </>
        ) : isLiveRunCam ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-emerald-400">LIVE CAMERA &bull; {liveRunCamId.toUpperCase()} (run_live.py)</span>
          </>
        ) : localVideoSrc ? (
          <>
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-sky-300">CCTV LOOP &bull; {isCam03 ? 'VIDEO1' : isCam04 ? 'VIDEO2' : 'VIDEO3'}</span>
          </>
        ) : isPlayingLive ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-emerald-400">LIVE HLS FEED</span>
          </>
        ) : reconnectMsg ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-400">RECONNECTING</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400">YOLOv8 + OCR FEED</span>
          </>
        )}
      </div>

      {/* Top Right Controls & Status */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
        {/* Dedicated prominent Exit button when Zoomed/Fullscreen */}
        {isFullscreen && onToggleFullscreen && (
          <button
            id={`exit-zoom-top-btn-${camera.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFullscreen();
            }}
            className="p-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono transition-colors flex items-center gap-1.5 shadow-xl border border-rose-400 cursor-pointer"
            title="Exit Zoom (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Zoom (Esc)</span>
          </button>
        )}

        {/* Stream Guide Helper Trigger */}
        {onOpenGuide && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenGuide();
            }}
            className="p-1 px-2 rounded-lg bg-black/80 backdrop-blur-xs text-[10px] font-mono text-sky-400 hover:text-sky-300 border border-sky-500/40 hover:border-sky-400 transition-colors flex items-center gap-1 shadow-lg"
            title="How to connect live feeds"
          >
            <HelpCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Connect Feeds</span>
          </button>
        )}

        {/* Webcam Toggle Button */}
        {onToggleWebcam && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWebcam(camera.id);
            }}
            className={`p-1 px-2 rounded-lg backdrop-blur-xs text-[10px] font-mono border transition-colors flex items-center gap-1 shadow-lg ${
              isWebcamStreaming
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                : 'bg-black/80 text-slate-300 hover:text-white border-slate-700 hover:border-slate-500'
            }`}
            title={isWebcamStreaming ? 'Disconnect Webcam' : 'Use Device Webcam'}
          >
            <CameraIcon className="w-3 h-3" />
            <span>{isWebcamStreaming ? 'Stop Cam' : 'Webcam'}</span>
          </button>
        )}

        {/* Online / Warning / Offline Status Badge */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/80 text-[10px] font-bold font-mono border border-slate-700/60">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              camera.status === 'online'
                ? 'bg-emerald-500'
                : camera.status === 'warning'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
          <span
            className={
              camera.status === 'online'
                ? 'text-emerald-400'
                : camera.status === 'warning'
                ? 'text-amber-400'
                : 'text-rose-400'
            }
          >
            {camera.status.toUpperCase()}
          </span>
        </div>

        {/* Zoom button on card */}
        {!isFullscreen && onToggleFullscreen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFullscreen();
            }}
            className="p-1 px-1.5 rounded-lg bg-black/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors shadow-lg"
            title="Zoom Feed (Fullscreen)"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Reconnecting overlay badge — calm "will recover", not a hard error */}
      {reconnectMsg && !isWebcamStreaming && (
        <div className="absolute top-10 left-2 right-2 z-20 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/80 backdrop-blur-xs border border-amber-500/40 text-[10px] font-mono text-amber-200">
          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
          <span>{reconnectMsg} Brief interruptions are expected — the stream will resume automatically.</span>
        </div>
      )}

      {/* No-URL fallback note — only shown when camera has no stream URL at all */}
      {hasNoUrl && !reconnectMsg && (
        <div className="absolute top-10 left-2 right-2 z-20 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-xs border border-slate-700/40 text-[10px] font-mono text-slate-400">
          <WifiOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>
            No stream URL configured.{' '}
            {onOpenGuide && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenGuide(); }}
                className="underline text-sky-400 hover:text-sky-300"
              >
                Sync from grid or configure manually.
              </button>
            )}
          </span>
        </div>
      )}

      {/* Latest Plate Detection Overlay Badge */}
      {latestDetection && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenDetection) onOpenDetection(latestDetection.id);
          }}
          className="absolute bottom-10 left-3 z-20 inline-flex flex-col items-start gap-1 p-2 rounded-xl bg-black/90 backdrop-blur-md border border-sky-500/40 text-[11px] font-mono text-sky-300 hover:border-sky-400 cursor-pointer transition-all shadow-xl max-w-[85%]"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-400 uppercase font-bold">OCR DETECTED:</span>
            {/* Indian Plate visual styling */}
            <div className="flex items-center bg-white text-black px-1.5 py-0.5 rounded border border-slate-400 shadow-xs">
              <span className="bg-blue-900 text-white text-[8px] font-bold px-1 rounded-xs mr-1">IND</span>
              <span className="font-black text-xs tracking-wider">{latestDetection.normalizedPlate}</span>
            </div>

            {latestDetection.matchType === 'possible' ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/40">
                POSSIBLE
              </span>
            ) : latestDetection.isWatchlistMatch ? (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold border border-rose-500/40 animate-pulse">
                WATCHLIST HIT
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-[9.5px] text-slate-400">
            <span>Agreement: {latestDetection.aggregationAgreement || '13/16'}</span>
            <span>&bull;</span>
            <span className="text-emerald-400">Det: {latestDetection.detectionConfidence}%</span>
          </div>
        </div>
      )}

      {/* Video Bottom Telemetry HUD */}
      <div className="absolute bottom-2 left-2 right-2 z-20 flex justify-between items-center text-[10px] font-mono text-slate-400 bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="text-sky-400 font-bold">{camera.id}</span>
          <span>FPS: {camera.fps || 30}</span>
          <span className="hidden sm:inline">RES: {camera.resolution || '4K UHD'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="truncate">{camera.lastHeartbeat || 'Heartbeat OK'}</span>
          {onToggleFullscreen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen();
              }}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
