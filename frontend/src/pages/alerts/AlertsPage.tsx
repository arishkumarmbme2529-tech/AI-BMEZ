import React, { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { formatDate, formatDocumentType } from '../../utils/helpers';
import type { Document, ExpiryAlertsResponse } from '../../types';

export const AlertsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expiryData, setExpiryData] = useState<ExpiryAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, expRes] = await Promise.all([
        api.get('/documents'),
        api.get<ExpiryAlertsResponse>('/documents/expiry-alerts'),
      ]);
      const docs = Array.isArray(docsRes.data) ? docsRes.data : docsRes.data?.items || [];
      setDocuments(docs);
      setExpiryData(expRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const flaggedDocs = documents.filter(
    (d) =>
      d.status === 'DUPLICATE' ||
      d.status === 'SUSPICIOUS' ||
      d.status === 'EXPIRED' ||
      d.is_duplicate ||
      d.is_expired ||
      (d.fraud_Auto_flags && d.fraud_Auto_flags.length > 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-600" />
            Alerts & Compliance Reminders
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Active notifications for duplicate hashes, suspicious documents, expired certificates, and upcoming renewals.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={loadAlerts}
        >
          Refresh Alerts
        </Button>
      </div>

      {/* Alert Cards */}
      <Card
        title={`Flagged Document Alerts (${flaggedDocs.length})`}
        subtitle="Documents requiring administrative or reviewer verification"
      >
        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading alerts...</p>
        ) : flaggedDocs.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No active document alerts at this time.
          </p>
        ) : (
          <div className="space-y-3">
            {flaggedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-md border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-bold text-slate-900">{doc.filename}</span>
                    <StatusBadge status={doc.status} />
                  </div>
                  <p className="text-slate-600">
                    Category: {formatDocumentType(doc.document_type)} • Expiry:{' '}
                    {doc.expiry_date ? formatDate(doc.expiry_date) : 'Permanent'}
                  </p>
                  {doc.fraud_Auto_flags && doc.fraud_Auto_flags.length > 0 && (
                    <p className="text-rose-700 font-medium">{doc.fraud_Auto_flags.join(' | ')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Renewal Reminders */}
      {expiryData && expiryData.expiring_soon.length > 0 && (
        <Card
          title="Upcoming Renewal Reminders"
          subtitle="Certificates expiring within the next 90 days"
        >
          <div className="space-y-2.5">
            {expiryData.expiring_soon.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-md border border-amber-200 bg-amber-50/50 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">{item.filename}</span>
                  <span className="block text-slate-600">
                    Expires on {formatDate(item.expiry_date)}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                  {item.days_remaining} days left
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
