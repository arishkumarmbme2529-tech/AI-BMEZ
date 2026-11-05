import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UploadCloud, CheckCircle2, FileText } from 'lucide-react';
import { useUploadDocument, useDocumentTypes } from '../../hooks/useDocuments';
import { useInstitutions } from '../../hooks/useInstitutions';
import { useApplications } from '../../hooks/useApplications';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import type { Document } from '../../types';

export const DocumentUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const preAppId = searchParams.get('application_id') || '';
  const preInstId = searchParams.get('institution_id') || '';

  const { types } = useDocumentTypes();
  const { items: institutions } = useInstitutions();
  const { items: applications } = useApplications();
  const { upload, loading, progress } = useUploadDocument();

  const [file, setFile] = useState<File | null>(null);
  const [institutionId, setInstitutionId] = useState(
    preInstId || (user?.institution_id ? String(user.institution_id) : '')
  );
  const [applicationId, setApplicationId] = useState(preAppId);
  const [docType, setDocType] = useState('AFFIDAVIT');
  const [issueDate, setIssueDate] = useState('2026-01-15');
  const [expiryDate, setExpiryDate] = useState('2027-06-30');
  const [uploadedDoc, setUploadedDoc] = useState<Document | null>(null);

  useEffect(() => {
    if (!institutionId && institutions.length > 0) {
      setInstitutionId(String(user?.institution_id || institutions[0].id));
    }
  }, [institutions, institutionId, user?.institution_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('institution_id', institutionId || '1');
    formData.append('document_type', docType);
    if (applicationId) formData.append('application_id', applicationId);
    if (issueDate) formData.append('issue_date', issueDate);
    if (expiryDate) formData.append('expiry_date', expiryDate);
    formData.append('file', file);

    const res = await upload(formData);
    if (res) {
      setUploadedDoc(res);
      setFile(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 bg-white p-5 rounded-lg border border-slate-200">
        <button
          onClick={() => navigate('/documents')}
          className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-blue-700" />
            Upload Institutional Document
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Upload PDF or image documents for automated OCR extraction, SHA-256 duplicate checking, and expiry verification.
          </p>
        </div>
      </div>

      {uploadedDoc && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      Uploaded: {uploadedDoc.filename}
                    </p>
                    <StatusBadge status={uploadedDoc.status} />
                  </div>
                  <p className="text-xs font-mono text-slate-600 mt-0.5">
                    SHA-256: {uploadedDoc.file_hash}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => navigate(`/ocr?document_id=${uploadedDoc.id}`)}
                >
                  Inspect OCR
                </Button>
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => navigate('/documents')}
                >
                  View Repository
                </Button>
              </div>
            </div>
            {uploadedDoc.extracted_text && (
              <pre className="p-3 rounded bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap">
                {uploadedDoc.extracted_text}
              </pre>
            )}
          </div>
        </Card>
      )}

      <Card
        title="Document Classification & Upload"
        subtitle="Select institution, document category, validity dates, and file (PDF, PNG, JPG)"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institution
              </label>
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                required
              >
                {institutions.map((i) => (
                  <option key={i.id} value={String(i.id)}>
                    {i.name} ({i.aicte_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Linked Application (Optional)
              </label>
              <select
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              >
                <option value="">General Institution Document</option>
                {applications.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.application_number || a.application_id} — {a.institution_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Category
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                required
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-300 rounded-md bg-slate-50 text-center">
            <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Select a PDF, PNG, or JPG document file to upload
            </p>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-800"
            />
            {file && (
              <p className="text-xs text-emerald-700 font-semibold mt-2">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          {loading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Uploading & running OCR + SHA-256 verification...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-700 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => navigate('/documents')}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading} disabled={!file}>
              Upload & Validate Document
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
