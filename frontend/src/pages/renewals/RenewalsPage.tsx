import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments } from '../../hooks/useDocuments';
import api from '../../utils/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { formatDate, getDaysRemainingColor } from '../../utils/helpers';
import type { RenewalRecordItem, ExpiringDocument } from '../../types';

export const RenewalsPage: React.FC = () => {
  const { items: documents } = useDocuments();
  const [renewals, setRenewals] = useState<RenewalRecordItem[]>([]);
  const [expiring, setExpiring] = useState<ExpiringDocument[]>([]);
  const [daysFilter, setDaysFilter] = useState('90');
  const [modalOpen, setModalOpen] = useState(false);
  const [docId, setDocId] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!docId && documents.length > 0) {
      setDocId(String(documents[0].id));
    }
  }, [documents]);

  const fetchData = () => {
    api
      .get('/renewals', { params: { days_until_expiry: Number(daysFilter) || undefined } })
      .then((res) => setRenewals(res.data.items || []))
      .catch(() => {});

    api
      .get<ExpiringDocument[]>(`/renewals/expiring?days=${daysFilter || 90}`)
      .then((res) => setExpiring(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchData();
  }, [daysFilter]);

  const handleCreateRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/renewals', null, {
        params: { document_id: Number(docId), renewal_due_date: dueDate },
      });
      toast.success('Document renewal schedule created');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to schedule renewal');
    }
  };

  const handleMarkRenewed = async (id: number) => {
    await api.put(`/renewals/${id}/update`, null, { params: { new_status: 'RENEWED' } });
    toast.success('Marked as renewed');
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <RefreshCw className="h-6 w-6 text-cyan-600" />
            Document Lifecycle & Renewal Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track certificate validity windows with configurable 90, 60, 30, and 7-day renewal
            reminders
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
          Schedule Renewal Reminder
        </Button>
      </div>

      {/* Filter Bar */}
      <Card padding="sm">
        <div className="flex items-center justify-between gap-4">
          <div className="w-64">
            <Select
              label="Expiry Horizon Window"
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              options={[
                { value: '7', label: 'Expiring within 7 Days (Critical)' },
                { value: '30', label: 'Expiring within 30 Days' },
                { value: '60', label: 'Expiring within 60 Days' },
                { value: '90', label: 'Expiring within 90 Days' },
                { value: '365', label: 'All Upcoming (1 Year)' },
              ]}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> &lt;30d
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block ml-2" /> &lt;60d
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block ml-2" /> &lt;90d
          </div>
        </div>
      </Card>

      {/* Scheduled Renewal Records */}
      <Card>
        <CardHeader
          title="Active Renewal Schedule & Reminder Tracker"
          subtitle="Tracks automated 90 / 60 / 30 / 7 day reminder milestones"
        />
        {renewals.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">
            No scheduled renewal records in this window. Click "Schedule Renewal Reminder" above to
            add one.
          </p>
        ) : (
          <div className="space-y-3">
            {renewals.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {r.document_name || `Document #${r.document_id}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    Institution: {r.institution_name} • Due: {formatDate(r.renewal_due_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {r.days_remaining != null && (
                    <span className={`text-xs ${getDaysRemainingColor(r.days_remaining)}`}>
                      {r.days_remaining} days remaining
                    </span>
                  )}
                  <StatusBadge status={r.status} />
                  {r.status === 'ACTIVE' && (
                    <Button
                      size="xs"
                      variant="success"
                      leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      onClick={() => handleMarkRenewed(r.id)}
                    >
                      Mark Renewed
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Expiring Documents Table */}
      <Card>
        <CardHeader
          title="Documents Approaching Certificate Expiry Date"
          subtitle="Directly queried from uploaded document expiry dates"
        />
        {expiring.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">
            No uploaded documents expiring within {daysFilter} days.
          </p>
        ) : (
          <div className="space-y-2.5">
            {expiring.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{doc.filename}</p>
                  <p className="text-xs text-slate-500">
                    {doc.institution_name} • {doc.document_type} • Expires:{' '}
                    {formatDate(doc.expiry_date)}
                  </p>
                </div>
                <span className={`text-xs ${getDaysRemainingColor(doc.days_remaining)}`}>
                  {doc.days_remaining} days left
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Document Renewal Reminder"
      >
        <form onSubmit={handleCreateRenewal} className="space-y-4">
          <Select
            label="Select Document"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            options={documents.map((d) => ({
              value: String(d.id),
              label: `${d.original_filename} (${d.document_type_name || 'Doc'})`,
            }))}
          />
          <Input
            label="Renewal Due Date"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

