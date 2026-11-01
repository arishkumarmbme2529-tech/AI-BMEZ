import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  FolderOpen,
  Scan,
  Shield,
  Copy,
  CheckSquare,
  Layers,
  BadgeCheck,
  Bell,
  History,
  BarChart3,
  RefreshCw,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Overview', to: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Institution Management', to: '/institutions', icon: <Building2 className="h-5 w-5" /> },
  { label: 'Application Management', to: '/applications', icon: <FileText className="h-5 w-5" /> },
  { label: 'Document Management', to: '/documents', icon: <FolderOpen className="h-5 w-5" /> },
  { label: 'OCR & Data Extraction', to: '/ocr', icon: <Scan className="h-5 w-5" /> },
  { label: 'AI Document Auth', to: '/authentication', icon: <Shield className="h-5 w-5" /> },
  { label: 'Duplicate Detection', to: '/duplicates', icon: <Copy className="h-5 w-5" /> },
  { label: 'Compliance Verification', to: '/compliance', icon: <CheckSquare className="h-5 w-5" /> },
  { label: 'Infrastructure Verification', to: '/infrastructure', icon: <Layers className="h-5 w-5" /> },
  { label: 'Official Verification', to: '/verification', icon: <BadgeCheck className="h-5 w-5" /> },
  { label: 'Alerts & Notifications', to: '/alerts', icon: <Bell className="h-5 w-5" /> },
  { label: 'Audit Trail', to: '/audit', icon: <History className="h-5 w-5" /> },
  { label: 'Reports', to: '/reports', icon: <BarChart3 className="h-5 w-5" /> },
  { label: 'Document Renewal', to: '/renewals', icon: <RefreshCw className="h-5 w-5" /> },
  { label: 'User Management', to: '/users', icon: <Users className="h-5 w-5" />, superAdminOnly: true },
  { label: 'Settings', to: '/settings', icon: <Settings className="h-5 w-5" /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0a1628] text-slate-300 border-r border-slate-800 transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-[#07101e]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-slate-950 font-bold shadow-md flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white tracking-wide truncate">AICTE REG-TECH</p>
              <p className="text-[10px] text-cyan-400 font-medium tracking-wider uppercase truncate">
                Regulation Bureau
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 scrollbar-thin">
        {navItems
          .filter((item) => !item.superAdminOnly || isSuperAdmin)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white',
                  collapsed && 'justify-center px-2'
                )
              }
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
      </nav>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-3 m-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-200">SIH 2026 | PS #26261</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            Smart Automation — Synthetic Demo Environment
          </p>
        </div>
      )}
    </aside>
  );
};

