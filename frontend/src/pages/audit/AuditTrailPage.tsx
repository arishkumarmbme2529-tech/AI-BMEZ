import React, { useState, useEffect } from 'react';
import { History, Download } from 'lucide-react';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/helpers';
import type { AuditLogEntry, DashboardStats } from '../../types';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get<DashboardStats>('/dashboard/stats')
      .then((res) => {
        setLogs(res.data.recent_activities || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((l) =>
    !actionFilter
      ? true
      : l.action.toLowerCase().includes(actionFilter.toLowerCase()) ||
        (l.user_email || '').toLowerCase().includes(actionFilter.toLowerCase())
  );

  const exportCsv = () => {
    const headers = ['ID', 'Timestamp', 'User Email', 'Action', 'Entity Type', 'Entity ID'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.created_at,
      l.user_email || l.user_id,
      l.action,
      l.entity_type || '',
      l.entity_id || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aibmez_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5 text-blue-700" />
            System Audit Trail
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Chronological log of user logins, document uploads, OCR checks, and verification actions ({filteredLogs.length} entries).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="h-3.5 w-3.5" />}
          onClick={exportCsv}
        >
          Export CSV
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter by action or user email..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
          />
          <Button variant="secondary" size="sm" onClick={() => setActionFilter('')}>
            Clear
          </Button>
        </div>
      </Card>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor / User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No matching audit records.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {row.user_email || `User #${row.user_id}`}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-800">{row.action}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {row.entity_type || '—'} {row.entity_id ? `#${row.entity_id}` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {row.details ? JSON.stringify(row.details) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
