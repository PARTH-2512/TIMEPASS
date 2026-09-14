import React, { useState, useEffect } from 'react';
import { WatchlistEntry } from '../types';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import {
  Bookmark,
  PlusCircle,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { AddWatchlistModal } from '../components/modals/AddWatchlistModal';
import { EmptyState } from '../components/ui/EmptyState';

interface WatchlistPageProps {
  onSearchPlate: (plate: string) => void;
  onViewRoute: (plate: string) => void;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({
  onSearchPlate,
  onViewRoute,
}) => {
  const { addToast } = useToast();
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.getWatchlist();
      setWatchlist(res);
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

  const handleToggleStatus = async (item: WatchlistEntry) => {
    const nextStatus = item.status === 'active' ? 'disabled' : 'active';
    try {
      await api.updateWatchlistEntry(item.id, { status: nextStatus });
      addToast({
        type: nextStatus === 'active' ? 'alert' : 'info',
        title: 'Watchlist Status Updated',
        message: `Plate ${item.plateNumber} is now ${nextStatus.toUpperCase()}.`,
      });
      loadData();
    } catch {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Could not update watchlist record status.',
      });
    }
  };

  const filteredWatchlist = watchlist.filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.plateNumber.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q) ||
      item.caseId.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="watchlist-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header with Mandatory Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Watchlist Intelligence Registry</h1>
            {/* MANDATORY HACKATHON LABEL */}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
              Synthetic Demo Watchlist
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Active surveillance alerts for flagged registrations, stolen vehicles, and warrants.
          </p>
        </div>

        <button
          id="add-watchlist-btn"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Add Watchlist Entry
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by plate, case ID, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Categories</option>
            <option value="Stolen Vehicle">Stolen Vehicle</option>
            <option value="Wanted Suspect">Wanted Suspect</option>
            <option value="Traffic Violation">Traffic Violation</option>
            <option value="High Risk">High Risk</option>
            <option value="Unregistered">Unregistered</option>
          </select>
        </div>
      </div>

      {/* Watchlist Table */}
      {filteredWatchlist.length === 0 ? (
        <EmptyState
          icon="search"
          title="No Watchlist Records Found"
          description="There are no entries in the synthetic watchlist matching your criteria."
          actionLabel="Add Watchlist Record"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Registration Plate</th>
                  <th className="py-3.5 px-4">Category & Priority</th>
                  <th className="py-3.5 px-4">Case Reference & Reason</th>
                  <th className="py-3.5 px-4">Last Sighting</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredWatchlist.map((item, idx) => {
                  const isActive = item.status === 'active';
                  return (
                    <tr
                      key={`${item.id}-${idx}`}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!isActive ? 'opacity-60' : ''}`}
                    >
                      {/* Plate */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-sm px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 block w-fit shadow-xs">
                          {item.plateNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1 block">
                          Added: {item.dateAdded}
                        </span>
                      </td>

                      {/* Category & Priority */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">{item.category}</span>
                        <span
                          className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            item.priority === 'high'
                              ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30'
                              : item.priority === 'medium'
                              ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30'
                              : 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 dark:border-sky-500/30'
                          }`}
                        >
                          {item.priority} Priority
                        </span>
                      </td>

                      {/* Reason & Case */}
                      <td className="py-4 px-4 max-w-xs">
                        <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400 font-bold block">{item.caseId}</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2 mt-0.5">{item.reason}</p>
                      </td>

                      {/* Last sighting */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {item.lastSighting ? (
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200 block">{item.lastSighting.cameraName}</span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{item.lastSighting.timestamp}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">No active sighting</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSearchPlate(item.plateNumber)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700"
                            title="View All Sightings"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-500" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                              isActive
                                ? 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                            }`}
                          >
                            {isActive ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      <AddWatchlistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={async (entry) => {
          await api.addWatchlistEntry(entry);
          loadData();
        }}
      />
    </div>
  );
};
