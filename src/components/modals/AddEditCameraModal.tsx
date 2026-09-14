import React, { useState, useEffect } from 'react';
import { Camera, CameraStatus } from '../../types';
import { X, Camera as CameraIcon, Check, AlertCircle, Video, MapPin, Cpu, HelpCircle, Radio } from 'lucide-react';
import { LiveStreamGuideModal } from './LiveStreamGuideModal';

interface AddEditCameraModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  camera: Camera | null;
  onClose: () => void;
  onSave: (cameraData: Omit<Camera, 'id'> & { id?: string }) => Promise<void>;
}

const COMMON_VENDORS = [
  'Axis Communications',
  'Hikvision',
  'Dahua Technology',
  'Hanwha Vision',
  'Bosch Security Systems',
  'Uniview',
  'Pelco',
  'Sony Professional',
];

const COMMON_RESOLUTIONS = [
  '4K UHD (3840x2160)',
  '2K QHD (2560x1440)',
  '1080p Full HD (1920x1080)',
  '720p HD (1280x720)',
];

export const AddEditCameraModal: React.FC<AddEditCameraModalProps> = ({
  isOpen,
  mode,
  camera,
  onClose,
  onSave,
}) => {
  const [cameraId, setCameraId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [vendor, setVendor] = useState('Axis Communications');
  const [status, setStatus] = useState<CameraStatus>('online');
  const [resolution, setResolution] = useState('4K UHD (3840x2160)');
  const [fps, setFps] = useState('30');
  const [latitude, setLatitude] = useState('21.1702');
  const [longitude, setLongitude] = useState('72.8311');
  const [streamUrl, setStreamUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (mode === 'edit' && camera) {
        setCameraId(camera.id);
        setName(camera.name);
        setLocation(camera.location);
        setVendor(camera.vendor || 'Axis Communications');
        setStatus(camera.status);
        setResolution(camera.resolution || '4K UHD (3840x2160)');
        setFps(String(camera.fps || 30));
        setLatitude(String(camera.latitude));
        setLongitude(String(camera.longitude));
        setStreamUrl(camera.streamUrl || `rtsp://surveillance.ivmap.net:554/stream/${camera.id.toLowerCase()}`);
      } else {
        // Reset to default new camera values
        setCameraId('');
        setName('');
        setLocation('');
        setVendor('Axis Communications');
        setStatus('online');
        setResolution('4K UHD (3840x2160)');
        setFps('30');
        setLatitude('21.1850');
        setLongitude('72.8250');
        setStreamUrl('');
      }
    }
  }, [isOpen, mode, camera]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a descriptive name for this camera node.');
      return;
    }
    if (!location.trim()) {
      setError('Please specify the physical location or intersection.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setError('Valid latitude and longitude numerical coordinates are required.');
      return;
    }

    const fpsNum = parseInt(fps, 10) || 30;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        id: cameraId.trim() || undefined,
        name: name.trim(),
        location: location.trim(),
        vendor: vendor.trim(),
        status,
        resolution,
        fps: fpsNum,
        latitude: latNum,
        longitude: lngNum,
        streamUrl: streamUrl.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save camera node.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="camera-add-edit-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <CameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mode === 'add' ? 'Register New Camera Node' : `Edit Camera Node: ${camera?.id}`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure optical parameters, RTSP streaming endpoint, and physical topology.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Camera Node ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Camera ID {mode === 'add' && <span className="text-slate-400 font-normal">(Leave blank to auto-generate)</span>}
              </label>
              <input
                type="text"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value.toUpperCase())}
                disabled={mode === 'edit'}
                placeholder="e.g. CAM-009"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>

            {/* Operational Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CameraStatus)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="online">Online (Active Feed)</option>
                <option value="warning">Warning / High Jitter</option>
                <option value="offline">Offline / Standby</option>
              </select>
            </div>

            {/* Camera Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Camera Node Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Athwa Gate Junction Inbound"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Location */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Physical Location / Crossroad *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Athwa Gate Crossroad, South Ingress, Surat"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Optical Hardware Vendor
              </label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              >
                {COMMON_VENDORS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sensor Resolution
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              >
                {COMMON_RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Latitude */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GPS Latitude
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="21.1702"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Longitude */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GPS Longitude
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="72.8311"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Frame Rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Capture Frame Rate (FPS)
              </label>
              <select
                value={fps}
                onChange={(e) => setFps(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              >
                <option value="25">25 FPS (PAL Standard)</option>
                <option value="30">30 FPS (NTSC High Traffic)</option>
                <option value="60">60 FPS (Ultra Smooth Highway)</option>
              </select>
            </div>

            {/* RTSP Stream URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ingress Stream URI (HLS, RTSP, or MP4)
                </label>
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <HelpCircle className="w-3 h-3" />
                  Live Stream Setup Guide
                </button>
              </div>
              <input
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://.../stream.m3u8, rtsp://..., or mp4 URL"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Supports direct browser HLS (<code>.m3u8</code>), MP4/WebM video feeds, or hardware RTSP bridged through MediaMTX / WebRTC.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-950/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting
                ? 'Saving...'
                : mode === 'add'
                ? 'Register Camera Node'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <LiveStreamGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};
