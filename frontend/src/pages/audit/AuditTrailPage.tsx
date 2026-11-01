import React, { useState, useEffect } from 'react';
import { History, Download } from 'lucide-react';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import { formatDateTime } from '../../utils/helpers';
import type { AuditLog } from '../../types';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get('/audit/logs', {
        params: { action: actionFilter || undefined, limit: 100 },
      })
      .then((res) => {
        setLogs(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actionFilter]);

  const exportCsv = () => {
    const headers = ['ID', 'Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Result'];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      l.user_name || l.user_id,
      l.action,
      l.entity_type || '',
      l.entity_id || '',
      l.result || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aicte_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <History className="h-6 w-6 text-brand-navy" />
            Immutable Regulatory Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete tamper-evident log of logins, uploads, OCR corrections, AI analyses, and status
            decisions ({total} records)
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={exportCsv}
        >
          Export CSV Ledger
        </Button>
      </div>

      <Card padding="sm">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Filter by action (e.g., USER_LOGIN, DOCUMENT_UPLOADED, OCR_PROCESSED)..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setActionFilter('')}>
            Clear
          </Button>
        </div>
      </Card>

      <Card padding="none">
        <Table<AuditLog>
          loading={loading}
          data={logs}
          keyExtractor={(row) => String(row.id)}
          columns={[
            {
              key: 'timestamp',
              header: 'Timestamp',
              cell: (row) => (
                <span className="font-mono text-xs text-slate-600">
                  {formatDateTime(row.timestamp)}
                </span>
              ),
            },
            {
              key: 'user',
              header: 'Actor / User',
              cell: (row) => (
                <span className="text-xs font-semibold text-slate-900">
                  {row.user_name || `User #${row.user_id}`}
                </span>
              ),
            },
            {
              key: 'action',
              header: 'Action Event',
              cell: (row) => (
                <span className="font-mono text-xs font-bold text-brand-navy">{row.action}</span>
              ),
            },
            {
              key: 'entity',
              header: 'Target Entity',
              cell: (row) => (
                <span className="text-xs text-slate-600">
                  {row.entity_type || '—'} {row.entity_id ? `#${row.entity_id}` : ''}
                </span>
              ),
            },
            {
              key: 'evidence',
              header: 'Audit Evidence Metadata',
              cell: (row) => (
                <span className="font-mono text-[11px] text-slate-500 max-w-xs truncate block">
                  {row.evidence ? JSON.stringify(row.evidence) : '—'}
                </span>
              ),
            },
            {
              key: 'result',
              header: 'Outcome',
              cell: (row) => <StatusBadge status={row.result || 'SUCCESS'} />,
            },
          ]}
        />
      </Card>
    </div>
  );
};

