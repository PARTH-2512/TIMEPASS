import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './lib/ToastContext';
import { ThemeProvider } from './lib/ThemeContext';
import { Sidebar, NavPage } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { VehicleSearch } from './pages/VehicleSearch';
import { AlertCentre } from './pages/AlertCentre';
import { GisMap } from './pages/GisMap';
import { WatchlistPage } from './pages/WatchlistPage';
import { CameraRegistry } from './pages/CameraRegistry';
import { SettingsPage } from './pages/SettingsPage';

import { CameraDetailModal } from './components/modals/CameraDetailModal';
import { AlertDetailModal } from './components/modals/AlertDetailModal';
import { DetectionDetailModal } from './components/modals/DetectionDetailModal';

import { api } from './lib/api';
import { Alert, Camera, Detection } from './types';

function AppContent() {
  const { addToast } = useToast();
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global store copies
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);

  // Modal states
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [activeDetectionId, setActiveDetectionId] = useState<string | null>(null);
  const [fetchedDetection, setFetchedDetection] = useState<Detection | null>(null);

  // Route & Search cross-navigation parameters
  const [searchInitialPlate, setSearchInitialPlate] = useState<string>('');
  const [gisSelectedCamId, setGisSelectedCamId] = useState<string | null>(null);
  const [gisSelectedPlate, setGisSelectedPlate] = useState<string | null>(null);

  // Load and subscribe to API store
  const refreshData = async () => {
    try {
      const [alts, cams, dets] = await Promise.all([
        api.getAlerts(),
        api.getCameras(),
        api.getRecentDetections(),
      ]);
      setAlerts(alts);
      setCameras(cams);
      setDetections(dets);
    } catch {
      // Handled inside views
    }
  };

  useEffect(() => {
    refreshData();
    const unsubStore = api.subscribe(() => {
      refreshData();
    });

    // Real-time toast notifications for all incoming alerts
    const unsubAlerts = api.subscribeAlerts((incomingAlert) => {
      addToast({
        type: 'alert',
        priority: incomingAlert.priority,
        alertType: incomingAlert.type,
        title: `${incomingAlert.priority.toUpperCase()} PRIORITY: ${incomingAlert.plateNumber || 'TARGET VEHICLE'}`,
        message: `${incomingAlert.type} at ${incomingAlert.cameraName} (${incomingAlert.confidence}% confidence). Review required.`,
        actionLabel: 'Inspect Evidence',
        onAction: () => {
          setActiveAlertId(incomingAlert.id);
        },
      });
    });

    return () => {
      unsubStore();
      unsubAlerts();
    };
  }, [addToast]);

  // Handlers for cross-page navigation
  const handleOpenAlert = (alertId: string) => {
    setActiveAlertId(alertId);
  };

  const handleOpenCamera = (cameraId: string) => {
    setActiveCameraId(cameraId);
  };

  const handleOpenDetection = async (detectionId: string) => {
    setActiveDetectionId(detectionId);
    const existing = detections.find((d) => d.id === detectionId);
    if (existing) {
      setFetchedDetection(existing);
    } else {
      setFetchedDetection(null);
      try {
        const found = await api.getDetection(detectionId);
        if (found) {
          setFetchedDetection(found);
        }
      } catch {
        // Handled silently
      }
    }
  };

  const handleSearchPlate = (plate: string) => {
    setSearchInitialPlate(plate);
    setActivePage('search');
    setActiveAlertId(null);
    setActiveDetectionId(null);
  };

  const handleViewRoute = (plate: string) => {
    setGisSelectedPlate(plate);
    setActivePage('gis');
    setActiveAlertId(null);
    setActiveDetectionId(null);
  };

  const handleOpenMapCamera = (cameraId: string) => {
    setGisSelectedCamId(cameraId);
    setActivePage('gis');
    setActiveCameraId(null);
  };

  const handleSimulateAlert = () => {
    api.simulateIncomingAlert();
  };

  const activeAlertsCount = alerts.filter(
    (a) => a.status === 'new' || a.status === 'under_review'
  ).length;

  const currentCamera = cameras.find((c) => c.id === activeCameraId) || null;
  const currentAlert = alerts.find((a) => a.id === activeAlertId) || null;
  const currentDetection =
    fetchedDetection || detections.find((d) => d.id === activeDetectionId) || null;

  return (
    <div className="flex h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Sidebar navigation */}
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => setActivePage(page)}
        activeAlertCount={activeAlertsCount}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TopBar with Notification Bell, Audio Switch, Simulate Alert, User Role, and Dark/Light Mode Switch */}
        <TopBar
          alerts={alerts}
          onOpenAlert={handleOpenAlert}
          onSimulateAlert={handleSimulateAlert}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Dynamic Page Router */}
        <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 transition-colors">
          {activePage === 'dashboard' && (
            <Dashboard
              onNavigate={(page) => setActivePage(page)}
              onOpenCamera={handleOpenCamera}
              onOpenAlert={handleOpenAlert}
              onOpenDetection={handleOpenDetection}
            />
          )}

          {activePage === 'monitoring' && (
            <LiveMonitoring
              onOpenCamera={handleOpenCamera}
              onOpenDetection={handleOpenDetection}
            />
          )}

          {activePage === 'search' && (
            <VehicleSearch
              initialPlate={searchInitialPlate}
              onViewRoute={handleViewRoute}
              onOpenDetectionModal={handleOpenDetection}
            />
          )}

          {activePage === 'alerts' && (
            <AlertCentre
              onOpenAlert={handleOpenAlert}
              onSearchPlate={handleSearchPlate}
              onViewRoute={handleViewRoute}
            />
          )}

          {activePage === 'gis' && (
            <GisMap
              selectedCameraId={gisSelectedCamId}
              selectedPlateRoute={gisSelectedPlate}
              onOpenCamera={handleOpenCamera}
              onOpenAlert={handleOpenAlert}
            />
          )}

          {activePage === 'watchlist' && (
            <WatchlistPage
              onSearchPlate={handleSearchPlate}
              onViewRoute={handleViewRoute}
            />
          )}

          {activePage === 'cameras' && (
            <CameraRegistry
              onOpenCamera={handleOpenCamera}
              onOpenMap={handleOpenMapCamera}
            />
          )}

          {activePage === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Reusable Global Modals */}
      <CameraDetailModal
        camera={currentCamera}
        alerts={alerts}
        detections={detections}
        onClose={() => setActiveCameraId(null)}
        onOpenMap={handleOpenMapCamera}
        onOpenAlert={handleOpenAlert}
        onOpenDetection={handleOpenDetection}
      />

      <AlertDetailModal
        alert={currentAlert}
        onClose={() => setActiveAlertId(null)}
        onSearchPlate={handleSearchPlate}
        onViewRoute={handleViewRoute}
      />

      <DetectionDetailModal
        detection={currentDetection}
        onClose={() => {
          setActiveDetectionId(null);
          setFetchedDetection(null);
        }}
        onSearchPlate={handleSearchPlate}
        onViewRoute={handleViewRoute}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
