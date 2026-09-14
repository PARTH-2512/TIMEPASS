import React, { useState } from 'react';
import { api } from '../lib/api';
import { soundManager } from '../lib/audio';
import { useToast } from '../lib/ToastContext';
import {
  Settings,
  Sliders,
  Volume2,
  Shield,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { addToast } = useToast();
  const currentThresholds = api.getThresholds();
  const [highThreshold, setHighThreshold] = useState(currentThresholds.high);
  const [mediumThreshold, setMediumThreshold] = useState(currentThresholds.medium);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [isOffline, setIsOffline] = useState(api.isOfflineSimulation());

  const handleSaveThresholds = () => {
    if (highThreshold <= mediumThreshold) {
      addToast({
        type: 'error',
        title: 'Invalid Threshold Range',
        message: 'High confidence threshold must be greater than medium threshold.',
      });
      return;
    }
    api.setThresholds({ high: Number(highThreshold), medium: Number(mediumThreshold) });
    addToast({
      type: 'success',
      title: 'Thresholds Updated',
      message: `Configured: High >= ${highThreshold}%, Medium >= ${mediumThreshold}%.`,
    });
  };

  const handleToggleSound = (enabled: boolean) => {
    soundManager.setEnabled(enabled);
    setSoundEnabled(enabled);
    if (enabled) {
      soundManager.playAlertChime('high');
      addToast({
        type: 'info',
        title: 'Sound Chimes Enabled',
        message: 'High-priority ANPR detections will trigger procedural audio chimes.',
      });
    }
  };

  const handleToggleOffline = (offline: boolean) => {
    api.setOfflineSimulation(offline);
    setIsOffline(offline);
    if (offline) {
      addToast({
        type: 'error',
        title: 'Simulated API Failure Active',
        message: 'Backend API requests will now return 503 to verify error states.',
      });
    } else {
      addToast({
        type: 'success',
        title: 'Backend Reconnected',
        message: 'Surveillance nodes restored to online state.',
      });
    }
  };

  return (
    <div id="settings-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          System Diagnostics & Operator Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Adjust ANPR inference thresholds, notification triggers, and demo failover simulations.
        </p>
      </div>

      {/* Confidence Threshold Configuration (Requirement 7) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-600 dark:text-sky-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Configurable Confidence Thresholds</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define the percentage cutoffs for High, Medium, and Low confidence badge classification.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              High Confidence Threshold (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="70"
                max="98"
                value={highThreshold}
                onChange={(e) => setHighThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 w-12 text-right">
                {highThreshold}%
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Detections at or above this value show "High confidence" (Green).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Medium Confidence Threshold (%)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="40"
                max="75"
                value={mediumThreshold}
                onChange={(e) => setMediumThreshold(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400 w-12 text-right">
                {mediumThreshold}%
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Detections between this and High show "Medium confidence" (Amber). Below is Low (Red).
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveThresholds}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            Apply & Save Thresholds
          </button>
        </div>
      </div>

      {/* Sound Alert Settings */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Alert Audio Chime Configuration</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Procedural dual-tone synthesizer for immediate auditory notice upon high-risk ANPR triggers.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">Operator Audio Chimes</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Play tone when incoming alerts or detections trigger.</span>
          </div>
          <button
            onClick={() => handleToggleSound(!soundEnabled)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              soundEnabled
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {soundEnabled ? 'Chimes Enabled' : 'Muted'}
          </button>
        </div>

        <button
          onClick={() => soundManager.playAlertChime('high')}
          className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-mono inline-flex items-center gap-1.5 font-bold"
        >
          <Zap className="w-3.5 h-3.5" /> Test Play High-Priority Chime
        </button>
      </div>

      {/* Demo Error Simulation Toggle (Requirement 10 & 14) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Hackathon Jury & Verification Controls</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test resilience to network timeouts, 503 backend failure, and demo alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Simulate Backend Offline (503)</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Simulates API disconnection to verify error state banners, message guidance, and retry buttons.
            </span>
          </div>
          <button
            onClick={() => handleToggleOffline(!isOffline)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isOffline
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isOffline ? 'Offline Mode Active' : 'Normal Online Mode'}
          </button>
        </div>
      </div>
    </div>
  );
};
