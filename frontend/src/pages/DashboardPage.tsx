import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  FileWarning,
  Copy,
  CalendarX,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Upload,
  Scan,
  BarChart3,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import { AlertBox } from '../components/ui/Alert';
import { ApplicationTrendChart } from '../components/charts/ApplicationTrendChart';
import { ComplianceChart } from '../components/charts/ComplianceChart';
import { DocumentStatusChart } from '../components/charts/DocumentStatusChart';
import { formatDateTime, formatPercent, getDaysRemainingColor } from '../utils/helpers';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    stats,
    trendData,
    complianceData,
    docStatusData,
    appStatusData,
    recentActivity,
    expiringDocs,
    criticalAlerts,
    pendingApps,
    loading,
    error,
    refetch,
  } = useDashboard();

  if (loading) return <PageLoader message="Loading live regulatory dashboard metrics..." />;

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Regulatory Operations & Compliance Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Live database-driven institutional validation, document authentication & compliance metrics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={refetch}
          >
            Refresh
          </Button>
          <Button
            variant="cyan"
            size="sm"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => navigate('/documents/upload')}
          >
            Upload Document
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/applications/new')}
          >
            New Application
          </Button>
        </div>
      </div>

      {/* Synthetic Demonstration Banner */}
      <AlertBox variant="info" title="Synthetic Demonstration Data Notice">
        All institutional records, applications, OCR extractions, and compliance rules displayed on
        this dashboard are database-driven demonstration records created for Smart India Hackathon
        2026 (Problem Statement #26261) and do not represent live AICTE government data.
      </AlertBox>

      {error && (
        <AlertBox variant="error" title="Error loading dashboard">
          {error}
        </AlertBox>
      )}

      {/* 9 Master Analytics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Institutions"
          value={stats?.total_institutions ?? 0}
          subtitle="Registered technical institutions"
          icon={<Building2 className="h-6 w-6" />}
          color="navy"
          onClick={() => navigate('/institutions')}
        />
        <StatCard
          title="Total Applications"
          value={stats?.total_applications ?? 0}
          subtitle="Across all approval categories"
          icon={<FileText className="h-6 w-6" />}
          color="cyan"
          onClick={() => navigate('/applications')}
        />
        <StatCard
          title="Verified Documents"
          value={stats?.verified_documents ?? 0}
          subtitle={`Out of ${stats?.total_documents ?? 0} uploaded documents`}
          icon={<CheckCircle2 className="h-6 w-6" />}
          color="green"
          onClick={() => navigate('/documents')}
        />
        <StatCard
          title="Pending Applications"
          value={stats?.pending_applications ?? 0}
          subtitle="Submitted or Under Review"
          icon={<Clock className="h-6 w-6" />}
          color="amber"
          onClick={() => navigate('/applications?status=UNDER_REVIEW')}
        />
        <StatCard
          title="Missing Documents"
          value={stats?.missing_documents ?? 0}
          subtitle="Applications lacking mandatory files"
          icon={<FileWarning className="h-6 w-6" />}
          color="orange"
          onClick={() => navigate('/applications')}
        />
        <StatCard
          title="Duplicate Documents"
          value={stats?.duplicate_documents ?? 0}
          subtitle="SHA-256 / Perceptual hash matches"
          icon={<Copy className="h-6 w-6" />}
          color="purple"
          onClick={() => navigate('/duplicates')}
        />
        <StatCard
          title="Expired Documents"
          value={stats?.expired_documents ?? 0}
          subtitle="Past validity date"
          icon={<CalendarX className="h-6 w-6" />}
          color="red"
          onClick={() => navigate('/renewals')}
        />
        <StatCard
          title="Potential Anomaly Alerts"
          value={stats?.anomaly_alerts ?? 0}
          subtitle="Unresolved system & AI alerts"
          icon={<AlertTriangle className="h-6 w-6" />}
          color="red"
          onClick={() => navigate('/alerts')}
        />
        <StatCard
          title="Compliance Overview"
          value={formatPercent(stats?.compliance_rate ?? 0)}
          subtitle="Overall rule compliance rate"
          icon={<ShieldCheck className="h-6 w-6" />}
          color="green"
          onClick={() => navigate('/compliance')}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ApplicationTrendChart data={trendData} />
        </div>
        <div>
          <ComplianceChart data={complianceData} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DocumentStatusChart data={docStatusData} />
        <ComplianceChart
          data={appStatusData}
          title="Application Status Distribution"
          subtitle="Current lifecycle stage of institutional applications"
        />
      </div>

      {/* Widgets Row: Pending Applications + Critical Alerts + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="Recent Applications"
            subtitle="Latest institutional submissions"
            action={
              <Button variant="ghost" size="xs" onClick={() => navigate('/applications')}>
                View All
              </Button>
            }
          />
          <div className="space-y-3">
            {pendingApps.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No applications found</p>
            ) : (
              pendingApps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className="p-3 rounded-xl border border-slate-100 hover:border-cyan-300 hover:bg-slate-50/70 transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{app.application_id}</p>
                    <p className="text-xs text-slate-500 truncate">{app.institution_name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{app.category_name}</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Active Alerts */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="Active Regulatory Alerts"
            subtitle="Unresolved compliance & document flags"
            action={
              <Button variant="ghost" size="xs" onClick={() => navigate('/alerts')}>
                Open Center
              </Button>
            }
          />
          <div className="space-y-3">
            {criticalAlerts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No unresolved alerts</p>
            ) : (
              criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => navigate('/alerts')}
                  className="p-3 rounded-xl border border-slate-100 hover:border-amber-300 bg-slate-50/50 cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 truncate">{alert.title}</span>
                    <StatusBadge status={alert.severity} />
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{alert.message}</p>
                  <p className="text-[10px] text-slate-400">{formatDateTime(alert.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Audit Activity */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="Recent Audit Trail"
            subtitle="Latest logged platform actions"
            action={
              <Button variant="ghost" size="xs" onClick={() => navigate('/audit')}>
                Full Log
              </Button>
            }
          />
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent activity</p>
            ) : (
              recentActivity.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">
                      {act.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      By {act.user_name} • {act.entity_type}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {formatDateTime(act.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Row: Expiring Certificates + Quick Module Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Expiring Certificates & Renewals (Next 90 Days)"
            subtitle="Documents approaching expiry requiring renewal"
            action={
              <Button variant="ghost" size="xs" onClick={() => navigate('/renewals')}>
                Manage Renewals
              </Button>
            }
          />
          {expiringDocs.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              No documents expiring within the next 90 days.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase">
                    <th className="py-2 pr-4">Document</th>
                    <th className="py-2 px-4">Institution</th>
                    <th className="py-2 px-4">Type</th>
                    <th className="py-2 pl-4 text-right">Days Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {expiringDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-medium text-slate-800">{doc.filename}</td>
                      <td className="py-2.5 px-4 text-slate-600">{doc.institution_name}</td>
                      <td className="py-2.5 px-4 text-slate-500">{doc.document_type}</td>
                      <td className={`py-2.5 pl-4 text-right ${getDaysRemainingColor(doc.days_remaining)}`}>
                        {doc.days_remaining} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick AI & Verification Launchpad */}
        <Card>
          <CardHeader
            title="AI & Verification Engines"
            subtitle="Direct launchpad for core platform modules"
          />
          <div className="grid grid-cols-1 gap-2.5">
            {[
              {
                label: 'OCR & Field Extraction',
                desc: 'Extract text, cert numbers & dates',
                icon: <Scan className="h-4 w-4 text-cyan-600" />,
                to: '/ocr',
              },
              {
                label: 'AI Document Authentication',
                desc: 'Metadata, ELA & anomaly indicators',
                icon: <ShieldCheck className="h-4 w-4 text-brand-navy" />,
                to: '/authentication',
              },
              {
                label: 'Compliance Rule Engine',
                desc: 'Run automated handbook checks',
                icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
                to: '/compliance',
              },
              {
                label: 'Generate PDF Validation Report',
                desc: 'Download full application dossier',
                icon: <BarChart3 className="h-4 w-4 text-purple-600" />,
                to: '/reports',
              },
            ].map((item) => (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100">{item.icon}</div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{item.label}</p>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

