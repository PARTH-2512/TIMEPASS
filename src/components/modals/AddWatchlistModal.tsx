import React, { useState } from 'react';
import { WatchlistEntry, AlertPriority } from '../../types';
import { X, PlusCircle, ShieldAlert } from 'lucide-react';
import { useToast } from '../../lib/ToastContext';

interface AddWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (entry: Omit<WatchlistEntry, 'id' | 'dateAdded'>) => Promise<void>;
}

export const AddWatchlistModal: React.FC<AddWatchlistModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const { addToast } = useToast();
  const [plateNumber, setPlateNumber] = useState('');
  const [category, setCategory] = useState<WatchlistEntry['category']>('Stolen Vehicle');
  const [priority, setPriority] = useState<AlertPriority>('high');
  const [reason, setReason] = useState('');
  const [caseId, setCaseId] = useState('');
  const [ownerNotes, setOwnerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim() || !reason.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Plate number and watchlist reason are required.',
      });
      return;
    }

    const cleanPlate = plateNumber.toUpperCase().replace(/\s+/g, '');
    setIsSubmitting(true);
    try {
      await onAdd({
        plateNumber: cleanPlate,
        category,
        priority,
        reason,
        caseId: caseId.trim() || `CASE-${cleanPlate.slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`,
        status: 'active',
        ownerNotes: ownerNotes.trim() || undefined,
      });

      addToast({
        type: 'success',
        title: 'Watchlist Entry Added',
        message: `Plate ${cleanPlate} registered into Synthetic Demo Watchlist.`,
      });
      onClose();
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to Add Entry',
        message: 'Surveillance database could not process the request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="add-watchlist-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        id="add-watchlist-modal"
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800/60 text-sky-600 dark:text-sky-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Add Watchlist Entry</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Synthetic Demo Watchlist Target Registry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vehicle Registration Plate Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GJ05CD5678"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono uppercase tracking-wider text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as WatchlistEntry['category'])}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Stolen Vehicle">Stolen Vehicle</option>
                <option value="Wanted Suspect">Wanted Suspect</option>
                <option value="Traffic Violation">Traffic Violation</option>
                <option value="High Risk">High Risk</option>
                <option value="Unregistered">Unregistered</option>
                <option value="Surveillance">Surveillance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AlertPriority)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Case / Reference ID</label>
            <input
              type="text"
              placeholder="e.g. CASE-GJ-2026-904"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Watchlist Reason *</label>
            <textarea
              required
              rows={2}
              placeholder="Reason for surveillance flag or warrant details..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Operator Directives / Notes</label>
            <input
              type="text"
              placeholder="e.g. Dispatch intercept unit immediately"
              value={ownerNotes}
              onChange={(e) => setOwnerNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {isSubmitting ? 'Saving...' : 'Add Watchlist Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
