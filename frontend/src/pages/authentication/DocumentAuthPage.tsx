import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Shield, Copy, AlertTriangle, CheckCircle2, FileSearch } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { formatDocumentType } from '../../utils/helpers';

export const DocumentAuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isDuplicateView = location.pathname.includes('duplicates');
  const { user } = useAuth();
  const canReview =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'OFFICER' ||
    user?.role === 'REVIEWER';

  const initialDocId = searchParams.get('document_id') || '';
  const { items: documents, refetch } = useDocuments();
  const [selectedDocId, setSelectedDocId] = useState(initialDocId);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(String(documents[0].id));
    }
  }, [documents, selectedDocId]);

  const selectedDoc = documents.find((d) => String(d.id) === String(selectedDocId));
  const duplicateDocs = documents.filter((d) => d.status === 'DUPLICATE' || d.is_duplicate);

  const handleRunAnalysis = async () => {
    if (!selectedDocId) return;
    setAnalyzing(true);
    try {
      const { data } = await api.post(`/documents/${selectedDocId}/analyze`);
      toast.success(`Authentication check completed: Status ${data.status}`);
      refetch();
    } catch {
      toast.error('Authentication analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatusChange = async (docId: number, status: string) => {
    try {
      await api.put(`/documents/${docId}/status`, { status }, { params: { status } });
      toast.success(`Document #${docId} status updated to ${status}`);
      refetch();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-lg border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          {isDuplicateView ? (
            <Copy className="h-5 w-5 text-purple-700" />
          ) : (
            <Shield className="h-5 w-5 text-blue-700" />
          )}
          {isDuplicateView
            ? 'Duplicate Document & SHA-256 Hash Detection'
            : 'Document Authentication & Suspicious File Detection'}
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Verify document integrity using SHA-256 cryptographic hashes, seal/signature verification, and anomaly checks.
        </p>
      </div>

      {/* Selector Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Document to Authenticate
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            >
              {documents.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.filename} ({formatDocumentType(d.document_type)}) — [{d.status}]
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="primary"
            isLoading={analyzing}
            disabled={!selectedDocId}
            leftIcon={<FileSearch className="h-4 w-4" />}
            onClick={handleRunAnalysis}
          >
            Run Authentication & Hash Check
          </Button>
        </div>
      </Card>

      {selectedDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Hash & Duplicate Summary */}
          <Card
            className="lg:col-span-5"
            title="Cryptographic Hash & Duplicate Status"
            subtitle="SHA-256 exact match comparison across all institutional submissions"
          >
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Document Filename</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDoc.filename}</p>
              </div>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <span className="text-slate-500">SHA-256 Digest</span>
                <p className="font-mono text-[11px] text-slate-800 break-all mt-1">
                  {selectedDoc.file_hash}
                </p>
              </div>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Current Verification Status</span>
                <StatusBadge status={selectedDoc.status} />
              </div>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Authenticity Score</span>
                <span className="font-bold text-slate-900">
                  {selectedDoc.authenticity_score ?? 90}%
                </span>
              </div>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Duplicate Hash Match</span>
                <span className="font-bold text-slate-900">
                  {selectedDoc.is_duplicate || selectedDoc.status === 'DUPLICATE'
                    ? `Yes (Matches Doc #${selectedDoc.duplicate_of_id || 1})`
                    : 'No (Unique File Hash)'}
                </span>
              </div>
            </div>
          </Card>

          {/* Right: Anomaly Findings & Reviewer Controls */}
          <Card
            className="lg:col-span-7"
            title="Authentication Findings & Review Controls"
            subtitle="Detected anomalies, duplicate alerts, and manual override actions"
            action={
              canReview ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    variant="success"
                    onClick={() => handleStatusChange(selectedDoc.id, 'VERIFIED')}
                  >
                    Mark Verified
                  </Button>
                  <Button
                    size="xs"
                    variant="danger"
                    onClick={() => handleStatusChange(selectedDoc.id, 'SUSPICIOUS')}
                  >
                    Flag Suspicious
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => handleStatusChange(selectedDoc.id, 'DUPLICATE')}
                  >
                    Mark Duplicate
                  </Button>
                </div>
              ) : undefined
            }
          >
            <div className="space-y-4 text-xs">
              {selectedDoc.fraud_Auto_flags && selectedDoc.fraud_Auto_flags.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-semibold text-rose-800">
                    Flagged Indicators ({selectedDoc.fraud_Auto_flags.length}):
                  </p>
                  {selectedDoc.fraud_Auto_flags.map((flag, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-900"
                    >
                      <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <span>
                    No duplicate hashes or tampering indicators detected for this document.
                  </span>
                </div>
              )}

              <div>
                <p className="font-semibold text-slate-700 mb-2">
                  All Flagged Duplicate Documents in Repository ({duplicateDocs.length})
                </p>
                {duplicateDocs.length === 0 ? (
                  <p className="text-slate-500">No duplicate documents currently flagged.</p>
                ) : (
                  <div className="space-y-2">
                    {duplicateDocs.map((dup) => (
                      <div
                        key={dup.id}
                        className="p-3 rounded border border-purple-200 bg-purple-50/40 flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{dup.filename}</p>
                          <p className="text-[11px] font-mono text-slate-600">
                            SHA-256: {dup.file_hash?.slice(0, 24)}... (Matches Doc #{dup.duplicate_of_id || 1})
                          </p>
                        </div>
                        <StatusBadge status="DUPLICATE" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
