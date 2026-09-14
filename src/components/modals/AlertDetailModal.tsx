import React, { useState } from 'react';
import { Alert, AlertStatus, VehicleSighting } from '../../types';
import { api } from '../../lib/api';
import { useToast } from '../../lib/ToastContext';
import {
  X,
  ShieldAlert,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Search,
  Check,
  Sparkles,
  ArrowRight,
  Split,
} from 'lucide-react';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';

interface AlertDetailModalProps {
  alert: Alert | null;
  onClose: () => void;
  onSearchPlate: (plate: string) => void;
  onViewRoute: (plate: string) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  onClose,
  onSearchPlate,
  onViewRoute,
}) => {
  const { addToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<AlertStatus | null>(alert?.status ?? null);
  const [sightings, setSightings] = useState<VehicleSighting[]>([]);
  const [loadingSightings, setLoadingSightings] = useState(false);

  // Load sightings when modal opens
  React.useEffect(() => {
    if (alert?.plateNumber) {
      setCurrentStatus(alert.status);
      setLoadingSightings(true);
      api
        .getVehicleSightings(alert.plateNumber)
        .then((res) => setSightings(res))
        .catch(() => setSightings([]))
        .finally(() => setLoadingSightings(false));
    }
  }, [alert]);

  if (!alert) return null;

  const handleUpdateStatus = async (newStatus: AlertStatus, label: string) => {
    setIsUpdating(true);
    try {
      await api.patchAlert(alert.id, { status: newStatus });
      setCurrentStatus(newStatus);

      addToast({
        type: newStatus === 'false_positive' ? 'info' : newStatus === 'resolved' ? 'success' : 'alert',
        title: `Alert ${alert.id} ${label}`,
        message: `Status updated to ${newStatus.replace('_', ' ').toUpperCase()} for vehicle ${alert.plateNumber || 'N/A'}.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Unable to communicate with the surveillance API.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const priorityColor =
    alert.priority === 'high'
      ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
      : alert.priority === 'medium'
      ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
      : 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30';

  const statusBadge = (st: AlertStatus) => {
    switch (st) {
      case 'new':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">NEW</span>;
      case 'under_review':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">UNDER REVIEW</span>;
      case 'confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">CONFIRMED</span>;
      case 'false_positive':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">FALSE POSITIVE</span>;
      case 'resolved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">RESOLVED</span>;
    }
  };

  const isPossibleMatch = alert.matchType === 'possible';

  return (
    <div
      id="alert-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="alert-detail-modal"
        className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 my-8 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isPossibleMatch
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400'
            }`}>
              {isPossibleMatch ? <Sparkles className="w-6 h-6 animate-pulse" /> : <ShieldAlert className="w-6 h-6 animate-pulse" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{alert.type}</h2>
                {isPossibleMatch ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Possible Match ({alert.similarityScore}%)
                  </span>
                ) : (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${priorityColor}`}>
                    {alert.priority} Priority
                  </span>
                )}
                {statusBadge(currentStatus || alert.status)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Alert ID: {alert.id} &bull; Case: {alert.caseId || 'REF-EDGE-SEC'}
              </p>
            </div>
          </div>
          <button
            id="close-alert-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Possible Match Suspected OCR Fumble Analysis Card */}
        {isPossibleMatch && (
          <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 mb-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              OCR Fumble Tolerance & Fuzzy Match Analysis
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Target Watchlist Plate
                </span>
                <span className="font-mono text-base font-black text-rose-600 dark:text-rose-400">
                  {alert.matchedWatchlistPlate || 'UNKNOWN'}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Detected Sighting Plate
                </span>
                <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                  {alert.plateNumber || 'UNKNOWN'}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Agreement Consensus
                </span>
                <span className="font-mono text-base font-black text-amber-600 dark:text-amber-400">
                  {alert.aggregationAgreement || '~13/16'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Distance: {alert.editDistance ?? 1} char diff ({alert.similarityScore ?? 90}% match)
                </span>
              </div>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
              <strong>Operational Note:</strong> Vehicle tracking + plate detection aggregated high multi-frame consensus ({alert.aggregationAgreement || '13/16 agreement'}). To avoid dropping a critical watchlist target due to a single-character optical ambiguity, IVMAP created this <em>Possible Match</em> alert for manual officer confirmation.
            </p>
          </div>
        )}

        {/* Required Operator Action Bar */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 mb-6">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
            Required Operator Workflow Actions:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="action-acknowledge-btn"
              disabled={isUpdating || currentStatus === 'under_review'}
              onClick={() => handleUpdateStatus('under_review', 'Acknowledged')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                currentStatus === 'under_review'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-xs'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Acknowledge / Under Review
            </button>

            <button
              id="action-confirm-btn"
              disabled={isUpdating || currentStatus === 'confirmed'}
              onClick={() => handleUpdateStatus('confirmed', 'Confirmed')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                currentStatus === 'confirmed'
                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40'
                  : 'bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-700/50 shadow-xs'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Confirm Alert (True Match)
            </button>

            <button
              id="action-false-positive-btn"
              disabled={isUpdating || currentStatus === 'false_positive'}
              onClick={() => handleUpdateStatus('false_positive', 'Marked False Positive')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                currentStatus === 'false_positive'
                  ? 'bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-xs'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Mark False Positive
            </button>

            <button
              id="action-resolve-btn"
              disabled={isUpdating || currentStatus === 'resolved'}
              onClick={() => handleUpdateStatus('resolved', 'Resolved')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                currentStatus === 'resolved'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700/50 shadow-xs'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              Resolve Alert
            </button>
          </div>
        </div>

        {/* Evidence Snapshot Frame */}
        <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 mb-6 relative">
          <img
            src={alert.evidenceUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80'}
            alt={`Alert snapshot ${alert.id}`}
            className="w-full h-auto object-cover max-h-80"
          />
          <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded bg-black/80 font-mono text-xs text-slate-200 flex items-center gap-3">
            <span>NODE: {alert.cameraName}</span>
            <span>TIME: {alert.timestamp}</span>
          </div>
        </div>

        {/* Alert Details Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Information</h4>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Vehicle License Plate</span>
              <div className="inline-block px-3 py-1 bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 font-mono font-black text-slate-900 dark:text-white text-sm tracking-wider shadow-xs">
                {alert.plateNumber || 'UNKNOWN'}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Watchlist / Alert Reason</span>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                {alert.reason}
              </p>
            </div>

            {alert.reviewedBy && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Audit Review: <span className="text-slate-800 dark:text-slate-200 font-medium">{alert.reviewedBy}</span> at {alert.reviewedAt}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sighting & AI Confidence</h4>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Camera Node & Location</span>
              <p className="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono">{alert.cameraName} ({alert.cameraId})</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">{alert.location}</p>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Confidence Metrics</span>
              <div className="flex flex-wrap gap-2">
                <ConfidenceBadge score={alert.confidence || alert.detectionConfidence || 95} labelPrefix="Overall: " />
                {alert.ocrConfidence && (
                  <ConfidenceBadge score={alert.ocrConfidence} labelPrefix="OCR: " />
                )}
                {alert.aggregationAgreement && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-300">
                    Consensus: {alert.aggregationAgreement}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Timestamp</span>
              <p className="text-xs font-mono text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {alert.timestamp}
              </p>
            </div>
          </div>
        </div>

        {/* Related Sightings for this plate */}
        {alert.plateNumber && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-500" />
                Related Sightings for {alert.plateNumber} ({sightings.length})
              </h4>
              <div className="flex gap-2">
                <button
                  id="alert-search-plate-btn"
                  onClick={() => {
                    onSearchPlate(alert.plateNumber!);
                    onClose();
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 shadow-xs"
                >
                  <Search className="w-3 h-3" /> Search History
                </button>
                <button
                  id="alert-view-route-btn"
                  onClick={() => {
                    onViewRoute(alert.plateNumber!);
                    onClose();
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold transition-colors flex items-center gap-1 shadow-xs"
                >
                  <MapPin className="w-3 h-3" /> Trace Route
                </button>
              </div>
            </div>

            {loadingSightings ? (
              <div className="text-xs text-slate-500 py-3 text-center">Loading sighting records...</div>
            ) : sightings.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center bg-slate-50 dark:bg-slate-950/40 rounded-lg">
                No other sightings registered for this plate in the current window.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {sightings.map((s, idx) => (
                  <div
                    key={`${s.id || 'sight'}-${idx}`}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{s.cameraName}</span>
                      <span className="text-slate-500 dark:text-slate-400">({s.location})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{s.timestamp}</span>
                      <ConfidenceBadge score={s.detectionConfidence ?? s.ocrConfidence ?? 90} labelPrefix="Det: " size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
