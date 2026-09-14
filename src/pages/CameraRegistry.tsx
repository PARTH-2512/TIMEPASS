import React, { useState, useEffect } from 'react';
import { Camera, CameraStatus } from '../types';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import {
  Camera as CameraIcon,
  Video,
  MapPin,
  Activity,
  Eye,
  Search,
  SlidersHorizontal,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building,
} from 'lucide-react';
import { AddEditCameraModal } from '../components/modals/AddEditCameraModal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

interface CameraRegistryProps {
  onOpenCamera: (cameraId: string) => void;
  onOpenMap: (cameraId: string) => void;
}

export const CameraRegistry: React.FC<CameraRegistryProps> = ({
  onOpenCamera,
  onOpenMap,
}) => {
  const { addToast } = useToast();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');

  // Modal controls
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

  const loadCameras = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCameras();
      setCameras(data);
    } catch {
      addToast({
        type: 'error',
        title: 'Registry Sync Error',
        message: 'Failed to retrieve registered surveillance nodes.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncFromGrid = async () => {
    try {
      const res = await fetch('/api/live-grid/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        addToast({
          type: 'success',
          title: 'Grid Sync Complete',
          message: `Upserted ${data.synced} of ${data.total} cameras from live grid catalogue.`,
        });
        await loadCameras();
      } else {
        addToast({
          type: 'error',
          title: 'Grid Sync Failed',
          message: data.error || 'Could not reach the CCTV grid. Check CCTV_GRID_HOST in .env.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Grid Sync Error',
        message: 'Network error contacting the grid sync endpoint.',
      });
    }
  };

  useEffect(() => {
    loadCameras();
    const unsub = api.subscribe(() => {
      api.getCameras().then(setCameras).catch(() => {});
    });

    // Poll /api/live-grid/cameras every 20 s to keep status/fps/codec live.
    // We read the catalogue via the proxy (server-side caching prevents hammer).
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/live-grid/cameras');
        if (res.ok) {
          // Catalogue fetched — refresh local camera list to get updated fields.
          const data = await api.getCameras();
          setCameras(data);
        }
      } catch {
        // Silent — polling errors are transient and non-fatal
      }
    }, 20_000);

    return () => {
      unsub();
      clearInterval(pollInterval);
    };
  }, []);

  const handleOpenAdd = () => {
    setSelectedCamera(null);
    setModalMode('add');
    setModalOpen(true);
  };

  const handleOpenEdit = (cam: Camera) => {
    setSelectedCamera(cam);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleSaveCamera = async (cameraData: Omit<Camera, 'id'> & { id?: string }) => {
    if (modalMode === 'add') {
      const created = await api.addCamera(cameraData);
      addToast({
        type: 'success',
        title: 'Camera Registered',
        message: `Optical node ${created.id} (${created.name}) successfully registered into IVMAP.`,
      });
    } else if (modalMode === 'edit' && selectedCamera) {
      const updated = await api.updateCamera(selectedCamera.id, cameraData);
      addToast({
        type: 'success',
        title: 'Camera Updated',
        message: `Surveillance node ${updated.id} configuration updated successfully.`,
      });
    }
    await loadCameras();
  };

  const handleDeleteCamera = async (cam: Camera) => {
    if (window.confirm(`Are you sure you want to decommission camera node ${cam.id} (${cam.name})?`)) {
      try {
        await api.deleteCamera(cam.id);
        addToast({
          type: 'info',
          title: 'Camera Decommissioned',
          message: `Camera node ${cam.id} has been removed from active topology.`,
        });
        await loadCameras();
      } catch {
        addToast({
          type: 'error',
          title: 'Decommission Failed',
          message: `Failed to remove camera ${cam.id}.`,
        });
      }
    }
  };

  // Get distinct vendors for filter
  const vendors = Array.from(new Set(cameras.map((c) => c.vendor).filter(Boolean))) as string[];

  const filtered = cameras.filter((cam) => {
    const matchesStatus = statusFilter === 'all' || cam.status === statusFilter;
    const matchesVendor = vendorFilter === 'all' || cam.vendor === vendorFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      cam.name.toLowerCase().includes(q) ||
      cam.id.toLowerCase().includes(q) ||
      cam.location.toLowerCase().includes(q) ||
      (cam.vendor && cam.vendor.toLowerCase().includes(q));
    return matchesStatus && matchesVendor && matchesSearch;
  });

  const onlineCount = cameras.filter((c) => c.status === 'online').length;
  const warningCount = cameras.filter((c) => c.status === 'warning').length;
  const offlineCount = cameras.filter((c) => c.status === 'offline').length;
  const totalDetectionsCount = cameras.reduce((acc, c) => acc + (c.totalDetections || 0), 0);

  return (
    <div id="camera-registry-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold">
              IVMAP Topology Engine
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Camera Registry & Optical Nodes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Central repository of registered CCTV hardware, optical specs, RTSP endpoints, and network heartbeats.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-cameras-btn"
            onClick={loadCameras}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-xs"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-500' : ''}`} />
          </button>
          <button
            id="sync-from-grid-btn"
            onClick={syncFromGrid}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/20 transition-all flex items-center gap-2 active:scale-95"
            title="Pull latest cameras from the live CCTV grid catalogue"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync from Grid</span>
          </button>
          <button
            id="register-new-camera-btn"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-950/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Camera</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Cameras */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Total Cameras</span>
            <CameraIcon className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {cameras.length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Registered edge nodes</span>
        </div>

        {/* Online Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Online</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {onlineCount}
          </div>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
            {cameras.length > 0 ? Math.round((onlineCount / cameras.length) * 100) : 0}% network health
          </span>
        </div>

        {/* Warning / Offline */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Degraded / Offline</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {warningCount + offlineCount}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {warningCount} warning, {offlineCount} offline
          </span>
        </div>

        {/* Detections Counter */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Total Logged Passes</span>
            <Activity className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {totalDetectionsCount.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Cumulative ANPR passes</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="camera-search-input"
            placeholder="Search by camera name, ID (e.g. CAM-001), location, or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Status:
            </span>
            <select
              id="camera-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="online">Online Only</option>
              <option value="warning">Warning / Jitter</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          {/* Vendor Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <Building className="w-3.5 h-3.5" /> Vendor:
            </span>
            <select
              id="camera-vendor-filter"
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium max-w-[170px]"
            >
              <option value="all">All Vendors</option>
              {vendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || statusFilter !== 'all' || vendorFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setVendorFilter('all');
              }}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon="camera"
          title="No Cameras Found"
          description={
            searchQuery || statusFilter !== 'all' || vendorFilter !== 'all'
              ? 'No registered surveillance nodes match your active query or filters.'
              : 'No cameras have been registered into the IVMAP topology yet.'
          }
          actionLabel="Register Camera Node"
          onAction={handleOpenAdd}
        />
      )}

      {/* Table of Cameras */}
      {!isLoading && filtered.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Node ID & Name</th>
                  <th className="py-3.5 px-4">Location & Coordinates</th>
                  <th className="py-3.5 px-4">Vendor & Optical Specs</th>
                  <th className="py-3.5 px-4">Status & Heartbeat</th>
                  <th className="py-3.5 px-4">Uptime & Detections</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((cam) => {
                  const isOnline = cam.status === 'online';
                  const isWarning = cam.status === 'warning';
                  const isOffline = cam.status === 'offline';

                  return (
                    <tr
                      key={cam.id}
                      id={`camera-row-${cam.id}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Node ID and Name */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                            <Video className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">
                              {cam.name}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
                              {cam.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Location & GPS */}
                      <td className="py-4 px-4">
                        <span className="text-slate-800 dark:text-slate-200 font-medium block line-clamp-1">
                          {cam.location}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {cam.latitude.toFixed(4)} N, {cam.longitude.toFixed(4)} E
                        </span>
                      </td>

                      {/* Vendor & Specs */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="text-slate-800 dark:text-slate-200 font-bold block">
                          {cam.vendor || 'Generic RTSP'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {cam.resolution || '4K UHD'} @ {cam.fps || 30}fps
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOnline
                                ? 'bg-emerald-500 animate-pulse'
                                : isWarning
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span
                            className={`font-bold capitalize text-xs ${
                              isOnline
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isWarning
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {cam.status}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 block">
                          {cam.lastHeartbeat || 'Active'}
                        </span>
                      </td>

                      {/* Uptime and Total Detections */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="text-slate-800 dark:text-slate-200 font-bold font-mono block">
                          {cam.uptime || '99.9%'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {(cam.totalDetections || 0).toLocaleString()} detections
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details / Feed */}
                          <button
                            id={`view-camera-btn-${cam.id}`}
                            onClick={() => onOpenCamera(cam.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 shadow-xs"
                            title="Inspect Live Stream & Optical Telemetry"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-500" />
                            <span>Details</span>
                          </button>

                          {/* Edit Camera */}
                          <button
                            id={`edit-camera-btn-${cam.id}`}
                            onClick={() => handleOpenEdit(cam)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 shadow-xs"
                            title="Edit Camera Configuration"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Edit</span>
                          </button>

                          {/* Map */}
                          <button
                            id={`map-camera-btn-${cam.id}`}
                            onClick={() => onOpenMap(cam.id)}
                            className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 transition-colors"
                            title="Locate on GIS Surveillance Map"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete / Decommission */}
                          <button
                            id={`delete-camera-btn-${cam.id}`}
                            onClick={() => handleDeleteCamera(cam)}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 transition-colors"
                            title="Decommission Camera"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Camera Modal */}
      <AddEditCameraModal
        isOpen={modalOpen}
        mode={modalMode}
        camera={selectedCamera}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCamera}
      />
    </div>
  );
};
