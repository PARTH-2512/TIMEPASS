import React from 'react';
import { Detection } from '../../types';
import { X, Search, MapPin, ShieldAlert, Eye } from 'lucide-react';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';

interface DetectionDetailModalProps {
  detection: Detection | null;
  onClose: () => void;
  onSearchPlate: (plate: string) => void;
  onViewRoute: (plate: string) => void;
}

export const DetectionDetailModal: React.FC<DetectionDetailModalProps> = ({
  detection,
  onClose,
  onSearchPlate,
  onViewRoute,
}) => {
  if (!detection) return null;

  return (
    <div
      id="detection-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="detection-detail-modal"
        className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 my-8 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 text-sky-600 dark:text-sky-400">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-mono font-black tracking-wider text-slate-900 dark:text-white">
                  {detection.normalizedPlate}
                </h2>
                {detection.isWatchlistMatch ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    WATCHLIST MATCH
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    CLEAR
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Detection ID: {detection.id} &bull; Tracking ID: {detection.trackingId}
              </p>
            </div>
          </div>
          <button
            id="close-detection-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Evidence Snapshot Frame */}
        <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 mb-5 relative group">
          <img
            src={detection.evidenceUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80'}
            alt={`Evidence for ${detection.plateNumber || 'vehicle'}`}
            className="w-full h-auto object-cover max-h-80"
          />
          <div className="absolute bottom-2 left-2 z-10 px-2 py-1 rounded bg-black/70 text-[10px] font-mono text-slate-300">
            {detection.cameraName} &bull; {detection.timestamp}
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Plate & OCR details */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Plate & OCR Pipeline</h4>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Normalized Plate Number</span>
              <div className="inline-block px-3 py-1 bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 font-mono font-black text-slate-900 dark:text-white text-sm tracking-wider shadow-xs">
                {detection.normalizedPlate}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Raw Edge OCR Output</span>
              <code className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 shadow-xs">
                "{detection.rawOcrText}"
              </code>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">OCR Confidence</span>
              <ConfidenceBadge score={detection.ocrConfidence} labelPrefix="OCR: " />
            </div>
          </div>

          {/* Vehicle and Node Info */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vehicle & Edge Node</h4>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Classification & Color</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {detection.vehicleType} ({detection.vehicleColor})
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Camera Node</span>
              <span className="text-xs text-sky-600 dark:text-sky-400 font-mono font-bold block">
                {detection.cameraName} ({detection.cameraId})
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">{detection.location}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Detection & Track Confidence</span>
              <div className="flex flex-wrap gap-2">
                <ConfidenceBadge score={detection.detectionConfidence} labelPrefix="Detection: " />
                <ConfidenceBadge score={detection.trackingConfidence} labelPrefix="Track: " />
              </div>
            </div>
          </div>
        </div>

        {/* Watchlist Reason Callout if matched */}
        {detection.isWatchlistMatch && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 mb-6 flex items-start gap-3 text-rose-800 dark:text-rose-200">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold tracking-wide uppercase block text-rose-700 dark:text-rose-300">
                Watchlist Advisory
              </span>
              <p className="text-xs mt-1 leading-relaxed text-rose-800 dark:text-rose-200/90">{detection.watchlistReason}</p>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            id="detection-search-plate-btn"
            onClick={() => {
              onSearchPlate(detection.normalizedPlate);
              onClose();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Search All Sightings
          </button>

          <button
            id="detection-view-route-btn"
            onClick={() => {
              onViewRoute(detection.normalizedPlate);
              onClose();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5" />
            View Inferred Route on GIS
          </button>
        </div>
      </div>
    </div>
  );
};
