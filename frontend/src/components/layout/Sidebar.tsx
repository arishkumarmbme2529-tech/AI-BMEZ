import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  FolderOpen,
  Upload,
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
import { getRoleLabel } from '../../utils/helpers';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  {
    label: 'Institutions',
    to: '/institutions',
    icon: <Building2 className="h-4 w-4" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICER', 'REVIEWER'],
  },
  { label: 'Applications', to: '/applications', icon: <FileText className="h-4 w-4" /> },
  { label: 'Documents Repository', to: '/documents', icon: <FolderOpen className="h-4 w-4" /> },
  { label: 'Upload Document', to: '/documents/upload', icon: <Upload className="h-4 w-4" /> },
  { label: 'OCR Text Extraction', to: '/ocr', icon: <Scan className="h-4 w-4" /> },
  { label: 'Document Authentication', to: '/authentication', icon: <Shield className="h-4 w-4" /> },
  { label: 'Duplicate & Hash Check', to: '/duplicates', icon: <Copy className="h-4 w-4" /> },
  { label: 'Compliance Evaluation', to: '/compliance', icon: <CheckSquare className="h-4 w-4" /> },
  { label: 'Expiry & Renewals', to: '/renewals', icon: <RefreshCw className="h-4 w-4" /> },
  { label: 'PDF Reports', to: '/reports', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Infrastructure Check', to: '/infrastructure', icon: <Layers className="h-4 w-4" /> },
  {
    label: 'Official Verification',
    to: '/verification',
    icon: <BadgeCheck className="h-4 w-4" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICER', 'REVIEWER'],
  },
  { label: 'Alerts & Reminders', to: '/alerts', icon: <Bell className="h-4 w-4" /> },
  {
    label: 'Audit Logs',
    to: '/audit',
    icon: <History className="h-4 w-4" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'OFFICER', 'REVIEWER'],
  },
  {
    label: 'User Accounts',
    to: '/users',
    icon: <Users className="h-4 w-4" />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  { label: 'Settings', to: '/settings', icon: <Settings className="h-4 w-4" /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const userRole = user?.role || 'INSTITUTION_ADMIN';

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-blue-700 flex items-center justify-center text-white font-semibold flex-shrink-0">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white tracking-tight truncate">AI-BMEZ Portal</p>
              <p className="text-[11px] text-slate-400 truncate">Document & Compliance System</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/documents'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
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
      {!collapsed && user && (
        <div className="p-3 m-2 rounded-md bg-slate-800/70 border border-slate-700/80">
          <div className="text-[11px] font-semibold text-slate-200 truncate">{user.full_name}</div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5">
            Role: <span className="text-slate-300 font-medium">{getRoleLabel(user.role)}</span>
          </div>
        </div>
      )}
    </aside>
  );
};
