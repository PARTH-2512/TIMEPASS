import React, { useState, useRef, useEffect } from 'react';
import { Alert } from '../../types';
import { soundManager } from '../../lib/audio';
import { useTheme } from '../../lib/ThemeContext';
import {
  Bell,
  Volume2,
  VolumeX,
  Zap,
  Menu,
  ShieldAlert,
  User,
  LogOut,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';

interface TopBarProps {
  alerts: Alert[];
  onOpenAlert: (alertId: string) => void;
  onSimulateAlert: () => void;
  onToggleMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  alerts,
  onOpenAlert,
  onSimulateAlert,
  onToggleMobileMenu,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    soundManager.setEnabled(next);
    setSoundEnabled(next);
    if (next) soundManager.playSuccessTone();
  };

  const activeAlerts = alerts.filter((a) => a.status === 'new' || a.status === 'under_review');
  const highPriorityCount = activeAlerts.filter((a) => a.priority === 'high').length;

  return (
    <header
      id="app-topbar"
      className="h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors"
    >
      {/* Left: Mobile menu toggle + Live Status */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          id="mobile-menu-toggle"
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">IVMAP Unified Surveillance Node</span>
          <span className="text-[10px] text-slate-400 font-mono">| 4K Optical Feed</span>
        </div>
      </div>

      {/* Right: Actions, Theme Toggle, Sound, Notification Center, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Simulate Alert Button */}
        <button
          id="simulate-alert-btn"
          onClick={onSimulateAlert}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-950/20 transition-all active:scale-95"
          title="Simulate incoming ANPR alert detection"
        >
          <Zap className="w-3.5 h-3.5 animate-bounce" />
          <span className="hidden md:inline">Simulate Alert</span>
          <span className="md:hidden">Simulate</span>
        </button>

        {/* Dark / Light Theme Toggle Button */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-amber-400 transition-colors shadow-xs"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-200" />
          )}
        </button>

        {/* Audio Alert Toggle */}
        <button
          id="toggle-sound-btn"
          onClick={handleToggleSound}
          className={`p-2 rounded-xl border transition-colors shadow-xs ${
            soundEnabled
              ? 'bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-slate-700 hover:bg-sky-100'
              : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-600'
          }`}
          title={soundEnabled ? 'Alert Sound Chime: ON' : 'Alert Sound Chime: MUTED'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Live Alert Notification Bell & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            id="notifications-bell-btn"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={`relative p-2 rounded-xl border transition-colors shadow-xs ${
              activeAlerts.length > 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            aria-label="Alert Notifications"
          >
            <Bell className={`w-4 h-4 ${activeAlerts.length > 0 ? 'animate-wiggle' : ''}`} />
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {activeAlerts.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notificationsOpen && (
            <div
              id="notifications-dropdown-menu"
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Alert Notifications
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {activeAlerts.length} Active
                  </span>
                </div>
                {highPriorityCount > 0 && (
                  <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                    {highPriorityCount} High Priority
                  </span>
                )}
              </div>

              {/* Alert Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {alerts.slice(0, 6).map((alert, idx) => (
                  <div
                    key={`${alert.id}-${idx}`}
                    onClick={() => {
                      onOpenAlert(alert.id);
                      setNotificationsOpen(false);
                    }}
                    className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                      alert.status === 'new' ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            alert.priority === 'high'
                              ? 'bg-rose-500 animate-ping'
                              : alert.priority === 'medium'
                              ? 'bg-amber-500'
                              : 'bg-sky-500'
                          }`}
                        />
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {alert.plateNumber || 'TARGET ALERT'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                          {alert.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 truncate">{alert.type}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{alert.cameraName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono block">{alert.timestamp}</span>
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium inline-flex items-center gap-0.5 mt-2">
                        Inspect <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Click any alert to inspect evidence, sightings, and review status.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Role & Security Header */}
        <div className="relative" ref={userRef}>
          <button
            id="user-profile-btn"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-sky-900/60 border border-sky-500/20 dark:border-sky-700/60 flex items-center justify-center text-sky-600 dark:text-sky-300 font-bold text-xs">
              OP
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-white block leading-tight">Operator #402</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Traffic Intel Unit</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <div
              id="user-dropdown-menu"
              className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 text-xs"
            >
              <div className="border-b border-slate-200 dark:border-slate-800 pb-2.5 mb-2">
                <p className="font-semibold text-slate-900 dark:text-white">Officer V. Patel</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Role: Senior ANPR Operator</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active Clearance: Level 4
                </p>
              </div>
              <div className="py-1 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Surveillance session is protected by role-based operator token. All action audit logs are cryptographically signed.
              </div>
              <button
                onClick={() => setUserMenuOpen(false)}
                className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors font-medium text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                Simulate Session Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
