import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  CheckSquare,
  FileDown,
  Send,
  Scan,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApplication, useApplicationActions } from '../../hooks/useApplications';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import api, { getDownloadUrl } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { formatDate, formatFileSize, formatDocumentType } from '../../utils/helpers';
import type { Report } from '../../types';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOfficer =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'OFFICER' ||
    user?.role === 'REVIEWER';

  const { application, loading, refetch } = useApplication(id);
  const { items: documents, refetch: refetchDocs } = useDocuments();
  const { submitApplication, updateStatus, loading: actionLoading } = useApplicationActions();

  const [validating, setValidating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');

  if (loading || !application) return <PageLoader message="Loading application details..." />;

  const appDocs = documents.filter(
    (d) => d.application_id === application.id || d.institution_id === application.institution_id
  );

  const handleRunValidation = async () => {
    if (!id) return;
    setValidating(true);
    try {
      const { data } = await api.post(`/applications/${id}/validate`);
      toast.success(`Completeness: ${data.completeness_score}%`);
      refetch();
    } catch {
      toast.error('Validation check failed');
    } finally {
      setValidating(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const res = await api.post<Report>('/reports/generate', {
        institution_id: application.institution_id,
        application_id: application.id,
        report_type: 'COMPLIANCE_SUMMARY',
      });
      toast.success('PDF Validation Report generated');
      const url = getDownloadUrl(res.data.file_path, res.data.title);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Failed to generate PDF report');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSubmitApp = async () => {
    if (!id) return;
    const ok = await submitApplication(id);
    if (ok) refetch();
  };

  const handleOfficerDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const ok = await updateStatus(id, reviewStatus, reviewNotes);
    if (ok) {
      setReviewNotes('');
      refetch();
    }
  };

  const handleDocStatus = async (docId: number, status: string) => {
    try {
      await api.put(`/documents/${docId}/status`, { status }, { params: { status } });
      toast.success(`Document #${docId} marked as ${status}`);
      refetchDocs();
    } catch {
      toast.error('Failed to update document status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/applications')}
            className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                {application.application_number || application.application_id}
              </span>
              <StatusBadge status={application.status} />
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-1">
              {application.institution_name || `Institution #${application.institution_id}`}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Academic Year: <strong>{application.academic_year}</strong> • Type:{' '}
              <strong>{(application.application_type || '').replace(/_/g, ' ')}</strong> • Proposed Intake:{' '}
              <strong>{application.proposed_intake || 360}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="h-3.5 w-3.5" />}
            onClick={() => navigate('/documents/upload')}
          >
            Upload Document
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isLoading={validating}
            leftIcon={<CheckSquare className="h-3.5 w-3.5" />}
            onClick={handleRunValidation}
          >
            Validate Completeness
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={generatingPdf}
            leftIcon={<FileDown className="h-3.5 w-3.5" />}
            onClick={handleGeneratePdf}
          >
            Download PDF Report
          </Button>
          {application.status === 'DRAFT' && (
            <Button
              size="sm"
              isLoading={actionLoading}
              leftIcon={<Send className="h-3.5 w-3.5" />}
              onClick={handleSubmitApp}
            >
              Submit Application
            </Button>
          )}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-slate-500">Completeness Score</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {application.Completeness_score ?? 80}%
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Risk Score</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{application.risk_score ?? 20}%</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Associated Documents</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{appDocs.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Submitted Date</p>
          <p className="text-sm font-bold text-slate-900 mt-1.5">
            {formatDate(application.submitted_at || application.created_at)}
          </p>
        </Card>
      </div>

      {(application.reviewer_remarks || application.review_notes) && (
        <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <p className="font-bold">Reviewer / Administrator Remarks:</p>
          <p className="mt-1">{application.reviewer_remarks || application.review_notes}</p>
        </div>
      )}

      {/* Associated Documents */}
      <Card
        title="Uploaded Supporting Documents"
        subtitle="Verify or inspect documents submitted for this application"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {appDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {doc.filename || doc.original_filename}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {formatDocumentType(doc.document_type || 'AFFIDAVIT')}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{formatFileSize(doc.file_size)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        leftIcon={<Scan className="h-3 w-3" />}
                        onClick={() => navigate(`/ocr?document_id=${doc.id}`)}
                      >
                        OCR
                      </Button>
                      {isOfficer && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDocStatus(doc.id, 'VERIFIED')}
                            className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold"
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDocStatus(doc.id, 'SUSPICIOUS')}
                            className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold"
                          >
                            Flag
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Officer Review Form */}
      {isOfficer && (
        <Card
          title="Record Review Decision"
          subtitle="Update application status and provide verification remarks"
        >
          <form onSubmit={handleOfficerDecision} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Application Decision
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="APPROVED">Approved</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="DEFICIENCY_RAISED">Deficiency Raised</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reviewer Remarks
                </label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter verification notes or deficiency details..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
            <Button type="submit" isLoading={actionLoading} size="sm">
              Save Review Decision
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
