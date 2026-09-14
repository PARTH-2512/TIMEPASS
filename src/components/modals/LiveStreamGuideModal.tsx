import React, { useState } from 'react';
import {
  X,
  Radio,
  Video,
  Terminal,
  Camera as CameraIcon,
  Server,
  Code2,
  ExternalLink,
  Check,
  Copy,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface LiveStreamGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateWebcam?: () => void;
}

export const LiveStreamGuideModal: React.FC<LiveStreamGuideModalProps> = ({
  isOpen,
  onClose,
  onActivateWebcam,
}) => {
  const [activeTab, setActiveTab] = useState<'rtsp' | 'webcam' | 'hls' | 'python'>('rtsp');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                How to Connect Live Camera Feeds
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Shared CCTV grid integration guide — catalogue-first URL resolution, HLS playback, Python ingestion, and local webcam testing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 bg-slate-50/30 dark:bg-slate-950/20 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('rtsp')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'rtsp'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            1. Shared CCTV Grid
          </button>
          <button
            onClick={() => setActiveTab('webcam')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'webcam'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <CameraIcon className="w-3.5 h-3.5" />
            2. Local Webcam / USB Camera
          </button>
          <button
            onClick={() => setActiveTab('hls')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'hls'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            3. Web Streams (HLS / MP4)
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'python'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            4. Python Edge Ingestion
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: RTSP IP CAMERAS */}
          {activeTab === 'rtsp' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300">
                <span className="font-bold block mb-1">Shared CCTV Grid — Catalogue-First Protocol</span>
                IVMAP is connected to a shared CCTV grid. <strong>Always read the catalogue first</strong> to
                discover camera URLs — never hard-code a stream URL. The grid exposes three protocols; IVMAP
                uses HLS for browser playback.
              </div>

              {/* Step 1: Configure host */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px]">1</span>
                  Set CCTV_GRID_HOST in your .env
                </h3>
                <div className="relative">
                  <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
{`# .env (no trailing slash)
CCTV_GRID_HOST=http://<host>`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard('CCTV_GRID_HOST=http://<host>', 'env-host')}
                    className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedCode === 'env-host' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedCode === 'env-host' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-slate-600 dark:text-slate-300">After saving, restart the server. IVMAP will auto-sync the catalogue on startup.</p>
              </div>

              {/* Step 2: Catalogue */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px]">2</span>
                  The Three Real URL Patterns
                </h3>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-[11px]">
                  <div className="text-slate-500 dark:text-slate-400 font-sans font-semibold mb-1">Always resolved from <code>GET {'{CCTV_GRID_HOST}'}/api/ingest</code> — never hard-coded:</div>
                  <div className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold">HLS (browser / dashboard / this app):</span>
                      <div className="text-slate-600 dark:text-slate-300">{'http://<host>/live/stream/<id>/index.m3u8'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sky-500 dark:text-sky-400">
                    <Layers className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold">WebRTC/WHEP (future low-latency option — not yet used):</span>
                      <div className="text-slate-600 dark:text-slate-300">{'http://<host>:8889/stream/<id>/whep'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-amber-500 dark:text-amber-400">
                    <Terminal className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold">RTSP (AI/YOLO pipeline only — not for browsers):</span>
                      <div className="text-slate-600 dark:text-slate-300">{'rtsp://<host>:8554/stream/<id>'} — force TCP transport</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Sync */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px]">3</span>
                  Sync Cameras into IVMAP
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Go to <strong>Camera Registry</strong> → click <strong>Sync from Grid</strong>. IVMAP calls
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-sky-600 dark:text-sky-400">POST /api/live-grid/sync</code>
                  server-side, which fetches the catalogue, upserts each camera with its real HLS URL,
                  and never removes manually-added cameras. Camera status, codec, fps, and resolution
                  are re-polled every 20 seconds automatically.
                </p>
              </div>

              {/* Grid rules */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-1">
                <span className="font-bold block">Grid Operator Rules (read carefully):</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Never hard-code a stream URL — always resolve from the catalogue.</li>
                  <li>Drive timing from PTS only, never wall-clock or declared fps.</li>
                  <li>Frame intervals are non-uniform — a gap is not a disconnect.</li>
                  <li>Reconnect with exponential backoff: start ~2 s, cap ~30 s. Never tight-loop.</li>
                  <li>Manifest/decode warnings right after connecting are normal (mid-GOP join) — not fatal.</li>
                  <li>The feed loops at the recording boundary (hard scene cut). Long-lived state must recover from that.</li>
                  <li>Read-only access only — never publish to the gateway or call any control API.</li>
                  <li>Open only the cameras you are actively displaying; destroy the player when the card unmounts.</li>
                  <li>No downloading: <code>/stream/&lt;id&gt;</code> is a browser range-request fallback, not a full file.</li>
                </ul>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                See <code>docs/BACKEND_DECISION.md</code> for the two-backend architecture note and the WHEP/WebRTC future roadmap.
              </p>
            </div>
          )}

          {/* TAB 2: LOCAL WEBCAM */}
          {activeTab === 'webcam' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
                <h3 className="text-sm font-bold text-sky-600 dark:text-sky-400 mb-1">
                  Zero-Setup Instant Live Video Testing
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  You can immediately test real-time video surveillance right now using your computer's built-in webcam or a connected USB capture card / camera without configuring any network servers.
                </p>

                {onActivateWebcam && (
                  <button
                    onClick={() => {
                      onActivateWebcam();
                      onClose();
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <CameraIcon className="w-4 h-4" />
                    Activate Device Webcam Now on CAM-01
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">How it works in IVMAP:</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li>Click <strong>"Connect Webcam"</strong> on any camera node card in Live Monitoring.</li>
                  <li>Grant browser camera permission when prompted.</li>
                  <li>Your real webcam feed will stream in real-time with optical scanning HUD, reticles, and ANPR overlay!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: HLS / MP4 */}
          {activeTab === 'hls' && (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-300">
                If you already have an HTTP Live Streaming (HLS) URL or direct video feed from your NVR or cloud CDN:
              </p>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="text-slate-500 dark:text-slate-400 font-sans font-semibold">Supported formats:</div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> HLS Streams: <span className="text-slate-700 dark:text-slate-300">https://your-server.net/live/cam01.m3u8</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> MP4 Video Loops: <span className="text-slate-700 dark:text-slate-300">https://your-server.net/clips/sg_highway_sample.mp4</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> WebM Streams: <span className="text-slate-700 dark:text-slate-300">https://your-server.net/streams/junction.webm</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">Where to enter it:</span>
                <p className="text-slate-600 dark:text-slate-300">
                  Go to <strong>Camera Registry</strong> &rarr; Click <strong>Edit</strong> on any camera node &rarr; Paste your URL into the <strong>Ingress Stream URI</strong> field.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: PYTHON / YOLOV8 EDGE INGESTION */}
          {activeTab === 'python' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-300">
                If you are running YOLOv8 + EasyOCR on an edge device (Jetson Orin, Raspberry Pi 5, or a PC running OpenCV), post real-time plate detections to this Express server via:
              </p>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
                <span className="font-bold">⚠ Two-backend note:</span> This Express server uses <code>POST /api/sightings</code> with
                <strong> camelCase</strong> field names. A separate Python FastAPI backend (Caught-In-4K) uses
                <code>POST /api/v1/sightings</code> with <strong>snake_case</strong> fields. They are not the same
                backend. See <code>docs/BACKEND_DECISION.md</code> for the team decision that needs to be made
                before wiring real AI detections.
              </div>

              <div className="relative">
                <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
{`import requests

# Send real-time ANPR detection to IVMAP Express server
# Endpoint: POST /api/sightings  (camelCase fields)
payload = {
    "cameraId": "CAM-01",
    "plateNumber": "GJ01AB1234",
    "detectionConfidence": 96.5,
    "ocrConfidence": 93.2,
    "trackingConfidence": 98.0,
    "aggregationAgreement": "14/16 (87.5%)",
    "vehicleType": "Sedan",
    "vehicleColor": "Silver Metallic",
    "speedKmh": 58
}

response = requests.post(
    "http://localhost:3000/api/sightings",
    headers={"Content-Type": "application/json"},
    json=payload
)

print(response.json())`}
                </pre>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `import requests\n\npayload = {\n    "cameraId": "CAM-01",\n    "plateNumber": "GJ01AB1234",\n    "detectionConfidence": 96.5,\n    "ocrConfidence": 93.2\n}\n\nrequests.post("http://localhost:3000/api/sightings", json=payload)`,
                      'python-code'
                    )
                  }
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1 transition-colors"
                >
                  {copiedCode === 'python-code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedCode === 'python-code' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            IVMAP Unified CCTV Engine &bull; Ahmedabad Surveillance Network
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
