import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Upload,
  Shield,
  CheckSquare,
  FileDown,
  Send,
  Layers,
  Scan,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApplication, useApplicationActions } from '../../hooks/useApplications';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { TextArea } from '../../components/ui/Input';
import { formatDate, formatFileSize } from '../../utils/helpers';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOfficer = user?.role === 'SUPER_ADMIN' || user?.role === 'OFFICER';

  const { application, checklist, validation, loading, refetch } = useApplication(id);
  const { items: documents, refetch: refetchDocs } = useDocuments({
    application_id: id ? Number(id) : undefined,
  });
  const { submitApplication, updateStatus, loading: actionLoading } = useApplicationActions();

  const [tab, setTab] = useState<'checklist' | 'documents' | 'compliance' | 'review'>('checklist');
  const [complianceResults, setComplianceResults] = useState<any>(null);
  const [runningComp, setRunningComp] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [decisionModal, setDecisionModal] = useState(false);
  const [newStatus, setNewStatus] = useState('UNDER_REVIEW');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    api
      .get(`/compliance/results/${id}`)
      .then((res) => setComplianceResults(res.data))
      .catch(() => {});
  }, [id]);

  if (loading || !application) return <PageLoader message="Loading application dossier..." />;

  const handleRunCompliance = async () => {
    if (!id) return;
    setRunningComp(true);
    try {
      await api.post(`/compliance/check/${id}`);
      const res = await api.get(`/compliance/results/${id}`);
      setComplianceResults(res.data);
      refetch();
      toast.success('Compliance verification engine run completed');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to run compliance check');
    } finally {
      setRunningComp(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!id) return;
    setGeneratingPdf(true);
    try {
      const res = await api.post(`/reports/generate/${id}`);
      toast.success('PDF Validation Report generated');
      window.open(`http://localhost:8000${res.data.download_url}`, '_blank');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to generate PDF report');
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
    const ok = await updateStatus(id, newStatus, reviewNotes);
    if (ok) {
      setDecisionModal(false);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/applications')}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-sm font-bold text-brand-navy bg-navy-50 px-2.5 py-1 rounded-lg">
                {application.application_id}
              </span>
              <StatusBadge status={application.status} />
              {validation && (
                <StatusBadge status={validation.overall_readiness} />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1.5">{application.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Institution: <span className="font-semibold text-slate-700">{application.institution_name}</span> •
              Category: <span className="font-semibold text-slate-700">{application.category_name}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() =>
              navigate(
                `/documents/upload?application_id=${application.id}&institution_id=${application.institution_id}`
              )
            }
          >
            Upload Document
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={runningComp}
            leftIcon={<CheckSquare className="h-4 w-4" />}
            onClick={handleRunCompliance}
          >
            Run Compliance Check
          </Button>
          <Button
            variant="cyan"
            size="sm"
            loading={generatingPdf}
            leftIcon={<FileDown className="h-4 w-4" />}
            onClick={handleGeneratePdf}
          >
            Download PDF Report
          </Button>
          {(application.status === 'DRAFT' || application.status === 'RETURNED') && (
            <Button
              size="sm"
              loading={actionLoading}
              leftIcon={<Send className="h-4 w-4" />}
              onClick={handleSubmitApp}
            >
              Submit Application
            </Button>
          )}
          {isOfficer && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setDecisionModal(true)}
            >
              Officer Review Decision
            </Button>
          )}
        </div>
      </div>

      {/* Validation Summary Cards */}
      {validation && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-400">Uploaded Docs</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{validation.total_documents}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-400">Compliant Rules</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{validation.compliant_rules}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-400">Non-Compliant</p>
            <p className="text-xl font-bold text-red-600 mt-1">{validation.non_compliant_rules}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-400">Auth Flags</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{validation.auth_issues}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-xs text-slate-400">Open Alerts</p>
            <p className="text-xl font-bold text-orange-600 mt-1">{validation.open_alerts}</p>
          </Card>
        </div>
      )}

      {application.review_notes && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <p className="font-bold">Verification Officer Review Notes:</p>
          <p className="mt-1">{application.review_notes}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: 'checklist', label: 'Automated Document Checklist' },
          { key: 'documents', label: `Uploaded Documents (${documents.length})` },
          { key: 'compliance', label: 'Regulatory Compliance Results' },
          { key: 'review', label: 'Application Metadata & History' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? 'border-cyan-500 text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Checklist Tab */}
      {tab === 'checklist' && checklist && (
        <Card>
          <CardHeader
            title="Mandatory & Optional Document Checklist"
            subtitle={`Missing ${checklist.missing_required} of ${checklist.total_required} required document types`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {checklist.checklist.map((item) => (
              <div
                key={item.document_type_id}
                className="p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  {item.is_uploaded ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle
                      className={`h-5 w-5 flex-shrink-0 ${
                        item.is_required ? 'text-red-500' : 'text-slate-300'
                      }`}
                    />
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {item.document_type_name}{' '}
                      <span className="text-[10px] font-mono text-slate-400">({item.code})</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {item.is_required ? 'Mandatory Requirement' : 'Optional Supporting Document'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Uploaded Documents Tab */}
      {tab === 'documents' && (
        <Card>
          <CardHeader
            title="Uploaded Supporting Documents"
            subtitle="Run OCR extraction or AI authentication directly on any uploaded file"
          />
          {documents.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              No supporting documents uploaded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{doc.original_filename}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Type: <span className="font-medium">{doc.document_type_name}</span> • Size:{' '}
                      {formatFileSize(doc.file_size)} • SHA-256:{' '}
                      <span className="font-mono">{doc.sha256_hash?.slice(0, 12)}...</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={doc.status} />
                    <Button
                      size="xs"
                      variant="secondary"
                      leftIcon={<Scan className="h-3.5 w-3.5" />}
                      onClick={() => navigate(`/ocr?document_id=${doc.id}`)}
                    >
                      Run OCR
                    </Button>
                    <Button
                      size="xs"
                      variant="cyan"
                      leftIcon={<Shield className="h-3.5 w-3.5" />}
                      onClick={() => navigate(`/authentication?document_id=${doc.id}`)}
                    >
                      AI Auth Check
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Compliance Tab */}
      {tab === 'compliance' && (
        <Card>
          <CardHeader
            title="Rule-by-Rule Regulatory Compliance Evaluation"
            subtitle="Configured sample rules based on AICTE Approval Process Handbook"
            action={
              <Button size="xs" loading={runningComp} onClick={handleRunCompliance}>
                Re-run Engine
              </Button>
            }
          />
          {!complianceResults ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-slate-500">
                Compliance check has not been executed for this application yet.
              </p>
              <Button size="sm" loading={runningComp} onClick={handleRunCompliance}>
                Execute Compliance Check Now
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {complianceResults.items.map((r: any) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-navy">
                        {r.rule_id}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{r.rule_name}</span>
                      <StatusBadge status={r.severity} />
                      {r.is_sample && (
                        <span className="px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                          Sample Rule
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{r.description}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Metadata Tab */}
      {tab === 'review' && (
        <Card>
          <CardHeader title="Application Metadata & Audit Information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-slate-400">Unique Application ID</p>
              <p className="font-mono font-bold text-slate-900 mt-0.5">
                {application.application_id}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-slate-400">Submitted By</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {application.submitter_name || '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-slate-400">Created At</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {formatDate(application.created_at)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-slate-400">Assigned Verification Officer</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {application.reviewer_name || 'Unassigned'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Officer Decision Modal */}
      <Modal
        isOpen={decisionModal}
        onClose={() => setDecisionModal(false)}
        title="Record Verification Officer Review Decision"
      >
        <form onSubmit={handleOfficerDecision} className="space-y-4">
          <Select
            label="Update Application Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'UNDER_REVIEW', label: 'Under Review' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'RETURNED', label: 'Returned for Correction / Missing Evidence' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
          <TextArea
            label="Official Review Observations & Comments"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Enter detailed observations, deficiencies, or approval remarks..."
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setDecisionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Save Review Decision
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

