import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Calendar,
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
  Menu,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getRoleLabel, getRoleBadgeColor, getInitials } from '../../utils/helpers';
import api from '../../utils/api';
import type { AlertsSummary } from '../../types';

interface TopNavProps {
  onToggleSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    api
      .get<AlertsSummary>('/alerts/summary')
      .then((res) => setUnreadAlerts(res.data.unread))
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/applications?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile toggle + Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>

        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Global search applications, AICTE IDs, or institutions..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
        </form>
      </div>

      {/* Right: Date, Demo Banner, Theme, Alerts, User Profile */}
      <div className="flex items-center gap-3">
        {/* Demo mode badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
          <span>Synthetic Demo Data</span>
        </div>

        {/* Current Date */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
          <Calendar className="h-3.5 w-3.5 text-brand-navy" />
          <span>{format(new Date(), 'dd MMM yyyy')}</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Alerts & Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadAlerts > 99 ? '99+' : unreadAlerts}
            </span>
          )}
        </button>

        {/* User Profile Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-navy text-white text-xs font-bold flex items-center justify-center">
                {getInitials(user.full_name)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-none">{user.full_name}</p>
                <span
                  className={`inline-block mt-1 px-1.5 py-0.2 text-[10px] font-semibold rounded ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-20">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    Profile & Settings
                  </button>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

