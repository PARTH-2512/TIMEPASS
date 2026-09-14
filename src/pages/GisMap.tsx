// Source: Google Maps Platform Code Assist
import React, { useState, useEffect } from 'react';
import { Camera, Alert, VehicleRoutePoint } from '../types';
import { api } from '../lib/api';
import { useTheme } from '../lib/ThemeContext';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  ColorScheme,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import {
  Search,
  Layers,
  ZoomIn,
  ZoomOut,
  Info,
  Car,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface GisMapProps {
  selectedCameraId?: string | null;
  selectedPlateRoute?: string | null;
  onOpenCamera: (cameraId: string) => void;
  onOpenAlert: (alertId: string) => void;
}

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBek2gsHFoS62vnq_zB3zRWygAJnyIXdlU';

// Polyline component for vehicle inferred route on Google Map
const VehicleRoutePolyline: React.FC<{ routePoints: VehicleRoutePoint[] }> = ({ routePoints }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    if (routePoints.length > 1) {
      const path = routePoints.map((pt) => ({ lat: pt.latitude, lng: pt.longitude }));

      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#0284c7',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });

      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });

      return () => {
        polyline.setMap(null);
      };
    }
  }, [map, routePoints]);

  return null;
};

// Map Controller for external zoom, selection and pan
const MapController: React.FC<{
  selectedCamera: Camera | null;
  onMapReady?: () => void;
}> = ({ selectedCamera }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedCamera) return;
    map.panTo({ lat: selectedCamera.latitude, lng: selectedCamera.longitude });
    map.setZoom(16);
  }, [map, selectedCamera]);

  return null;
};

