import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UploadCloud, CheckCircle2 } from 'lucide-react';
import { useUploadDocument, useDocumentTypes } from '../../hooks/useDocuments';
import { useInstitutions } from '../../hooks/useInstitutions';
import { useApplications } from '../../hooks/useApplications';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { DropZone } from '../../components/ui/DropZone';

export const DocumentUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preAppId = searchParams.get('application_id') || '';
  const preInstId = searchParams.get('institution_id') || '';

  const { types } = useDocumentTypes();
  const { items: institutions } = useInstitutions();
  const { items: applications } = useApplications();
  const { upload, loading, progress } = useUploadDocument();

  const [files, setFiles] = useState<File[]>([]);
  const [institutionId, setInstitutionId] = useState(preInstId);
  const [applicationId, setApplicationId] = useState(preAppId);
  const [docTypeId, setDocTypeId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);

  useEffect(() => {
    if (!institutionId && institutions.length > 0) {
      setInstitutionId(String(institutions[0].id));
    }
    if (!docTypeId && types.length > 0) {
      setDocTypeId(String(types[0].id));
    }
  }, [institutions, types]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    const formData = new FormData();
    formData.append('institution_id', institutionId);
    formData.append('document_type_id', docTypeId);
    if (applicationId) formData.append('application_id', applicationId);
    if (expiryDate) formData.append('expiry_date', expiryDate);
    formData.append('file', files[0]);

    const res = await upload(formData);
    if (res) {
      setUploadedDoc(res);
      setFiles([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/documents')}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="h-6 w-6 text-cyan-600" />
            Upload & Categorize Regulatory Document
          </h1>
          <p className="text-sm text-slate-500">
            Files are validated, stored securely, and automatically indexed with SHA-256 hashes
          </p>
        </div>
      </div>

      {uploadedDoc && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-950">
                  Uploaded: {uploadedDoc.original_filename}
                </p>
                <p className="text-xs font-mono text-emerald-700 mt-0.5">
                  SHA-256: {uploadedDoc.sha256_hash}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="secondary"
                onClick={() => navigate(`/ocr?document_id=${uploadedDoc.id}`)}
              >
                Run OCR Now
              </Button>
              <Button
                size="xs"
                variant="cyan"
                onClick={() => navigate(`/authentication?document_id=${uploadedDoc.id}`)}
              >
                Run AI Auth Check
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Document Classification & Upload"
          subtitle="Select institution, application reference, and document type"
        />
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Institution"
              required
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              options={institutions.map((i) => ({
                value: String(i.id),
                label: `${i.name} (${i.aicte_id})`,
              }))}
            />
            <Select
              label="Linked Application (Optional)"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              options={[
                { value: '', label: 'General Institution Document (Not Linked)' },
                ...applications.map((a) => ({
                  value: String(a.id),
                  label: `${a.application_id} — ${a.title}`,
                })),
              ]}
            />
            <Select
              label="Document Type / Category"
              required
              value={docTypeId}
              onChange={(e) => setDocTypeId(e.target.value)}
              options={types.map((t) => ({
                value: String(t.id),
                label: `${t.name} (${t.code})${t.is_required ? ' *' : ''}`,
              }))}
            />
            <Input
              label="Certificate Expiry Date (If Applicable)"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <DropZone
            files={files}
            onDrop={(accepted) => setFiles(accepted)}
            onRemove={(idx) => setFiles(files.filter((_, i) => i !== idx))}
            multiple={false}
            maxSizeMB={10}
          />

          {loading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Uploading & computing SHA-256 hash...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => navigate('/documents')}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={files.length === 0}>
              Upload Document
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

