import React, { useState, useEffect } from 'react';
import { BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { formatDate, formatDocumentType } from '../../utils/helpers';

export const OfficialVerificationPage: React.FC = () => {
  const { user } = useAuth();
  const canVerify =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'OFFICER' ||
    user?.role === 'REVIEWER';

  const { items: documents, refetch } = useDocuments();
  const [selectedDocId, setSelectedDocId] = useState('');
  const [newStatus, setNewStatus] = useState('VERIFIED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(String(documents[0].id));
    }
  }, [documents, selectedDocId]);

  const selectedDoc = documents.find((d) => String(d.id) === String(selectedDocId));

  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) return;
    setLoading(true);
    try {
      await api.put(
        `/documents/${selectedDocId}/status`,
        { status: newStatus, review_notes: reviewNotes },
        { params: { status: newStatus, review_notes: reviewNotes } }
      );
      toast.success(`Document #${selectedDocId} marked as ${newStatus}`);
      setReviewNotes('');
      refetch();
    } catch {
      toast.error('Failed to record verification decision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-lg border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-blue-700" />
          Official Document Verification Workbench
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Review OCR extracted fields, check SHA-256 hashes, and record official verification decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card
          className="lg:col-span-5"
          title="Record Verification Decision"
          subtitle="Select a document and assign its official verification status"
        >
          <form onSubmit={handleRecordDecision} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Document</label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
              >
                {documents.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.filename} ({formatDocumentType(d.document_type)}) — [{d.status}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Verification Decision
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
              >
                <option value="VERIFIED">Verified (Authentic & Valid)</option>
                <option value="PENDING">Pending Further Review</option>
                <option value="DUPLICATE">Duplicate (Hash Match Flagged)</option>
                <option value="SUSPICIOUS">Suspicious (Tampering / Seal Missing)</option>
                <option value="EXPIRED">Expired (Past Validity Date)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Verification Remarks (Optional)
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter reviewer notes or reference number..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
              />
            </div>

            <Button
              type="submit"
              isLoading={loading}
              disabled={!selectedDocId || !canVerify}
              className="w-full"
            >
              Save Verification Status
            </Button>
          </form>
        </Card>

        <Card
          className="lg:col-span-7"
          title="Selected Document Inspection Summary"
          subtitle={selectedDoc ? selectedDoc.filename : 'Select a document'}
        >
          {selectedDoc ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500">Current Status:</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedDoc.status} />
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Authenticity Score:</span>
                  <p className="font-bold text-slate-900 mt-1">
                    {selectedDoc.authenticity_score ?? 90}%
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Issue Date:</span>
                  <p className="font-semibold text-slate-900 mt-1">
                    {selectedDoc.issue_date ? formatDate(selectedDoc.issue_date) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Expiry Date:</span>
                  <p className="font-semibold text-slate-900 mt-1">
                    {selectedDoc.expiry_date ? formatDate(selectedDoc.expiry_date) : 'Permanent'}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">SHA-256 Cryptographic Hash:</span>
                  <p className="font-mono text-[11px] text-slate-800 break-all mt-1">
                    {selectedDoc.file_hash}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-1.5">Extracted OCR Text:</p>
                <pre className="p-3 rounded bg-slate-900 text-slate-100 font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {selectedDoc.extracted_text || 'No OCR text extracted.'}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-8 text-center">No document selected.</p>
          )}
        </Card>
      </div>
    </div>
  );
};