// Main GIS Map View Inside APIProvider
const GisMapContent: React.FC<GisMapProps> = ({
  selectedCameraId = null,
  selectedPlateRoute = null,
  onOpenCamera,
  onOpenAlert,
}) => {
  const { theme } = useTheme();
  const map = useMap();
  const apiLoadingStatus = useApiLoadingStatus();

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeRoutePlate, setActiveRoutePlate] = useState<string>(selectedPlateRoute || 'DL3CAM1234');
  const [routePoints, setRoutePoints] = useState<VehicleRoutePoint[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [customPlateInput, setCustomPlateInput] = useState('');
  const [showLegend, setShowLegend] = useState(true);

  // Fetch cameras and alerts from API store
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cams, alts] = await Promise.all([api.getGisCameras(), api.getGisAlerts()]);
        setCameras(cams);
        setAlerts(alts);
      } catch {
        // Handled
      }
    };
    fetchData();
  }, []);

  // Fetch route when activeRoutePlate changes
  useEffect(() => {
    if (activeRoutePlate) {
      api.getVehicleRoute(activeRoutePlate).then((pts) => {
        setRoutePoints(pts);
      });
    } else {
      setRoutePoints([]);
    }
  }, [activeRoutePlate]);

  // Handle passed initial plate
  useEffect(() => {
    if (selectedPlateRoute) {
      setActiveRoutePlate(selectedPlateRoute);
    }
  }, [selectedPlateRoute]);

  // Select camera if passed in props
  useEffect(() => {
    if (selectedCameraId && cameras.length > 0) {
      const cam = cameras.find((c) => c.id === selectedCameraId);
      if (cam) {
        setSelectedCamera(cam);
        const relatedAlert = alerts.find((a) => a.cameraId === cam.id) || null;
        setSelectedAlert(relatedAlert);
      }
    }
  }, [selectedCameraId, cameras, alerts]);

  const handleZoomIn = () => {
    if (!map) return;
    const currentZoom = map.getZoom() ?? 13;
    map.setZoom(currentZoom + 1);
  };

  const handleZoomOut = () => {
    if (!map) return;
    const currentZoom = map.getZoom() ?? 13;
    map.setZoom(currentZoom - 1);
  };

  const handleSearchLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchLocation.trim() || !map) return;
    const match = cameras.find(
      (c) =>
        c.name.toLowerCase().includes(searchLocation.toLowerCase()) ||
        c.location.toLowerCase().includes(searchLocation.toLowerCase()) ||
        c.id.toLowerCase().includes(searchLocation.toLowerCase())
    );
    if (match) {
      setSelectedCamera(match);
      const relatedAlert = alerts.find((a) => a.cameraId === match.id) || null;
      setSelectedAlert(relatedAlert);
      map.panTo({ lat: match.latitude, lng: match.longitude });
      map.setZoom(16);
    }
  };

  const handleCustomPlateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPlateInput.trim()) {
      setActiveRoutePlate(customPlateInput.trim().toUpperCase());
      setCustomPlateInput('');
    }
  };

  return (
    <div id="gis-map-page" className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search & Location Bar */}
        <form
          onSubmit={handleSearchLocation}
          className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl w-full sm:w-80"
        >
          <Search className="w-4 h-4 text-slate-400 ml-2.5" />
          <input
            id="gis-search-location-input"
            type="text"
            placeholder="Find camera or junction..."
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            className="w-full px-2 py-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-xs"
          >
            Locate
          </button>
        </form>

        {/* Route Vehicle Picker & KPI Counters */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="p-2 px-3 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-600 dark:text-slate-400">
              Cameras: <strong className="text-emerald-600 dark:text-emerald-400">{cameras.length}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-600 dark:text-slate-400">
              Alerts: <strong className="text-rose-600 dark:text-rose-400">{alerts.length}</strong>
            </span>
          </div>

          <button
            onClick={() => setShowLegend(!showLegend)}
            className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xl text-xs flex items-center gap-1.5 font-medium"
            title="Toggle Map Marker Legend"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Legend</span>
          </button>
        </div>
      </div>

      {/* Floating Zoom Controls */}
      <div className="absolute right-4 top-24 z-20 flex flex-col gap-1.5">
        <button
          id="map-zoom-in-btn"
          onClick={handleZoomIn}
          className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          id="map-zoom-out-btn"
          onClick={handleZoomOut}
          className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* API Key Failure / Warning Banner */}
      {apiLoadingStatus === APILoadingStatus.FAILED && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 max-w-lg w-full px-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/90 border border-amber-300 dark:border-amber-700 shadow-2xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Google Maps API Notice</p>
              <p className="mt-1 leading-relaxed text-[11px]">
                The Google Maps JavaScript API could not initialize with key <code className="font-mono bg-amber-200/50 dark:bg-amber-900/50 px-1 py-0.5 rounded text-[10px]">{GOOGLE_MAPS_API_KEY.slice(0, 10)}...</code>. Please verify that the <strong>Maps JavaScript API</strong> is enabled in your Google Cloud Console and that HTTP referrer restrictions allow this preview domain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Marker Legend Box */}
      {showLegend && (
        <div
          id="map-marker-legend"
          className="absolute left-4 bottom-5 z-20 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-2 max-w-xs"
        >
          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white mb-2">
            <span>Camera & Alert Legend</span>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-bold">Google Maps</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
            <span>Green = Online Camera</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <span className="w-3 h-3 rounded-full bg-slate-500 shadow-xs" />
            <span>Grey = Offline Camera</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs animate-pulse" />
            <span>Red = Active Alert Node</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
            <span>Yellow = Caution / Warning</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <span className="w-3 h-3 rounded-full bg-sky-500 shadow-xs" />
            <span>Blue = Vehicle Route Sighting</span>
          </div>
        </div>
      )}

      {/* Vehicle Route Visualizer Banner - Bottom Right */}
      {routePoints.length > 0 && (
        <div
          id="inferred-route-panel"
          className="absolute right-4 bottom-5 z-20 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full"
        >
          <div className="flex flex-col gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">{activeRoutePlate}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20">
                  {routePoints.length} TRAVERSAL NODES
                </span>
              </div>
              {/* Vehicle Route Quick Select */}
              <div className="flex items-center gap-1 text-[11px] font-mono">
                <button
                  onClick={() => setActiveRoutePlate('DL3CAM1234')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    activeRoutePlate === 'DL3CAM1234'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Suspect Vehicle DL3CAM1234"
                >
                  DL3C (Suspect)
                </button>
                <button
                  onClick={() => setActiveRoutePlate('GJ05CD5678')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    activeRoutePlate === 'GJ05CD5678'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  GJ05
                </button>
                <button
                  onClick={() => setActiveRoutePlate('GJ01AB1234')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    activeRoutePlate === 'GJ01AB1234'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  GJ01
                </button>
              </div>
            </div>

            {/* Custom Plate Quick Input */}
            <form onSubmit={handleCustomPlateSubmit} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Track any plate (e.g. DL3CAM1234)..."
                value={customPlateInput}
                onChange={(e) => setCustomPlateInput(e.target.value)}
                className="w-full px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600 transition-colors"
              >
                Track
              </button>
            </form>
          </div>

          {/* REQUIRED LABEL: Inferred route from camera sightings */}
          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 text-[11px] text-sky-700 dark:text-sky-300 font-medium mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
              <span>Inferred route from camera sightings</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Click node to focus
            </span>
          </div>

          {/* Sequence Steps */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {routePoints.map((pt) => (
              <div
                key={pt.order}
                onClick={() => {
                  const cam = cameras.find((c) => c.id.toLowerCase() === pt.cameraId.toLowerCase());
                  if (cam && map) {
                    setSelectedCamera(cam);
                    map.panTo({ lat: pt.latitude, lng: pt.longitude });
                    map.setZoom(16);
                  }
                }}
                className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-sky-600 group-hover:bg-sky-500 text-white font-mono font-bold flex items-center justify-center text-[11px] shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    {pt.order}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs leading-tight">
                      {pt.cameraName}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {pt.cameraId} &bull; {pt.location}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    {pt.timestamp.split(', ')[1] || pt.timestamp}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="text-sky-600 dark:text-sky-400 font-bold">{pt.speedKmh} km/h</span>
                    <span>&bull;</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{pt.plateConfidence.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Node Popup Card */}
      {selectedCamera && (
        <div
          id="selected-camera-popup"
          className="absolute top-20 left-4 z-20 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xs text-xs"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{selectedCamera.name}</h4>
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedCamera.status === 'online'
                      ? 'bg-emerald-500'
                      : selectedCamera.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{selectedCamera.id}</p>
            </div>
            <button
              onClick={() => setSelectedCamera(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 text-base leading-none"
            >
              &times;
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] mb-3">{selectedCamera.location}</p>

          <div className="flex gap-2">
            <button
              onClick={() => onOpenCamera(selectedCamera.id)}
              className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] shadow-xs"
            >
              Open Stream
            </button>
            {selectedAlert && (
              <button
                onClick={() => onOpenAlert(selectedAlert.id)}
                className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] shadow-xs"
              >
                Inspect Alert
              </button>
            )}
          </div>
        </div>
      )}

      {/* Google Maps Container */}
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={{ lat: 23.0338, lng: 72.585 }}
        defaultZoom={13}
        mapId="DEMO_MAP_ID"
        colorScheme={theme === 'dark' ? ColorScheme.DARK : ColorScheme.LIGHT}
        disableDefaultUI={true}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      >
        <MapController selectedCamera={selectedCamera} />
        <VehicleRoutePolyline routePoints={routePoints} />

        {cameras.map((cam) => {
          const hasActiveAlert = alerts.some((a) => a.cameraId.toLowerCase() === cam.id.toLowerCase());
          const cleanCamId = cam.id.toLowerCase().replace(/[^a-z0-9]/g, '');
          const routePt = routePoints.find(
            (pt) =>
              pt.cameraId.toLowerCase() === cam.id.toLowerCase() ||
              pt.cameraId.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanCamId
          );
          const isRoutePoint = !!routePt;

          let markerBg = 'bg-emerald-500';
          if (cam.status === 'offline') markerBg = 'bg-slate-500';
          if (cam.status === 'warning') markerBg = 'bg-amber-500';
          if (hasActiveAlert) markerBg = 'bg-rose-500 animate-pulse';
          if (isRoutePoint) markerBg = 'bg-sky-600';

          const sizeClass = isRoutePoint || hasActiveAlert ? 'w-8 h-8 text-xs' : 'w-7 h-7 text-[10px]';

          return (
            <AdvancedMarker
              key={cam.id}
              position={{ lat: cam.latitude, lng: cam.longitude }}
              title={`${cam.name} (${cam.id})${isRoutePoint ? ` - Route Node #${routePt.order}` : ''}`}
              onClick={() => {
                setSelectedCamera(cam);
                const relatedAlert = alerts.find((a) => a.cameraId.toLowerCase() === cam.id.toLowerCase()) || null;
                setSelectedAlert(relatedAlert);
              }}
            >
              <div
                className={`${markerBg} ${sizeClass} rounded-full flex items-center justify-center text-white font-mono font-bold border-2 border-white shadow-lg cursor-pointer transform hover:scale-110 transition-transform`}
              >
                {isRoutePoint ? routePt?.order : hasActiveAlert ? '!' : 'CAM'}
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>
    </div>
  );
};

// Top-level exported component wrapped with APIProvider
export const GisMap: React.FC<GisMapProps> = (props) => {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} solutionChannel="GMP_aistudio">
      <GisMapContent {...props} />
    </APIProvider>
  );
};
