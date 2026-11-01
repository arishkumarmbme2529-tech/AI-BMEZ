import React, { useState, useEffect } from 'react';
import { BadgeCheck, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/Badge';
import { AlertBox } from '../../components/ui/Alert';
import { formatDateTime } from '../../utils/helpers';
import type { VerificationRecord } from '../../types';

export const OfficialVerificationPage: React.FC = () => {
  const { user } = useAuth();
  const isOfficer = user?.role === 'SUPER_ADMIN' || user?.role === 'OFFICER';

  const { items: documents } = useDocuments();
  const [selectedDocId, setSelectedDocId] = useState('');
  const [verificationType, setVerificationType] = useState('STATE_NOC_PORTAL');
  const [externalRef, setExternalRef] = useState('');
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(String(documents[0].id));
    }
  }, [documents]);

  const fetchRecords = () => {
    if (!selectedDocId) return;
    api
      .get<VerificationRecord[]>(`/verification/results/${selectedDocId}`)
      .then((res) => setRecords(res.data))
      .catch(() => setRecords([]));
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedDocId]);

  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) return;
    setLoading(true);
    try {
      await api.post(`/verification/request/${selectedDocId}`, null, {
        params: {
          verification_type: verificationType,
          external_ref: externalRef || undefined,
        },
      });
      toast.success('Synthetic official verification adapter queried');
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Verification request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <BadgeCheck className="h-6 w-6 text-brand-navy" />
          Official Issuing Authority Verification Adapter
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Integration-ready adapter architecture for external issuing authorities, QR verification,
          and digital repositories
        </p>
      </div>

      <AlertBox variant="info" title="Synthetic Demonstration Adapter Notice">
        This module implements a pluggable adapter architecture for external authority verification.
        For the Smart India Hackathon 2026 demonstration, all verification responses are{' '}
        <b>clearly labelled synthetic demonstration records</b> and do not connect to restricted
        live government databases.
      </AlertBox>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader
            title="Dispatch Verification Query"
            subtitle="Select document and adapter source"
          />
          <form onSubmit={handleRequestVerification} className="space-y-4">
            <Select
              label="Target Document"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              options={
                documents.length === 0
                  ? [{ value: '', label: 'No documents available' }]
                  : documents.map((d) => ({
                      value: String(d.id),
                      label: `${d.original_filename} (${d.document_type_name || 'Doc'})`,
                    }))
              }
            />
            <Select
              label="Verification Adapter Channel"
              value={verificationType}
              onChange={(e) => setVerificationType(e.target.value)}
              options={[
                { value: 'STATE_NOC_PORTAL', label: 'State Govt NOC Portal Adapter' },
                { value: 'QR_CODE_VALIDATION', label: 'Certificate QR Code Adapter' },
                { value: 'DIGITAL_SIGNATURE', label: 'PKI Digital Signature Validator' },
                { value: 'ACCREDITATION_REPO', label: 'NAAC / NBA Repository Adapter' },
              ]}
            />
            <Input
              label="Certificate / Reference ID (Optional)"
              placeholder="e.g., NOC-KA-2026-8821"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
            />
            <Button
              type="submit"
              loading={loading}
              disabled={!selectedDocId || !isOfficer}
              leftIcon={<Send className="h-4 w-4" />}
              className="w-full"
            >
              {isOfficer
                ? 'Trigger Adapter Verification'
                : 'Officer Role Required to Trigger'}
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Verification Request & Response Ledger"
            subtitle="Complete timestamped log of external adapter queries"
          />
          {records.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">
              No verification requests recorded for this document yet.
            </p>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{r.verification_type}</span>
                      <span className="ml-2 font-mono text-slate-500">Ref: {r.external_ref}</span>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-slate-600">{r.notes}</p>
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>Adapter Source: {r.source}</span>
                    <span>Responded: {formatDateTime(r.responded_at || r.requested_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

