import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Shield, Copy, AlertTriangle, CheckCircle2, FileSearch } from 'lucide-react';
import { useDocuments, useAuthAnalysis } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/Badge';
import { AlertBox } from '../../components/ui/Alert';
import { formatDateTime } from '../../utils/helpers';

export const DocumentAuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isDuplicateView = location.pathname.includes('duplicates');
  const { user } = useAuth();
  const isOfficer = user?.role === 'SUPER_ADMIN' || user?.role === 'OFFICER';

  const initialDocId = searchParams.get('document_id') || '';
  const { items: documents } = useDocuments();
  const [selectedDocId, setSelectedDocId] = useState(initialDocId);

  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(String(documents[0].id));
    }
  }, [documents]);

  const { result, loading, runAnalysis, reviewResult } = useAuthAnalysis(selectedDocId);
  const selectedDoc = documents.find((d) => String(d.id) === String(selectedDocId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            {isDuplicateView ? (
              <Copy className="h-6 w-6 text-purple-600" />
            ) : (
              <Shield className="h-6 w-6 text-brand-navy" />
            )}
            {isDuplicateView
              ? 'Cryptographic & Perceptual Duplicate Detection Engine'
              : 'AI Document Authentication & Preliminary Anomaly Detection'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            SHA-256 exact hashing, perceptual image hashing (pHash/dHash), metadata forensics, and
            cross-field consistency checks
          </p>
        </div>
      </div>

      <AlertBox variant="warning" title="Important Advisory on AI Preliminary Findings">
        AI-generated anomaly and authentication indicators are preliminary screening signals only.
        A document must never be declared forged solely on an automated prediction. All flagged
        documents require human verification officer review and official issuing authority
        confirmation.
      </AlertBox>

      {/* Selector Bar */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="flex-1">
            <Select
              label="Select Document for Authentication & Duplicate Screening"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              options={
                documents.length === 0
                  ? [{ value: '', label: 'No uploaded documents available' }]
                  : documents.map((d) => ({
                      value: String(d.id),
                      label: `${d.original_filename} (${d.document_type_name || 'Document'})`,
                    }))
              }
            />
          </div>
          <Button
            variant="primary"
            loading={loading}
            disabled={!selectedDocId}
            leftIcon={<FileSearch className="h-4 w-4" />}
            onClick={runAnalysis}
          >
            Run Authentication & Hash Analysis
          </Button>
        </div>
      </Card>

      {selectedDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Hash & Duplicate Summary */}
          <Card className="lg:col-span-1">
            <CardHeader
              title="Cryptographic & Perceptual Hashes"
              subtitle="Exact and near-duplicate comparison"
            />
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-slate-400">Document Filename</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDoc.original_filename}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-slate-400">SHA-256 Exact File Hash</p>
                <p className="font-mono text-[11px] text-brand-navy break-all mt-1">
                  {selectedDoc.sha256_hash || 'Computed upon upload'}
                </p>
              </div>
              {result && (
                <>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Authentication Status</span>
                    <StatusBadge status={result.status} />
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Similarity Score</span>
                    <span className="font-bold text-slate-900">
                      {result.similarity_score != null
                        ? `${(result.similarity_score * 100).toFixed(1)}%`
                        : '0.0% (Unique)'}
                    </span>
                  </div>
                  {result.duplicate_document_id && (
                    <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-900">
                      <p className="font-bold">Matching Document Reference Found</p>
                      <p className="mt-0.5">
                        Matches Document ID #{result.duplicate_document_id} in repository.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Right: Anomaly Findings & Metadata Forensics */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Preliminary Anomaly & Metadata Forensics Report"
              subtitle={
                result
                  ? `Analyzed at ${formatDateTime(result.analyzed_at)}`
                  : 'Run analysis to generate findings'
              }
              action={
                result && result.id && isOfficer ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => reviewResult(result.id!, 'MANUAL_REVIEW', 'Flagged for manual review')}
                    >
                      Flag Manual Review
                    </Button>
                    <Button
                      size="xs"
                      variant="success"
                      onClick={() => reviewResult(result.id!, 'NO_ANOMALY', 'Cleared by officer')}
                    >
                      Clear Document
                    </Button>
                  </div>
                ) : undefined
              }
            />

            {!result ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Click "Run Authentication & Hash Analysis" above to inspect this document.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Summary & Recommendation */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Analysis Explanation:</span>
                    <StatusBadge status={result.status} />
                  </div>
                  <p className="text-slate-700">{result.explanation}</p>
                  <p className="font-semibold text-brand-navy pt-1">
                    Recommended Action: {result.recommendation}
                  </p>
                </div>

                {/* Findings List */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Detected Indicators ({result.anomaly_findings?.length || 0})
                  </h4>
                  {!result.anomaly_findings || result.anomaly_findings.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <span>
                        No compression anomalies, metadata discrepancies, or date mismatches
                        detected in preliminary screening.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {result.anomaly_findings.map((f, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              {f.type.replace(/_/g, ' ')}
                            </span>
                            <StatusBadge status={f.severity} />
                          </div>
                          <p className="text-slate-700">{f.description}</p>
                          {f.detail && (
                            <p className="font-mono text-[11px] text-slate-500">{f.detail}</p>
                          )}
                          {f.note && <p className="text-[11px] text-slate-400 italic">{f.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metadata Analysis JSON */}
                {result.metadata_analysis && Object.keys(result.metadata_analysis).length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Extracted File & PDF Metadata
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      {Object.entries(result.metadata_analysis).map(([k, v]) => (
                        <div key={k} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[10px] uppercase text-slate-400">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <p className="font-mono font-medium text-slate-800 truncate mt-0.5">
                            {String(v || '—')}
                          </p>
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

