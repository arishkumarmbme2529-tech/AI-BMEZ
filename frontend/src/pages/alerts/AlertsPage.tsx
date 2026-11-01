import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/Badge';
import { formatDateTime } from '../../utils/helpers';
import type { Alert, AlertsSummary } from '../../types';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('false');

  const fetchAlerts = () => {
    const params: any = {};
    if (severityFilter) params.severity = severityFilter;
    if (resolvedFilter !== '') params.is_resolved = resolvedFilter === 'true';

    api
      .get('/alerts', { params })
      .then((res) => setAlerts(res.data.items || []))
      .catch(() => {});

    api
      .get<AlertsSummary>('/alerts/summary')
      .then((res) => setSummary(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, resolvedFilter]);

  const handleMarkRead = async (id: number) => {
    await api.put(`/alerts/${id}/read`);
    fetchAlerts();
  };

  const handleResolve = async (id: number) => {
    await api.put(`/alerts/${id}/resolve`);
    toast.success('Alert marked resolved');
    fetchAlerts();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Bell className="h-6 w-6 text-amber-500" />
          Centralized Alerts & Notification Center
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Automated alerts for missing documents, expiry reminders, duplicate flags, and compliance
          deficiencies
        </p>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-400">Total Alerts</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary.total}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-400">Unread</p>
            <p className="text-xl font-bold text-cyan-600 mt-1">{summary.unread}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-400">Critical Open</p>
            <p className="text-xl font-bold text-red-600 mt-1">{summary.critical}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-400">High Priority</p>
            <p className="text-xl font-bold text-orange-600 mt-1">{summary.high}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-400">Medium Priority</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{summary.medium}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card padding="sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            options={[
              { value: '', label: 'All Severities' },
              { value: 'CRITICAL', label: 'Critical' },
              { value: 'HIGH', label: 'High' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'LOW', label: 'Low' },
            ]}
          />
          <Select
            value={resolvedFilter}
            onChange={(e) => setResolvedFilter(e.target.value)}
            options={[
              { value: 'false', label: 'Open / Unresolved Only' },
              { value: 'true', label: 'Resolved Alerts' },
              { value: '', label: 'All Alerts' },
            ]}
          />
          <div className="flex justify-end items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSeverityFilter('');
                setResolvedFilter('');
              }}
            >
              Show All
            </Button>
          </div>
        </div>
      </Card>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <Card>
            <p className="text-xs text-slate-400 py-10 text-center">
              No alerts matching current filter criteria.
            </p>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-l-4 ${
                alert.severity === 'CRITICAL'
                  ? 'border-l-red-500'
                  : alert.severity === 'HIGH'
                  ? 'border-l-orange-500'
                  : 'border-l-amber-400'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={alert.severity} />
                    <span className="text-xs font-mono text-slate-400">{alert.alert_type}</span>
                    {!alert.is_read && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-100 text-cyan-800 rounded-full">
                        NEW
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                  <p className="text-xs text-slate-600">{alert.message}</p>
                  <p className="text-[11px] text-slate-400">
                    Triggered: {formatDateTime(alert.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!alert.is_read && (
                    <Button
                      size="xs"
                      variant="secondary"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => handleMarkRead(alert.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                  {!alert.is_resolved && (
                    <Button
                      size="xs"
                      variant="success"
                      leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      onClick={() => handleResolve(alert.id)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

