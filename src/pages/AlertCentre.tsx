import React, { useState, useEffect } from 'react';
import { Alert, AlertStatus, AlertPriority } from '../types';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import {
  ShieldAlert,
  Search,
  Check,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
  Clock,
  Eye,
  Camera,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfidenceBadge } from '../components/ui/ConfidenceBadge';
import { Skeleton } from '../components/ui/Skeleton';

interface AlertCentreProps {
  onOpenAlert: (alertId: string) => void;
  onSearchPlate: (plate: string) => void;
  onViewRoute: (plate: string) => void;
}

export const AlertCentre: React.FC<AlertCentreProps> = ({
  onOpenAlert,
  onSearchPlate,
  onViewRoute,
}) => {
  const { addToast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      const res = await api.getAlerts();
      setAlerts(res);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const unsub = api.subscribe(() => loadAlerts());
    return unsub;
  }, []);

  const handleQuickStatus = async (alert: Alert, newStatus: AlertStatus, label: string) => {
    setUpdatingId(alert.id);
    try {
      await api.patchAlert(alert.id, { status: newStatus });
      addToast({
        type: newStatus === 'resolved' ? 'success' : newStatus === 'false_positive' ? 'info' : 'alert',
        title: `Alert ${alert.id} ${label}`,
        message: `Status updated to ${newStatus.replace('_', ' ').toUpperCase()} for vehicle ${alert.plateNumber || 'N/A'}.`,
      });
      loadAlerts();
    } catch {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Could not contact surveillance node.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    let matchesStatus = true;
    if (statusFilter === 'possible') {
      matchesStatus = a.matchType === 'possible';
    } else if (statusFilter !== 'all') {
      matchesStatus = a.status === statusFilter;
    }

    const matchesPriority = priorityFilter === 'all' || a.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || a.type.includes(typeFilter);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (a.plateNumber && a.plateNumber.toLowerCase().includes(q)) ||
      (a.matchedWatchlistPlate && a.matchedWatchlistPlate.toLowerCase().includes(q)) ||
      a.reason.toLowerCase().includes(q) ||
      (a.cameraName && a.cameraName.toLowerCase().includes(q)) ||
      a.id.toLowerCase().includes(q);

    return matchesStatus && matchesPriority && matchesType && matchesSearch;
  });

  const getStatusPill = (status: AlertStatus) => {
    switch (status) {
      case 'new':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30">New</span>;
      case 'under_review':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30">Under Review</span>;
      case 'confirmed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 dark:border-purple-500/30">Confirmed</span>;
      case 'false_positive':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/20 dark:border-slate-500/30">False Positive</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30">Resolved</span>;
    }
  };

  const getPriorityPill = (p: AlertPriority) => {
    switch (p) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60">Low</span>;
    }
  };

  const possibleMatchesCount = alerts.filter((a) => a.matchType === 'possible').length;

  return (
    <div id="alert-centre-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Security Alert Centre</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">
              {alerts.length} Total Registered
            </span>
            {possibleMatchesCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {possibleMatchesCount} Possible Matches
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Operator triage console for live ANPR infractions, watchlist hits, and AI OCR consensus alerts.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh List
        </button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Alerts' },
            { id: 'possible', label: `Possible Matches (${possibleMatchesCount})` },
            { id: 'new', label: 'New' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'false_positive', label: 'False Positive' },
            { id: 'resolved', label: 'Resolved' },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`filter-status-${tab.id}`}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? tab.id === 'possible'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-sky-600 text-white shadow-xs'
                  : tab.id === 'possible' && possibleMatchesCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Second Row: Priority, Type and Search Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
          {/* Search */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="alert-search-input"
              type="text"
              placeholder="Search by plate, ID, reason, camera..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Priority dropdown */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Alert Type dropdown */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Alert Types</option>
              <option value="Watchlist">Watchlist Hits (All)</option>
              <option value="Possible Watchlist Match">Possible Matches (OCR Fumbles)</option>
              <option value="Perimeter">Perimeter Intrusion</option>
              <option value="Speeding">Speed Violations</option>
              <option value="Tampering">Plate Tampering</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Alert List Rows */}
      {!loading && filteredAlerts.length === 0 ? (
        <EmptyState
          icon="alert"
          title="No Alerts Found"
          description="There are no security alerts matching your selected criteria."
          actionLabel="Clear Filters"
          onAction={() => {
            setStatusFilter('all');
            setPriorityFilter('all');
            setTypeFilter('all');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="space-y-3.5">
          {filteredAlerts.map((alert, idx) => {
            const isPossibleMatch = alert.matchType === 'possible';

            return (
              <div
                key={`${alert.id}-${idx}`}
                id={`alert-row-${alert.id}`}
                className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                  isPossibleMatch
                    ? 'border-amber-300 dark:border-amber-800/80 hover:border-amber-500'
                    : 'border-slate-200 dark:border-slate-800/90 hover:border-sky-500 dark:hover:border-slate-700'
                }`}
              >
                {/* Left Details */}
                <div className="flex items-start gap-4 min-w-0">
                  {/* Evidence Thumbnail */}
                  <div
                    onClick={() => onOpenAlert(alert.id)}
                    className="w-24 h-16 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 cursor-pointer group relative shadow-xs"
                    title="Click to view full evidence frame"
                  >
                    <img src={alert.evidenceUrl} alt="Evidence" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-semibold">
                      Inspect
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {alert.plateNumber || 'TARGET ALERT'}
                      </span>

                      {isPossibleMatch ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                          <Sparkles className="w-3 h-3" />
                          Possible Match ({alert.similarityScore}% match &bull; {alert.editDistance} char diff)
                        </span>
                      ) : (
                        getPriorityPill(alert.priority)
                      )}

                      {getStatusPill(alert.status)}

                      {alert.matchedWatchlistPlate && alert.matchedWatchlistPlate !== alert.plateNumber && (
                        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          Target: <strong>{alert.matchedWatchlistPlate}</strong>
                        </span>
                      )}

                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">ID: {alert.id}</span>
                    </div>

                    <h3
                      onClick={() => onOpenAlert(alert.id)}
                      className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-300 cursor-pointer transition-colors line-clamp-1"
                    >
                      {alert.type}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">{alert.reason}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                      <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                        <Camera className="w-3 h-3" /> {alert.cameraName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> {alert.timestamp}
                      </span>
                      {alert.aggregationAgreement && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 font-semibold">
                          Consensus: {alert.aggregationAgreement}
                        </span>
                      )}
                      <ConfidenceBadge score={alert.confidence || 95} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Right Workflow Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0">
                  <button
                    onClick={() => onOpenAlert(alert.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Eye className="w-3 h-3 text-sky-500" /> Inspect Details
                  </button>

                  {alert.status !== 'under_review' && (
                    <button
                      disabled={updatingId === alert.id}
                      onClick={() => handleQuickStatus(alert, 'under_review', 'Acknowledged')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-xs font-medium transition-colors"
                    >
                      Review
                    </button>
                  )}

                  {alert.status !== 'confirmed' && (
                    <button
                      disabled={updatingId === alert.id}
                      onClick={() => handleQuickStatus(alert, 'confirmed', 'Confirmed')}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 text-xs font-medium transition-colors"
                    >
                      Confirm
                    </button>
                  )}

                  {alert.status !== 'resolved' && (
                    <button
                      disabled={updatingId === alert.id}
                      onClick={() => handleQuickStatus(alert, 'resolved', 'Resolved')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-xs font-medium transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
