import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CalendarX, Clock } from 'lucide-react';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { formatDate, formatDocumentType } from '../../utils/helpers';
import type { ExpiryAlertsResponse } from '../../types';

export const RenewalsPage: React.FC = () => {
  const [expiryData, setExpiryData] = useState<ExpiryAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchExpiryData = useCallback(() => {
    setLoading(true);
    api
      .get<ExpiryAlertsResponse>('/documents/expiry-alerts')
      .then((res) => setExpiryData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchExpiryData();
  }, [fetchExpiryData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-700" />
            Document Expiry & Renewal Reminders
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Track certificate validity dates and upcoming 90-day, 60-day, and 30-day renewal reminders.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={fetchExpiryData}
        >
          Refresh Reminders
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-red-200 bg-red-50/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-800 uppercase">Expired Documents</p>
              <p className="text-2xl font-bold text-red-900 mt-1">
                {expiryData?.expired_count ?? 0}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                Require immediate renewal submission
              </p>
            </div>
            <CalendarX className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase">
                Expiring Within 90 Days
              </p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                {expiryData?.expiring_soon_count ?? 0}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Active renewal reminders triggered
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
        </Card>
      </div>

      {/* Expired Documents Table */}
      <Card
        title="Expired Certificates & NOCs"
        subtitle="Documents whose validity date has passed"
      >
        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Checking expiry dates...</p>
        ) : !expiryData?.expired_documents || expiryData.expired_documents.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No expired documents found.</p>
        ) : (
          <div className="space-y-2.5">
            {expiryData.expired_documents.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-md border border-red-200 bg-red-50/30 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">{doc.filename}</p>
                  <p className="text-slate-600 mt-0.5">
                    Category: {formatDocumentType(doc.document_type)} • Expired on:{' '}
                    <strong className="text-red-700">{formatDate(doc.expiry_date)}</strong>
                  </p>
                </div>
                <StatusBadge status="EXPIRED" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Expiring Soon Table */}
      <Card
        title="Upcoming Renewal Reminders (Within 90 Days)"
        subtitle="Documents approaching their certificate expiry date"
      >
        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading upcoming renewals...</p>
        ) : !expiryData?.expiring_soon || expiryData.expiring_soon.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No documents expiring within the next 90 days.
          </p>
        ) : (
          <div className="space-y-2.5">
            {expiryData.expiring_soon.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-md border border-amber-200 bg-amber-50/30 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">{doc.filename}</p>
                  <p className="text-slate-600 mt-0.5">
                    Category: {formatDocumentType(doc.document_type)} • Expiry Date:{' '}
                    <strong>{formatDate(doc.expiry_date)}</strong>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-semibold">
                  {doc.days_remaining} days remaining
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
