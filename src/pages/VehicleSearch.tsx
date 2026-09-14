import React, { useState, useEffect, useMemo } from 'react';
import { VehicleSighting, WatchlistEntry, Camera, Detection } from '../types';
import { api } from '../lib/api';
import {
  Search,
  ShieldAlert,
  MapPin,
  Clock,
  Car,
  History,
  AlertCircle,
  Eye,
  CheckCircle2,
  SlidersHorizontal,
  Calendar,
  Gauge,
  RotateCcw,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
} from 'lucide-react';
import { ConfidenceBadge } from '../components/ui/ConfidenceBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

interface VehicleSearchProps {
  initialPlate?: string;
  onViewRoute: (plate: string) => void;
  onOpenDetectionModal: (detectionId: string) => void;
}

type DatePreset = 'all' | 'today' | '24h' | '7d' | 'custom';

function parseSightingDate(ts: string): Date | null {
  if (!ts) return null;
  try {
    const sanitized = ts.replace(/Sept\b/i, 'Sep');
    const d = new Date(sanitized);
    if (!isNaN(d.getTime())) return d;
    return null;
  } catch {
    return null;
  }
}

export const VehicleSearch: React.FC<VehicleSearchProps> = ({
  initialPlate = '',
  onViewRoute,
  onOpenDetectionModal,
}) => {
  const [query, setQuery] = useState(initialPlate);
  const [searchedPlate, setSearchedPlate] = useState<string | null>(initialPlate || null);
  const [allSightings, setAllSightings] = useState<VehicleSighting[]>([]);
  const [allDetections, setAllDetections] = useState<Detection[]>([]);
  const [watchlistMatch, setWatchlistMatch] = useState<{
    entry: WatchlistEntry;
    matchType: 'exact' | 'possible';
    editDistance: number;
    similarityScore: number;
  } | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [minConfidenceScore, setMinConfidenceScore] = useState<number>(0);

  const [recentSearches, setRecentSearches] = useState<string[]>([
    'DL3CAM1234',
    'DL3CAM123A',
    'GJ05CD5678',
    'GJ01AB1234',
  ]);

  // Fetch available cameras for the location dropdown
  useEffect(() => {
    api.getCameras().then(setCameras).catch(() => {});
    api.getRecentDetections().then(setAllDetections).catch(() => {});
  }, []);

  const executeSearch = async (plateToSearch: string) => {
    const raw = plateToSearch.trim();
    if (!raw) {
      setFormatError('Please enter a vehicle registration number to search.');
      return;
    }

    const cleanPlate = raw.toUpperCase().replace(/\s+/g, '');
    if (cleanPlate.length < 4) {
      setFormatError('Invalid plate format. Plate number must contain at least 4 alphanumeric characters.');
      return;
    }

    setFormatError(null);
    setIsLoading(true);
    setHasSearched(true);
    setSearchedPlate(cleanPlate);

    // Add to recent searches
    setRecentSearches((prev) => Array.from(new Set([cleanPlate, ...prev])).slice(0, 6));

    try {
      const [sightingsRes, watchlistRes] = await Promise.all([
        api.getVehicleSightings(cleanPlate),
        api.getWatchlistFuzzyMatchForPlate(cleanPlate),
      ]);
      setAllSightings(sightingsRes);
      setWatchlistMatch(watchlistRes);
    } catch {
      setAllSightings([]);
      setWatchlistMatch(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialPlate) {
      executeSearch(initialPlate);
    }
  }, [initialPlate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeSearch(query);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedLocation('all');
    setConfidenceFilter('all');
    setMinConfidenceScore(0);
  };

  // Check if any filter is active
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (datePreset !== 'all') count++;
    if (selectedLocation !== 'all') count++;
    if (confidenceFilter !== 'all' || minConfidenceScore > 0) count++;
    return count;
  }, [datePreset, selectedLocation, confidenceFilter, minConfidenceScore]);

  // Date Filtering Logic
  const checkDateMatch = (timestamp: string): boolean => {
    if (datePreset === 'all') return true;
    const parsed = parseSightingDate(timestamp);
    if (!parsed) return true; // Keep if unparseable to avoid false negatives

    const now = new Date('2026-09-11T12:00:00'); // Baseline simulated reference time

    if (datePreset === 'today') {
      return (
        parsed.getFullYear() === now.getFullYear() &&
        parsed.getMonth() === now.getMonth() &&
        parsed.getDate() === now.getDate()
      );
    }
    if (datePreset === '24h') {
      const diffMs = now.getTime() - parsed.getTime();
      return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
    }
    if (datePreset === '7d') {
      const diffMs = now.getTime() - parsed.getTime();
      return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
    }
    if (datePreset === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate + 'T00:00:00');
        if (parsed < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate + 'T23:59:59');
        if (parsed > end) return false;
      }
      return true;
    }
    return true;
  };

  // Location Filtering Logic
  const checkLocationMatch = (cameraId: string, location: string): boolean => {
    if (selectedLocation === 'all') return true;
    return (
      cameraId.toLowerCase() === selectedLocation.toLowerCase() ||
      location.toLowerCase().includes(selectedLocation.toLowerCase())
    );
  };

  // Confidence Filtering Logic
  const checkConfidenceMatch = (detectionConf: number, ocrConf: number): boolean => {
    const avgScore = (detectionConf + ocrConf) / 2;
    if (minConfidenceScore > 0 && avgScore < minConfidenceScore) {
      return false;
    }
    if (confidenceFilter === 'high') {
      return detectionConf >= 85 && ocrConf >= 85;
    }
    if (confidenceFilter === 'medium') {
      return detectionConf >= 60 && ocrConf >= 60;
    }
    if (confidenceFilter === 'low') {
      return detectionConf < 60 || ocrConf < 60;
    }
    return true;
  };

  // Filtered sightings list for searched plate
  const filteredSightings = useMemo(() => {
    return allSightings.filter((s) => {
      const dateOk = checkDateMatch(s.timestamp);
      const locOk = checkLocationMatch(s.cameraId, s.location);
      const confOk = checkConfidenceMatch(s.detectionConfidence, s.ocrConfidence);
      return dateOk && locOk && confOk;
    });
  }, [allSightings, datePreset, customStartDate, customEndDate, selectedLocation, confidenceFilter, minConfidenceScore]);

  // Cross-network recent detections filtered by current filters (when exploring without plate)
  const filteredNetworkDetections = useMemo(() => {
    return allDetections.filter((d) => {
      const dateOk = checkDateMatch(d.timestamp);
      const locOk = checkLocationMatch(d.cameraId, d.location);
      const confOk = checkConfidenceMatch(d.detectionConfidence, d.ocrConfidence);
      return dateOk && locOk && confOk;
    });
  }, [allDetections, datePreset, customStartDate, customEndDate, selectedLocation, confidenceFilter, minConfidenceScore]);

  // First & Last seen timestamps from filtered sightings
  const firstSeen = filteredSightings.length > 0 ? filteredSightings[0].timestamp : null;
  const lastSeen = filteredSightings.length > 0 ? filteredSightings[filteredSightings.length - 1].timestamp : null;

  return (
    <div id="vehicle-search-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold">
            IVMAP Investigative Forensics
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          Vehicle ANPR Investigation & Multi-Criteria Search
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Query cross-camera sighting logs, spatial timeline tracks, and watchlist threat advisories with granular date, camera node, and confidence filters.
        </p>
      </div>

      {/* Search Input & Filter Controls Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="vehicle-plate-input"
              type="text"
              placeholder="Enter Registration Number (e.g. GJ05CD5678, GJ01AB1234)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (formatError) setFormatError(null);
              }}
              onKeyDown={handleKeyDown}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-sky-500 shadow-inner"
            />
          </div>

          <button
            id="vehicle-search-submit-btn"
            onClick={() => executeSearch(query)}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-all shadow-md shadow-sky-950/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
          >
            <Search className="w-4 h-4" />
            {isLoading ? 'Searching...' : 'Search Vehicle'}
          </button>

          {/* Toggle Advanced Filters Button */}
          <button
            id="toggle-advanced-filters-btn"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              showAdvancedFilters || activeFiltersCount > 0
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-sky-500" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Validation Warning */}
        {formatError && (
          <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {formatError}
          </div>
        )}

        {/* Advanced Filters Panel (Collapsible) */}
        {showAdvancedFilters && (
          <div
            id="advanced-filters-panel"
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sky-500" /> Advanced Filter Criteria
              </span>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Date Range Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  Date Range
                </label>
                <select
                  id="filter-date-range-select"
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium"
                >
                  <option value="all">All Available History</option>
                  <option value="today">Today Only (11 Sep 2026)</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="custom">Custom Date Range...</option>
                </select>

                {datePreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1.5">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">From Date</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">To Date</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Camera Location Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  Camera Node / Location
                </label>
                <select
                  id="filter-camera-location-select"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium"
                >
                  <option value="all">All Camera Locations ({cameras.length} Nodes)</option>
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 block">
                  Filter sightings through specific intersections or toll plazas.
                </span>
              </div>

              {/* 3. Detection & OCR Confidence Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-amber-500" />
                    Detection Confidence
                  </label>
                  {minConfidenceScore > 0 && (
                    <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400">
                      ≥ {minConfidenceScore}%
                    </span>
                  )}
                </div>

                <select
                  id="filter-confidence-preset-select"
                  value={confidenceFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setConfidenceFilter(val);
                    if (val === 'high') setMinConfidenceScore(85);
                    else if (val === 'medium') setMinConfidenceScore(60);
                    else if (val === 'low') setMinConfidenceScore(0);
                    else setMinConfidenceScore(0);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium"
                >
                  <option value="all">All Confidence Levels (0% - 100%)</option>
                  <option value="high">High Confidence Only (≥ 85%)</option>
                  <option value="medium">Medium & High (≥ 60%)</option>
                  <option value="low">Low Confidence (&lt; 60%)</option>
                </select>

                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Min:</span>
                  <input
                    type="range"
                    min="0"
                    max="95"
                    step="5"
                    value={minConfidenceScore}
                    onChange={(e) => {
                      setMinConfidenceScore(parseInt(e.target.value, 10));
                      setConfidenceFilter('custom');
                    }}
                    className="flex-1 accent-sky-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-500">{minConfidenceScore}%</span>
                </div>
              </div>
            </div>

            {/* Active Filter Pills Bar */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-500 text-[11px] font-medium">Active Filters:</span>
                {datePreset !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono text-[11px]">
                    Date: {datePreset.toUpperCase()}
                    <button onClick={() => setDatePreset('all')}>
                      <X className="w-3 h-3 hover:text-rose-500" />
                    </button>
                  </span>
                )}
                {selectedLocation !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-[11px]">
                    Node: {selectedLocation}
                    <button onClick={() => setSelectedLocation('all')}>
                      <X className="w-3 h-3 hover:text-rose-500" />
                    </button>
                  </span>
                )}
                {(confidenceFilter !== 'all' || minConfidenceScore > 0) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono text-[11px]">
                    Min Confidence: ≥ {minConfidenceScore}%
                    <button
                      onClick={() => {
                        setConfidenceFilter('all');
                        setMinConfidenceScore(0);
                      }}
                    >
                      <X className="w-3 h-3 hover:text-rose-500" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recent Searches Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <History className="w-3.5 h-3.5" /> Recent Searches:
          </span>
          {recentSearches.map((plate) => (
            <button
              key={plate}
              onClick={() => {
                setQuery(plate);
                executeSearch(plate);
              }}
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-white hover:border-sky-500 transition-colors shadow-xs"
            >
              {plate}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      )}

      {/* Default Prompt State when no plate searched yet */}
      {!hasSearched && !isLoading && (
        <div className="space-y-6">
          <EmptyState
            icon="search"
            title="Begin ANPR Investigation"
            description="Type a registration plate number above or click one of the suggested sample plates (e.g. GJ05CD5678) to view full ANPR sightings and track timeline."
          />

          {/* Quick Cross-Camera Vehicle Passes Explorer */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-sky-500" />
                  Recent Cross-Network Vehicle Passes ({filteredNetworkDetections.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live detection stream filtered by your active criteria. Click any plate to inspect.
                </p>
              </div>
              {activeFiltersCount > 0 && (
                <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                  Filters Active ({activeFiltersCount})
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredNetworkDetections.slice(0, 6).map((det, idx) => (
                <div
                  key={`${det.id}-${idx}`}
                  onClick={() => {
                    setQuery(det.plateNumber);
                    executeSearch(det.plateNumber);
                  }}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 cursor-pointer transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                      {det.plateNumber}
                    </span>
                    <ConfidenceBadge score={det.detectionConfidence} size="sm" />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{det.cameraName}</p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-2">
                    <span>{det.timestamp}</span>
                    <span className="text-sky-500 font-semibold group-hover:underline flex items-center gap-0.5">
                      Search <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Results Display */}
      {hasSearched && !isLoading && (
        <div className="space-y-6">
          {/* Result Count & Filter Match Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              Search Results for <strong className="font-mono text-slate-900 dark:text-white text-sm">{searchedPlate}</strong>:{' '}
              <span className="font-bold text-slate-900 dark:text-white">{filteredSightings.length}</span> of {allSightings.length} sightings match active filters.
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  ({activeFiltersCount} filters applied)
                </span>
                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold text-sky-600 hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {allSightings.length === 0 ? (
            /* Empty State for no records whatsoever */
            <EmptyState
              icon="sighting"
              title="No Sightings Recorded"
              description={`The vehicle registration ${searchedPlate} has not crossed any registered surveillance camera nodes in the active window.`}
            />
          ) : filteredSightings.length === 0 ? (
            /* Sightings exist, but filtered out by active filters */
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                No Sightings Match Filter Criteria
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {allSightings.length} sighting(s) exist for {searchedPlate}, but none match the current Date Range ({datePreset}), Camera Location ({selectedLocation}), or Min Confidence threshold ({minConfidenceScore}%).
              </p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filter Criteria
              </button>
            </div>
          ) : (
            <>
              {/* Vehicle Summary Result Card */}
              <div
                id="vehicle-summary-card"
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono font-black text-2xl tracking-wider text-slate-900 bg-white px-3.5 py-1 rounded-lg border-2 border-slate-300 shadow-md">
                        {searchedPlate}
                      </span>

                      {watchlistMatch?.matchType === 'exact' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Watchlist Matched ({watchlistMatch.entry.priority.toUpperCase()} RISK)
                        </span>
                      ) : watchlistMatch?.matchType === 'possible' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-mono">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Possible Match: Target {watchlistMatch.entry.plateNumber} ({watchlistMatch.similarityScore}%, {watchlistMatch.editDistance} char diff)
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Watchlist Status: Clear
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {watchlistMatch?.matchType === 'exact'
                        ? watchlistMatch.entry.reason
                        : watchlistMatch?.matchType === 'possible'
                        ? `Suspected OCR character fumble. Sighted plate '${searchedPlate}' is within 1 character distance of active watchlist target '${watchlistMatch.entry.plateNumber}'. Target advisory: ${watchlistMatch.entry.reason}`
                        : 'Vehicle verified clear against active municipal and law enforcement watchlist registries.'}
                    </p>
                  </div>

                  {/* Summary Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      id="summary-view-evidence-btn"
                      onClick={() => onViewRoute(searchedPlate!)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-colors active:scale-95"
                    >
                      <MapPin className="w-4 h-4" />
                      View Inferred Route on GIS
                    </button>
                  </div>
                </div>

                {/* Stat Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Matching Sightings</span>
                    <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                      {filteredSightings.length} Nodes
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">First Seen</span>
                    <span className="text-xs font-mono text-slate-800 dark:text-slate-200 font-semibold">{firstSeen}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Last Seen</span>
                    <span className="text-xs font-mono text-slate-800 dark:text-slate-200 font-semibold">{lastSeen}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Vehicle Type</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {filteredSightings[0]?.vehicleType || 'Sedan'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sightings Chronological History Table */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-500" />
                    Chronological Camera Sightings History ({filteredSightings.length})
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Time-ordered camera detection log
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredSightings.map((s, idx) => (
                    <div
                      key={`${s.id}-${idx}`}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Camera & location */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{s.cameraName}</span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">({s.cameraId})</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{s.location}</p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                            <span>Time: {s.timestamp}</span>
                            {s.speedKmh && <span>Speed: {s.speedKmh} km/h</span>}
                            {s.lane && <span>Lane: #{s.lane}</span>}
                            {s.aggregationAgreement && (
                              <span className="text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                                Consensus: {s.aggregationAgreement}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Confidence Badges & Evidence View */}
                      <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="flex flex-col items-end gap-1">
                          <ConfidenceBadge score={s.detectionConfidence} labelPrefix="Detection: " size="sm" />
                          <ConfidenceBadge score={s.ocrConfidence} labelPrefix="OCR: " size="sm" />
                        </div>

                        {s.evidenceUrl && (
                          <div
                            onClick={() => onOpenDetectionModal(s.id)}
                            className="w-16 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            title="Inspect Evidence Frame"
                          >
                            <img src={s.evidenceUrl} alt="Evidence" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
