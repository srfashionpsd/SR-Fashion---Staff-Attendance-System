import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getISTDateTime } from '../shared/attendanceRules';
import {
  Clock,
  LayoutDashboard,
  CalendarCheck2,
  Users,
  SlidersHorizontal,
  CalendarDays,
  FileSpreadsheet,
  History,
  Settings,
  LogIn,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  pendingReviewsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenLogin,
  onLogout,
  pendingReviewsCount,
}) => {
  const [currentTime, setCurrentTime] = useState(getISTDateTime());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getISTDateTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'kiosk', label: 'Attendance Kiosk', icon: CalendarCheck2 },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'staff', label: 'Staff Directory', icon: Users },
    {
      id: 'adjustments',
      label: 'Adjustments',
      icon: SlidersHorizontal,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined,
    },
    { id: 'leaves', label: 'Leaves & Holidays', icon: CalendarDays },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'audit', label: 'Audit Log', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const visibleNavItems = navItems;

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-amber-500/30 text-white shadow-md">
      {/* Top Gold Accent Line */}
      <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand & Logo */}
          <div
            onClick={() => onSelectTab('kiosk')}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            {/* Official Logo Asset */}
            <div className="relative w-13 h-13 rounded-full ring-2 ring-amber-400/80 shadow-lg overflow-hidden bg-slate-950 flex-shrink-0 transition-transform group-hover:scale-105">
              <img
                src="/sr_fashion_logo.jpg"
                alt="SR Fashion Official Logo"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif tracking-wider font-bold text-xl sm:text-2xl text-amber-400 font-['Cinzel',serif]">
                  SR FASHION
                </span>
                <span className="text-[10px] tracking-widest font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
                  Nanded
                </span>
              </div>
              <p className="text-xs text-slate-300 tracking-wide hidden sm:block">
                Sabki Pasand SR Fashion
              </p>
            </div>
          </div>

          {/* Center Clock (authoritative IST format) */}
          <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-200">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-sm font-medium tracking-tight">
              {currentTime.fullDisplay} (IST)
            </span>
          </div>

          {/* Right Controls: User Role & Login */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-100 flex items-center gap-1">
                    {currentUser.role === 'admin' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400 inline" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-blue-400 inline" />
                    )}
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                    {currentUser.role}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors ml-1 rounded"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow transition-all active:scale-95 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1 py-1.5 overflow-x-auto no-scrollbar border-t border-slate-800">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all relative whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-t border-slate-800 px-4 pt-2 pb-5 space-y-1">
          <div className="py-2 px-3 mb-2 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Clock className="w-3.5 h-3.5" /> IST Time
            </span>
            <span className="font-mono text-slate-200">{currentTime.formatted12h}</span>
          </div>

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
