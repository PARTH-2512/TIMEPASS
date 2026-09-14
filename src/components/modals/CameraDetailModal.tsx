import React, { useState } from 'react';
import { Camera, Alert, Detection } from '../../types';
import { X, Video, Activity, MapPin, Radio, ShieldAlert, Cpu } from 'lucide-react';
import { LiveVideoPlayer } from '../video/LiveVideoPlayer';
import { LiveStreamGuideModal } from './LiveStreamGuideModal';

interface CameraDetailModalProps {
  camera: Camera | null;
  alerts: Alert[];
  detections: Detection[];
  onClose: () => void;
  onOpenMap: (cameraId: string) => void;
  onOpenAlert: (alertId: string) => void;
  onOpenDetection: (detectionId: string) => void;
}

export const CameraDetailModal: React.FC<CameraDetailModalProps> = ({
  camera,
  alerts,
  detections,
  onClose,
  onOpenMap,
  onOpenAlert,
  onOpenDetection,
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  if (!camera) return null;

  const cameraAlerts = alerts.filter((a) => a.cameraId === camera.id);
  const cameraDetections = detections.filter((d) => d.cameraId === camera.id);
  const latestDetection = cameraDetections[0];

  const statusColor =
    camera.status === 'online'
      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : camera.status === 'warning'
      ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
      : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30';

  return (
    <div
      id="camera-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="camera-detail-modal"
        className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 my-8 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 text-sky-600 dark:text-sky-400">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{camera.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor} uppercase`}>
                  {camera.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                ID: {camera.id} &bull; Vendor: {camera.vendor || 'Industrial Edge Optical'}
              </p>
            </div>
          </div>
          <button
            id="close-camera-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Video Player / Stream View */}
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 mb-6">
          <LiveVideoPlayer
            camera={camera}
            latestDetection={latestDetection}
            onOpenDetection={(id) => {
              onOpenDetection(id);
              onClose();
            }}
            onOpenGuide={() => setIsGuideOpen(true)}
            isWebcamActive={isWebcamActive}
            onToggleWebcam={() => setIsWebcamActive((prev) => !prev)}
          />
        </div>

        {/* Telemetry and Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" /> Uptime
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-white">{camera.uptime || '99.8%'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-500" /> Detections
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-white">{camera.totalDetections || cameraDetections.length}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Active Alerts
            </span>
            <span className="text-base font-bold text-rose-600 dark:text-rose-400">{cameraAlerts.length}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500" /> Location
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{camera.location}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2.5 pb-6 border-b border-slate-200 dark:border-slate-800">
          <button
            id="camera-open-map-btn"
            onClick={() => {
              onOpenMap(camera.id);
              onClose();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Open on GIS Map
          </button>
        </div>

        {/* Recent Alerts & Sightings tabs */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Recent Alerts for this camera */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Recent Camera Alerts ({cameraAlerts.length})
            </h4>
            {cameraAlerts.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                No active security alerts registered on this camera node.
              </p>
            ) : (
              <div className="space-y-2">
                {cameraAlerts.map((alt, idx) => (
                  <div
                    key={`${alt.id}-${idx}`}
                    onClick={() => {
                      onOpenAlert(alt.id);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-slate-700 cursor-pointer flex justify-between items-center transition-colors shadow-xs"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{alt.plateNumber}</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{alt.type}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{alt.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Detections for this camera */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              Recent Sightings ({cameraDetections.length})
            </h4>
            {cameraDetections.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                No recent vehicle detections recorded in the current buffer.
              </p>
            ) : (
              <div className="space-y-2">
                {cameraDetections.map((det, idx) => (
                  <div
                    key={`${det.id}-${idx}`}
                    onClick={() => {
                      onOpenDetection(det.id);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-slate-700 cursor-pointer flex justify-between items-center transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-300 border border-slate-200 dark:border-slate-700">
                        {det.normalizedPlate}
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">{det.vehicleType}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{det.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <LiveStreamGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onActivateWebcam={() => setIsWebcamActive(true)}
      />
    </div>
  );
};
