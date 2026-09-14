import React from 'react';
import {
  LayoutDashboard,
  Video,
  Search,
  ShieldAlert,
  MapPin,
  Bookmark,
  Camera as CameraIcon,
  Settings,
  Shield,
  Activity,
  Cpu,
} from 'lucide-react';

export type NavPage =
  | 'dashboard'
  | 'monitoring'
  | 'search'
  | 'alerts'
  | 'gis'
  | 'watchlist'
  | 'cameras'
  | 'settings';

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  activeAlertCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  activeAlertCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems: {
    id: NavPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Live Monitoring', icon: Video, badge: '8 Cams', badgeColor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300' },
    { id: 'search', label: 'Vehicle Search', icon: Search },
    {
      id: 'alerts',
      label: 'Alert Centre',
      icon: ShieldAlert,
      badge: activeAlertCount > 0 ? activeAlertCount : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse font-bold',
    },
    { id: 'gis', label: 'GIS Map', icon: MapPin },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
    { id: 'cameras', label: 'Camera Registry', icon: CameraIcon, badge: 'Nodes', badgeColor: 'bg-sky-500/20 text-sky-600 dark:text-sky-300' },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 shrink-0 flex flex-col bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-sky-950/20 font-black text-xs tracking-wider">
            IVMAP
          </div>
          <div className="min-w-0">
            <span className="font-black text-sm tracking-wide text-slate-900 dark:text-white block truncate">
              IVMAP
            </span>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold tracking-wider block uppercase">
              Unified CCTV Intel
            </span>
          </div>
        </div>

        {/* Platform Identity Notice */}
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300 text-[11px] flex items-center gap-2">
          <Cpu className="w-4 h-4 shrink-0 text-sky-500 animate-pulse" />
          <span className="font-medium truncate leading-tight">Intelligent Video Management</span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-white border border-sky-200 dark:border-slate-700 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      item.badgeColor || 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Node Status Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Pipeline Engine</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>IVMAP Optical v2.6</span>
            <span>Uptime 99.9%</span>
          </div>
        </div>
      </aside>
    </>
  );
};
