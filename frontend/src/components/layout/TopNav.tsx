import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Calendar,
  LogOut,
  User as UserIcon,
  Menu,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleLabel, getRoleBadgeColor, getInitials } from '../../utils/helpers';

interface TopNavProps {
  onToggleSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/documents?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile toggle + Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>

        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents, applications, or institutions..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
          />
        </form>
      </div>

      {/* Right: Role Indicator, Date, Alerts, User Profile */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
            <span>Active Workspace:</span>
            <span className="font-semibold text-slate-900">{getRoleLabel(user.role)}</span>
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          <span>{format(new Date(), 'dd MMM yyyy')}</span>
        </div>

        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Alerts & Reminders"
        >
          <Bell className="h-4 w-4" />
        </button>

        {user && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-md hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <div className="w-7 h-7 rounded bg-slate-800 text-white text-xs font-semibold flex items-center justify-center">
                {getInitials(user.full_name)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user.full_name}</p>
                <p className="text-[11px] text-slate-500 leading-tight">{user.email}</p>
              </div>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-md shadow-lg border border-slate-200 py-1.5 z-20">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <span
                      className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-semibold rounded border ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    Account Settings
                  </button>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
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
