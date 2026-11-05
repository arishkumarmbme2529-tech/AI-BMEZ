import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  ShieldAlert,
  CalendarX,
  Percent,
  Upload,
  Download,
  FileCheck,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  History,
  CheckSquare,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import api, { getDownloadUrl } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import type {
  DashboardStats,
  Institution,
  Document,
  Application,
  MissingDocsResponse,
  ExpiryAlertsResponse,
  Report,
  DocumentType,
} from '../types';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';
import { formatDate, formatDateTime, formatDocumentType } from '../utils/helpers';

const CHART_COLORS = ['#16a34a', '#d97706', '#64748b', '#9333ea', '#e11d48', '#dc2626'];

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'AFFIDAVIT', label: 'Notarized Affidavit' },
  { value: 'BUILDING_PLAN', label: 'Approved Building Plan' },
  { value: 'FIRE_NOC', label: 'Fire Safety NOC' },
  { value: 'LAND_OWNERSHIP', label: 'Land Ownership Certificate' },
  { value: 'FACULTY_LIST', label: 'Faculty Roster & Qualifications' },
  { value: 'EQUIPMENT_SPEC', label: 'Lab Equipment Specification' },
  { value: 'AUDIT_STATEMENT', label: 'Audited Financial Statement' },
  { value: 'TRUST_DEED', label: 'Trust / Society Registration Deed' },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [missingDocs, setMissingDocs] = useState<MissingDocsResponse | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload state (for Institute Dashboard)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('AFFIDAVIT');
  const [uploadIssueDate, setUploadIssueDate] = useState('2026-01-15');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('2027-06-30');
  const [uploading, setUploading] = useState(false);

  // Admin Report Generation State
  const [selectedReportInstId, setSelectedReportInstId] = useState<number>(1);
  const [selectedReportType, setSelectedReportType] = useState('COMPLIANCE_SUMMARY');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Reviewer / Admin inline action state
  const [updatingDocId, setUpdatingDocId] = useState<number | null>(null);
  const [selectedOcrDoc, setSelectedOcrDoc] = useState<Document | null>(null);
  const [reviewerFilter, setReviewerFilter] = useState<'ALL' | 'WAITING' | 'FLAGGED' | 'VERIFIED'>('ALL');

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isInstitute = user?.role === 'INSTITUTION_ADMIN' || user?.role === 'INSTITUTE_USER';
  const isReviewer = user?.role === 'OFFICER' || user?.role === 'REVIEWER';

  const loadDashboardData = useCallback(async () => {
    try {
      const [statsRes, instRes, docsRes, appsRes, expiryRes, reportsRes] = await Promise.all([
        api.get<DashboardStats>('/dashboard/stats'),
        api.get<Institution[]>('/institutions'),
        api.get<Document[]>('/documents'),
        api.get<Application[]>('/applications'),
        api.get<ExpiryAlertsResponse>('/documents/expiry-alerts'),
        api.get<Report[]>('/reports'),
      ]);

      setStats(statsRes.data);
      setInstitutions(instRes.data);
      setDocuments(docsRes.data);
      setApplications(appsRes.data);
      setExpiryAlerts(expiryRes.data);
      setReports(reportsRes.data);

      if (instRes.data.length > 0) {
        const targetInstId = user?.institution_id || instRes.data[0].id;
        setSelectedReportInstId(targetInstId);
        const missingRes = await api.get<MissingDocsResponse>(`/documents/missing/${targetInstId}`);
        setMissingDocs(missingRes.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.institution_id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleDocumentStatusUpdate = async (docId: number, newStatus: string) => {
    setUpdatingDocId(docId);
    try {
      await api.put(`/documents/${docId}/status`, { status: newStatus }, { params: { status: newStatus } });
      toast.success(`Document #${docId} marked as ${newStatus}`);
      await loadDashboardData();
    } catch {
      toast.error('Failed to update document status');
    } finally {
      setUpdatingDocId(null);
    }
  };

  const handleRunOcrAndVerify = async (docId: number) => {
    setUpdatingDocId(docId);
    try {
      const { data } = await api.post(`/documents/${docId}/analyze`);
      toast.success(`OCR & Hash Check Complete: Status is ${data.status}`);
      await loadDashboardData();
    } catch {
      toast.error('Failed to run OCR analysis');
    } finally {
      setUpdatingDocId(null);
    }
  };

  const handleApplicationReview = async (appId: number, status: string, remarks: string) => {
    try {
      await api.put(`/applications/${appId}/review`, { status, reviewer_remarks: remarks });
      toast.success(`Application updated to ${status.replace(/_/g, ' ')}`);
      await loadDashboardData();
    } catch {
      toast.error('Failed to update application status');
    }
  };

  const handleInstituteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a PDF or image file to upload.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', uploadDocType);
      const instId = user?.institution_id || institutions[0]?.id || 1;
      formData.append('institution_id', String(instId));
      if (applications[0]?.id) {
        formData.append('application_id', String(applications[0].id));
      }
      if (uploadIssueDate) formData.append('issue_date', uploadIssueDate);
      if (uploadExpiryDate) formData.append('expiry_date', uploadExpiryDate);

      const { data: uploadedDoc } = await api.post<Document>('/documents/upload', formData);
      toast.success(
        `Uploaded "${uploadedDoc.filename}" — OCR & Hash Check Result: ${uploadedDoc.status}`
      );
      setUploadFile(null);
      await loadDashboardData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Document upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleGeneratePdfReport = async () => {
    setGeneratingReport(true);
    try {
      const { data: report } = await api.post<Report>('/reports/generate', {
        institution_id: selectedReportInstId,
        report_type: selectedReportType,
      });
      toast.success('PDF Report generated!');
      await loadDashboardData();
      const url = getDownloadUrl(report.file_path, report.title);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not generate PDF report');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading || !stats) {
    return <PageLoader message="Loading role-based dashboard..." />;
  }

  const getInstitutionName = (instId: number) => {
    return institutions.find((i) => i.id === instId)?.name || `Institution #${instId}`;
  };

  // ============================================================================
  // 1. ADMIN DASHBOARD (admin@aibmez.demo)
  // ============================================================================
  if (isAdmin) {
    const docDistData = [
      { status: 'Verified', count: stats.verified_documents },
      { status: 'Pending', count: stats.pending_documents },
      { status: 'Missing', count: stats.missing_documents_count },
      { status: 'Duplicate', count: stats.duplicate_documents },
      { status: 'Suspicious', count: stats.suspicious_documents },
      { status: 'Expired', count: stats.expired_documents },
    ];

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded bg-blue-700 text-white">
                Admin Dashboard
              </span>
              <span className="text-xs text-slate-500">Logged in as {user?.email}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Institutional Compliance & Document Verification Overview
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Monitor registered institutes, document validation statuses, compliance percentages, and generate official PDF reports.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={loadDashboardData}
            >
              Refresh Data
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleGeneratePdfReport}
              isLoading={generatingReport}
            >
              Generate PDF Report
            </Button>
          </div>
        </div>

        {/* 9 Required Admin Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            title="Total Registered Institutes"
            value={stats.total_institutions}
            subtitle="Active institutions"
            icon={<Building2 className="h-5 w-5" />}
            accentColor="navy"
          />
          <StatCard
            title="Total Uploaded Documents"
            value={stats.total_documents}
            subtitle="PDF & image files"
            icon={<FileText className="h-5 w-5" />}
            accentColor="cyan"
          />
          <StatCard
            title="Verified Documents"
            value={stats.verified_documents}
            subtitle="Authenticated & valid"
            icon={<CheckCircle2 className="h-5 w-5" />}
            accentColor="emerald"
          />
          <StatCard
            title="Pending Documents"
            value={stats.pending_documents}
            subtitle="Awaiting verification"
            icon={<Clock className="h-5 w-5" />}
            accentColor="amber"
          />
          <StatCard
            title="Missing Documents"
            value={stats.missing_documents_count}
            subtitle="Required but not uploaded"
            icon={<AlertTriangle className="h-5 w-5" />}
            accentColor="slate"
          />
          <StatCard
            title="Duplicate Documents"
            value={stats.duplicate_documents}
            subtitle="SHA-256 hash matches"
            icon={<Copy className="h-5 w-5" />}
            accentColor="purple"
          />
          <StatCard
            title="Suspicious Documents"
            value={stats.suspicious_documents}
            subtitle="Flagged for anomalies"
            icon={<ShieldAlert className="h-5 w-5" />}
            accentColor="red"
          />
          <StatCard
            title="Expired Documents"
            value={stats.expired_documents}
            subtitle="Past validity date"
            icon={<CalendarX className="h-5 w-5" />}
            accentColor="red"
          />
          <StatCard
            title="Compliance Percentage"
            value={`${stats.average_compliance_score}%`}
            subtitle="Average institutional score"
            icon={<Percent className="h-5 w-5" />}
            accentColor="emerald"
          />
        </div>

        {/* Admin Review Section */}
        <Card
          title="Admin Document Review & Status Control"
          subtitle="Inspect uploaded documents, view extracted OCR text, and update verification status (Verified, Pending, Duplicate, Suspicious, Expired)"
          action={
            <Button variant="outline" size="sm" onClick={() => navigate('/documents')}>
              Open Full Repository
            </Button>
          }
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <th className="py-3 px-4">Document & Hash</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Auth Score & Flags</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Admin Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{doc.filename}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        SHA-256: {doc.file_hash ? `${doc.file_hash.slice(0, 16)}...` : 'Verified'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {getInstitutionName(doc.institution_id)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDocumentType(doc.document_type)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {doc.authenticity_score != null ? `${doc.authenticity_score}%` : '—'}
                      </div>
                      {doc.fraud_Auto_flags && doc.fraud_Auto_flags.length > 0 && (
                        <div className="text-[11px] text-red-600 max-w-xs truncate" title={doc.fraud_Auto_flags.join('; ')}>
                          {doc.fraud_Auto_flags[0]}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {doc.expiry_date ? formatDate(doc.expiry_date) : 'No Expiry'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedOcrDoc(doc)}
                          className="px-2 py-1 text-[11px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
                        >
                          OCR Text
                        </button>
                        <button
                          type="button"
                          disabled={updatingDocId === doc.id}
                          onClick={() => handleDocumentStatusUpdate(doc.id, 'VERIFIED')}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          disabled={updatingDocId === doc.id}
                          onClick={() => handleDocumentStatusUpdate(doc.id, 'SUSPICIOUS')}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                        >
                          Suspicious
                        </button>
                        <button
                          type="button"
                          disabled={updatingDocId === doc.id}
                          onClick={() => handleDocumentStatusUpdate(doc.id, 'DUPLICATE')}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          disabled={updatingDocId === doc.id}
                          onClick={() => handleDocumentStatusUpdate(doc.id, 'EXPIRED')}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-red-700 hover:bg-red-800 text-white disabled:opacity-50"
                        >
                          Expired
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* PDF Report Generation & Registered Institutes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card
            className="lg:col-span-5"
            title="PDF Compliance Report Generator"
            subtitle="Generate and download official institutional verification PDF reports"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Institution
                </label>
                <select
                  value={selectedReportInstId}
                  onChange={(e) => setSelectedReportInstId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.aicte_id}) — Compliance: {inst.compliance_score}%
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Report Type
                </label>
                <select
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                >
                  <option value="COMPLIANCE_SUMMARY">Comprehensive Compliance & Document Summary</option>
                  <option value="DEFICIENCY_REPORT">Deficiency & Missing Document Audit</option>
                  <option value="AUTHENTICATION_AUDIT">OCR & Document Authentication Report</option>
                </select>
              </div>
              <Button
                variant="primary"
                className="w-full"
                isLoading={generatingReport}
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleGeneratePdfReport}
              >
                Generate & Open PDF Report
              </Button>

              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-800 mb-2">Recent Generated Reports</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-2.5 rounded border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{rep.title}</p>
                        <p className="text-[11px] text-slate-500">{formatDateTime(rep.created_at)}</p>
                      </div>
                      <a
                        href={getDownloadUrl(rep.file_path, rep.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-[11px] font-semibold flex-shrink-0"
                      >
                        Download PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card
            className="lg:col-span-7"
            title="Document Status Breakdown & Compliance Analytics"
            subtitle="Distribution across Verified, Pending, Missing, Duplicate, Suspicious, and Expired documents"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={docDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={docDistData.filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={72}
                  >
                    {docDistData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Registered Institutes & Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card
            className="lg:col-span-7"
            title="Registered Institutions & Compliance Percentage"
            subtitle="Overview of all registered institutions and their regulatory compliance score"
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                    <th className="py-2.5 px-4">Institution Name</th>
                    <th className="py-2.5 px-4">AICTE ID</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Compliance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {institutions.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{inst.name}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{inst.aicte_id}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {inst.city}, {inst.state}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                (inst.compliance_score || 0) >= 80
                                  ? 'bg-emerald-600'
                                  : (inst.compliance_score || 0) >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(100, inst.compliance_score || 0)}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800">{inst.compliance_score ?? 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            className="lg:col-span-5"
            title="Recent System Activities"
            subtitle="Real-time audit trail of document uploads, OCR scans, and reviews"
          >
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {stats.recent_activities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded border border-slate-200 bg-slate-50 flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900">
                      {act.action.replace(/_/g, ' ')}
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {act.user_email} • {act.entity_type} #{act.entity_id}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {formatDateTime(act.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* OCR Modal if selected */}
        {selectedOcrDoc && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    OCR Extracted Content — {selectedOcrDoc.filename}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Document Type: {formatDocumentType(selectedOcrDoc.document_type)} | Status:{' '}
                    {selectedOcrDoc.status}
                  </p>
                </div>
                <StatusBadge status={selectedOcrDoc.status} />
              </div>
              <pre className="p-3 rounded bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {selectedOcrDoc.extracted_text || 'No OCR text extracted yet.'}
              </pre>
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRunOcrAndVerify(selectedOcrDoc.id)}
                >
                  Re-Run OCR & Hash Check
                </Button>
                <Button variant="primary" size="sm" onClick={() => setSelectedOcrDoc(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 2. INSTITUTE DASHBOARD (institute@aibmez.demo)
  // ============================================================================
  if (isInstitute) {
    const myInstitution =
      institutions.find((i) => i.id === user?.institution_id) || institutions[0] || null;
    const pendingList = documents.filter((d) => d.status === 'PENDING' || d.status === 'PROCESSING');

    return (
      <div className="space-y-6">
        {/* Institute Profile Header */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded bg-emerald-700 text-white">
                  Institute Dashboard
                </span>
                <span className="text-xs text-slate-500">Account: {user?.email}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-1">
                {myInstitution?.name || 'Registered Technical Institution'}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Upload mandatory institutional documents, inspect OCR verification status, track missing documents, and monitor expiry reminders.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={loadDashboardData}
              >
                Refresh Status
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                onClick={handleGeneratePdfReport}
                isLoading={generatingReport}
              >
                Download Institute Report (PDF)
              </Button>
            </div>
          </div>

          {/* Institute Profile Details Grid */}
          {myInstitution && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 text-xs">
              <div>
                <span className="text-slate-500 block">AICTE Permanent ID</span>
                <strong className="text-slate-900 font-mono">{myInstitution.aicte_id}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Institution Category</span>
                <strong className="text-slate-900">{myInstitution.type}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Location</span>
                <strong className="text-slate-900">
                  {myInstitution.city}, {myInstitution.state}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Affiliated University</span>
                <strong className="text-slate-900 truncate block">
                  {myInstitution.affiliated_university || 'State Technical University'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Sanctioned Intake</span>
                <strong className="text-slate-900">{myInstitution.total_intake} Seats</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Contact Email</span>
                <strong className="text-slate-900">{myInstitution.contact_email || user?.email}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Institute Compliance & Document Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Institute Compliance %"
            value={`${myInstitution?.compliance_score ?? stats.average_compliance_score}%`}
            subtitle="Regulatory compliance score"
            icon={<Percent className="h-5 w-5" />}
            accentColor="emerald"
          />
          <StatCard
            title="Uploaded Documents"
            value={documents.length}
            subtitle={`${stats.verified_documents} Verified`}
            icon={<FileText className="h-5 w-5" />}
            accentColor="navy"
          />
          <StatCard
            title="Pending Documents"
            value={pendingList.length}
            subtitle="Under officer review"
            icon={<Clock className="h-5 w-5" />}
            accentColor="amber"
          />
          <StatCard
            title="Missing Documents"
            value={missingDocs?.missing_documents.length ?? stats.missing_documents_count}
            subtitle="Mandatory files required"
            icon={<AlertTriangle className="h-5 w-5" />}
            accentColor="slate"
          />
          <StatCard
            title="Renewal / Expiry Alerts"
            value={
              (expiryAlerts?.expired_count || 0) + (expiryAlerts?.expiring_soon_count || 0)
            }
            subtitle={`${expiryAlerts?.expired_count || 0} expired, ${expiryAlerts?.expiring_soon_count || 0} due soon`}
            icon={<CalendarX className="h-5 w-5" />}
            accentColor="red"
          />
        </div>

        {/* Document Upload Form + Missing Documents Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card
            className="lg:col-span-5"
            title="Upload Institutional Document (PDF / Image)"
            subtitle="Automatic OCR text extraction, SHA-256 duplicate detection, and expiry validation run on upload"
          >
            <form onSubmit={handleInstituteUpload} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Category
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label} ({dt.value})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select File (PDF, PNG, JPG)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-md p-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={uploadIssueDate}
                    onChange={(e) => setUploadIssueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={uploadExpiryDate}
                    onChange={(e) => setUploadExpiryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={uploading}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Upload & Validate Document
              </Button>
            </form>
          </Card>

          <Card
            className="lg:col-span-7"
            title="Mandatory Regulatory Documents Checklist (Missing vs Uploaded)"
            subtitle={`Document Completeness: ${missingDocs?.completeness_percentage ?? 62}% of mandatory AICTE documents submitted`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DOCUMENT_TYPES.map((dt) => {
                const uploadedDoc = documents.find(
                  (d) => d.document_type === dt.value && d.status !== 'REJECTED'
                );
                const isMissing = !uploadedDoc;
                return (
                  <div
                    key={dt.value}
                    className={`p-3 rounded-md border flex items-center justify-between gap-2 text-xs ${
                      isMissing
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{dt.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {uploadedDoc ? uploadedDoc.filename : 'Not uploaded yet'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {uploadedDoc ? (
                        <StatusBadge status={uploadedDoc.status} />
                      ) : (
                        <>
                          <StatusBadge status="MISSING" />
                          <button
                            type="button"
                            onClick={() => setUploadDocType(dt.value)}
                            className="px-2 py-1 text-[11px] font-semibold rounded bg-blue-700 text-white hover:bg-blue-800"
                          >
                            Select
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Expiry Dates & Renewal Reminders */}
        <Card
          title="Expiry Dates & Renewal Reminders"
          subtitle="Certificates and NOCs requiring renewal or attention"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-md border border-red-200 bg-red-50/50">
              <h4 className="text-xs font-bold text-red-900 mb-2">
                Expired Documents ({expiryAlerts?.expired_count || 0})
              </h4>
              {expiryAlerts?.expired_documents && expiryAlerts.expired_documents.length > 0 ? (
                <div className="space-y-2">
                  {expiryAlerts.expired_documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2 bg-white rounded border border-red-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{doc.filename}</span>
                        <span className="block text-[11px] text-red-600">
                          Expired on: {formatDate(doc.expiry_date)}
                        </span>
                      </div>
                      <StatusBadge status="EXPIRED" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600">No expired documents for your institution.</p>
              )}
            </div>

            <div className="p-3.5 rounded-md border border-amber-200 bg-amber-50/50">
              <h4 className="text-xs font-bold text-amber-900 mb-2">
                Upcoming Renewal Reminders ({expiryAlerts?.expiring_soon_count || 0})
              </h4>
              {expiryAlerts?.expiring_soon && expiryAlerts.expiring_soon.length > 0 ? (
                <div className="space-y-2">
                  {expiryAlerts.expiring_soon.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2 bg-white rounded border border-amber-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{doc.filename}</span>
                        <span className="block text-[11px] text-amber-700">
                          Expires: {formatDate(doc.expiry_date)} ({doc.days_remaining} days left)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-semibold">
                        Renewal Due
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600">All active certificates are valid beyond 90 days.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Uploaded Document List & Verification Status */}
        <Card
          title="Uploaded Documents & Verification Status"
          subtitle="All documents uploaded by your institution with OCR text extraction, expiry dates, and verification status"
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Authenticity Score</th>
                  <th className="py-3 px-4 text-right">OCR & Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{doc.filename}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        SHA-256: {doc.file_hash ? `${doc.file_hash.slice(0, 14)}...` : 'Calculated'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {formatDocumentType(doc.document_type)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {doc.issue_date ? formatDate(doc.issue_date) : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {doc.expiry_date ? formatDate(doc.expiry_date) : 'Permanent'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {doc.authenticity_score != null ? `${doc.authenticity_score}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOcrDoc(doc)}
                          className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium"
                        >
                          View OCR
                        </button>
                        <a
                          href={getDownloadUrl(doc.file_path, doc.filename)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white font-medium"
                        >
                          File
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {selectedOcrDoc && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    OCR Text Extraction — {selectedOcrDoc.filename}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Category: {formatDocumentType(selectedOcrDoc.document_type)}
                  </p>
                </div>
                <StatusBadge status={selectedOcrDoc.status} />
              </div>
              <pre className="p-3 rounded bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {selectedOcrDoc.extracted_text || 'No OCR text extracted.'}
              </pre>
              <div className="flex justify-end">
                <Button variant="primary" size="sm" onClick={() => setSelectedOcrDoc(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 3. REVIEWER DASHBOARD (reviewer@aibmez.demo)
  // ============================================================================
  const waitingDocs = documents.filter((d) => d.status === 'PENDING' || d.status === 'PROCESSING');
  const flaggedDocs = documents.filter(
    (d) =>
      d.status === 'DUPLICATE' ||
      d.status === 'SUSPICIOUS' ||
      d.status === 'EXPIRED' ||
      d.status === 'FLAGGED' ||
      d.is_duplicate ||
      d.is_expired ||
      (d.fraud_Auto_flags && d.fraud_Auto_flags.length > 0 && d.status !== 'VERIFIED')
  );
  const verifiedDocsList = documents.filter((d) => d.status === 'VERIFIED');

  const filteredReviewerDocs =
    reviewerFilter === 'WAITING'
      ? waitingDocs
      : reviewerFilter === 'FLAGGED'
      ? flaggedDocs
      : reviewerFilter === 'VERIFIED'
      ? verifiedDocsList
      : documents;

  return (
    <div className="space-y-6">
      {/* Reviewer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded bg-indigo-700 text-white">
              Reviewer Dashboard
            </span>
            <span className="text-xs text-slate-500">Officer: {user?.email}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Document Verification & Compliance Review Queue
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Inspect assigned institutional documents, review flagged/duplicate/expired files, and record verification actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={loadDashboardData}
          >
            Refresh Queue
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckSquare className="h-3.5 w-3.5" />}
            onClick={() => navigate('/verification')}
          >
            Official Verification Workbench
          </Button>
        </div>
      </div>

      {/* Reviewer Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Assigned Documents"
          value={documents.length}
          subtitle="Total files in queue"
          icon={<FileText className="h-5 w-5" />}
          accentColor="navy"
        />
        <StatCard
          title="Waiting for Review"
          value={waitingDocs.length}
          subtitle="Pending officer action"
          icon={<Clock className="h-5 w-5" />}
          accentColor="amber"
        />
        <StatCard
          title="Flagged Documents"
          value={flaggedDocs.length}
          subtitle="Duplicate / Suspicious / Expired"
          icon={<ShieldAlert className="h-5 w-5" />}
          accentColor="red"
        />
        <StatCard
          title="Verified Documents"
          value={verifiedDocsList.length}
          subtitle="Approved by reviewer"
          icon={<CheckCircle2 className="h-5 w-5" />}
          accentColor="emerald"
        />
        <StatCard
          title="Assigned Applications"
          value={applications.length}
          subtitle={`${stats.pending_reviews} awaiting decision`}
          icon={<FileSpreadsheet className="h-5 w-5" />}
          accentColor="cyan"
        />
      </div>

      {/* Flagged Documents Alert Section */}
      <Card
        title="Flagged Documents Requiring Attention (Duplicate, Suspicious, Expired)"
        subtitle="Documents automatically flagged by SHA-256 hash comparison, OCR anomaly detection, or expiry date check"
      >
        {flaggedDocs.length === 0 ? (
          <p className="text-xs text-slate-600">No flagged documents currently pending.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {flaggedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-md border border-rose-200 bg-rose-50/40 flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <StatusBadge status={doc.status} />
                    <span className="text-[11px] font-semibold text-slate-600">
                      Auth Score: {doc.authenticity_score ?? 45}%
                    </span>
                  </div>
                  <p className="font-bold text-slate-900">{doc.filename}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {getInstitutionName(doc.institution_id)} • {formatDocumentType(doc.document_type)}
                  </p>
                  {doc.fraud_Auto_flags && doc.fraud_Auto_flags.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[11px] text-rose-700 bg-white p-2 rounded border border-rose-200">
                      {doc.fraud_Auto_flags.map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-rose-200/60">
                  <button
                    type="button"
                    onClick={() => setSelectedOcrDoc(doc)}
                    className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium"
                  >
                    Inspect OCR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDocumentStatusUpdate(doc.id, 'VERIFIED')}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    Override & Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDocumentStatusUpdate(doc.id, 'SUSPICIOUS')}
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  >
                    Confirm Flag
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Assigned Documents & Verification Actions Table */}
      <Card
        title="Assigned Documents & Verification Actions"
        subtitle="Filter by review status and execute verification decisions directly"
        action={
          <div className="flex items-center gap-1.5">
            {(['ALL', 'WAITING', 'FLAGGED', 'VERIFIED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setReviewerFilter(tab)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  reviewerFilter === tab
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab === 'ALL'
                  ? `All (${documents.length})`
                  : tab === 'WAITING'
                  ? `Waiting (${waitingDocs.length})`
                  : tab === 'FLAGGED'
                  ? `Flagged (${flaggedDocs.length})`
                  : `Verified (${verifiedDocsList.length})`}
              </button>
            ))}
          </div>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expiry</th>
                <th className="py-3 px-4 text-right">Verification Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredReviewerDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{doc.filename}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      SHA-256: {doc.file_hash ? `${doc.file_hash.slice(0, 14)}...` : 'Verified'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {getInstitutionName(doc.institution_id)}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {formatDocumentType(doc.document_type)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {doc.expiry_date ? formatDate(doc.expiry_date) : 'Permanent'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedOcrDoc(doc)}
                        className="px-2 py-1 text-[11px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
                      >
                        <Eye className="h-3 w-3 inline mr-1" />
                        OCR
                      </button>
                      <button
                        type="button"
                        disabled={updatingDocId === doc.id}
                        onClick={() => handleDocumentStatusUpdate(doc.id, 'VERIFIED')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        disabled={updatingDocId === doc.id}
                        onClick={() => handleDocumentStatusUpdate(doc.id, 'SUSPICIOUS')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        Flag Suspicious
                      </button>
                      <button
                        type="button"
                        disabled={updatingDocId === doc.id}
                        onClick={() => handleDocumentStatusUpdate(doc.id, 'DUPLICATE')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Mark Duplicate
                      </button>
                      <button
                        type="button"
                        disabled={updatingDocId === doc.id}
                        onClick={() => handleDocumentStatusUpdate(doc.id, 'EXPIRED')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-red-700 hover:bg-red-800 text-white"
                      >
                        Mark Expired
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Assigned Applications & Review History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card
          className="lg:col-span-7"
          title="Assigned Institutional Applications"
          subtitle="Approve applications or raise deficiency notices after document inspection"
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <th className="py-2.5 px-4">Application #</th>
                  <th className="py-2.5 px-4">Institution</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                      {app.application_number}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {app.institution_name || getInstitutionName(app.institution_id)}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleApplicationReview(
                              app.id,
                              'APPROVED',
                              'Verified all mandatory regulatory documents and compliance norms.'
                            )
                          }
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleApplicationReview(
                              app.id,
                              'DEFICIENCY_RAISED',
                              'Deficiency noted in submitted documents; please upload renewed certificates.'
                            )
                          }
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Raise Deficiency
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          className="lg:col-span-5"
          title="Reviewer Action History"
          subtitle="Recent document verifications, flags, and audit entries"
        >
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {stats.recent_activities.map((act) => (
              <div
                key={act.id}
                className="p-2.5 rounded border border-slate-200 bg-slate-50 flex items-start justify-between gap-2 text-xs"
              >
                <div className="flex items-start gap-2">
                  <History className="h-3.5 w-3.5 text-blue-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900">
                      {act.action.replace(/_/g, ' ')}
                    </span>
                    <p className="text-[11px] text-slate-600">
                      {act.user_email} • {act.entity_type} #{act.entity_id}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {formatDateTime(act.created_at)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {selectedOcrDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Reviewer OCR Inspection — {selectedOcrDoc.filename}
                </h3>
                <p className="text-xs text-slate-500">
                  Institution: {getInstitutionName(selectedOcrDoc.institution_id)}
                </p>
              </div>
              <StatusBadge status={selectedOcrDoc.status} />
            </div>
            <pre className="p-3 rounded bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
              {selectedOcrDoc.extracted_text || 'No OCR text available.'}
            </pre>
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleDocumentStatusUpdate(selectedOcrDoc.id, 'VERIFIED');
                    setSelectedOcrDoc(null);
                  }}
                >
                  Mark Verified
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    handleDocumentStatusUpdate(selectedOcrDoc.id, 'SUSPICIOUS');
                    setSelectedOcrDoc(null);
                  }}
                >
                  Flag Suspicious
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedOcrDoc(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
