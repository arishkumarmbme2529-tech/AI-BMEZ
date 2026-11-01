import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Scan, Edit3, CheckCircle2, History, FileText } from 'lucide-react';
import { useDocuments, useOCR } from '../../hooks/useDocuments';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { formatDateTime, formatFileSize } from '../../utils/helpers';

export const OCRPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get('document_id') || '';

  const { items: documents } = useDocuments();
  const [selectedDocId, setSelectedDocId] = useState(initialDocId);

  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(String(documents[0].id));
    }
  }, [documents]);

  const { result, loading, processOCR, correctOCR } = useOCR(selectedDocId);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    institution_name: '',
    cert_number: '',
    issue_date: '',
    expiry_date: '',
    issuing_authority: '',
  });

  useEffect(() => {
    if (result) {
      setForm({
        institution_name: result.institution_name || '',
        cert_number: result.cert_number || '',
        issue_date: result.issue_date || '',
        expiry_date: result.expiry_date || '',
        issuing_authority: result.issuing_authority || '',
      });
    }
  }, [result]);

  const selectedDoc = documents.find((d) => String(d.id) === String(selectedDocId));

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) return;
    await correctOCR(result.id, form);
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Scan className="h-6 w-6 text-cyan-600" />
            OCR & Intelligent Field Extraction Engine
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Extract structured regulatory fields from PDFs and scanned images with human-in-the-loop
            correction tracking
          </p>
        </div>
      </div>

      {/* Document Selector Bar */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="flex-1">
            <Select
              label="Select Document to Process or Review"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              options={
                documents.length === 0
                  ? [{ value: '', label: 'No uploaded documents available — upload a file first' }]
                  : documents.map((d) => ({
                      value: String(d.id),
                      label: `${d.original_filename} (${d.document_type_name || 'Document'})`,
                    }))
              }
            />
          </div>
          <Button
            variant="cyan"
            loading={loading}
            disabled={!selectedDocId}
            leftIcon={<Scan className="h-4 w-4" />}
            onClick={processOCR}
          >
            Run OCR Extraction
          </Button>
        </div>
      </Card>

      {selectedDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Document Metadata & Raw Text */}
          <Card>
            <CardHeader
              title="Source Document & Raw Extracted Text"
              subtitle={selectedDoc.original_filename}
            />
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Document Type:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedDoc.document_type_name}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">File Size / Format:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {formatFileSize(selectedDoc.file_size)} ({selectedDoc.mime_type})
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">SHA-256 Cryptographic Hash:</span>
                  <p className="font-mono text-[11px] text-brand-navy break-all mt-0.5">
                    {selectedDoc.sha256_hash}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    OCR Raw Text Stream
                  </p>
                  {result && (
                    <Badge variant="info">
                      Engine: {result.ocr_engine} • Confidence:{' '}
                      {Math.round((result.confidence_score || 0) * 100)}%
                    </Badge>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs h-72 overflow-y-auto whitespace-pre-wrap">
                  {result?.extracted_text ||
                    'No OCR extraction run yet. Click "Run OCR Extraction" above to extract text and structured fields.'}
                </div>
              </div>
            </div>
          </Card>

          {/* Right: Structured Fields & Correction Form */}
          <Card>
            <CardHeader
              title="Structured Regulatory Field Extraction"
              subtitle="Extracted entities with authorized correction & audit retention"
              action={
                result && !editing ? (
                  <Button
                    size="xs"
                    variant="secondary"
                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                    onClick={() => setEditing(true)}
                  >
                    Correct Fields
                  </Button>
                ) : undefined
              }
            />

            {!result ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Run OCR processing on the selected document to view structured fields.
              </div>
            ) : editing ? (
              <form onSubmit={handleSaveCorrection} className="space-y-3.5">
                <Input
                  label="Institution Name"
                  value={form.institution_name}
                  onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
                />
                <Input
                  label="Certificate / Approval Number"
                  value={form.cert_number}
                  onChange={(e) => setForm({ ...form, cert_number: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Issue Date"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                  />
                  <Input
                    label="Expiry Date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  />
                </div>
                <Input
                  label="Issuing Authority"
                  value={form.issuing_authority}
                  onChange={(e) => setForm({ ...form, issuing_authority: e.target.value })}
                />
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" loading={loading}>
                    Save Corrections (Retain Original)
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400">Extracted Institution Name</span>
                    <p className="font-semibold text-slate-900 mt-1">
                      {result.institution_name || 'Not detected'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400">Certificate / Registration No.</span>
                    <p className="font-mono font-bold text-brand-navy mt-1">
                      {result.cert_number || 'Not detected'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400">Issue Date</span>
                    <p className="font-semibold text-slate-900 mt-1">
                      {result.issue_date || 'Not detected'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400">Expiry / Validity Date</span>
                    <p className="font-semibold text-slate-900 mt-1">
                      {result.expiry_date || 'Not detected'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
                    <span className="text-slate-400">Issuing Authority</span>
                    <p className="font-semibold text-slate-900 mt-1">
                      {result.issuing_authority || 'Not detected'}
                    </p>
                  </div>
                </div>

                {/* Correction History */}
                {result.corrections && result.corrections.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                      <History className="h-3.5 w-3.5 text-cyan-600" />
                      Manual Correction Audit History ({result.corrections.length})
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {result.corrections.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-[11px]"
                        >
                          <span className="font-bold text-slate-800">{c.field}:</span>{' '}
                          <span className="line-through text-slate-400">{c.original || 'empty'}</span>{' '}
                          → <span className="font-semibold text-emerald-700">{c.corrected}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Corrected at {formatDateTime(c.corrected_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

