import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, FileDown, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInstitutions } from '../../hooks/useInstitutions';
import api, { getDownloadUrl } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/helpers';
import type { Report } from '../../types';

export const ReportsPage: React.FC = () => {
  const { items: institutions } = useInstitutions();
  const [selectedInstId, setSelectedInstId] = useState('');
  const [reportType, setReportType] = useState('COMPLIANCE_SUMMARY');
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!selectedInstId && institutions.length > 0) {
      setSelectedInstId(String(institutions[0].id));
    }
  }, [institutions, selectedInstId]);

  const fetchReports = useCallback(() => {
    api
      .get('/reports')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setReports(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerate = async () => {
    if (!selectedInstId) return;
    setGenerating(true);
    try {
      const res = await api.post<Report>('/reports/generate', {
        institution_id: Number(selectedInstId),
        report_type: reportType,
      });
      toast.success('PDF Compliance & Verification Report generated');
      fetchReports();
      const url = getDownloadUrl(res.data.file_path, res.data.title);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to generate PDF report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-700" />
            PDF Compliance & Verification Reports
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Generate and download official PDF dossiers containing institution details, document verification status, OCR summaries, and compliance scores.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={fetchReports}
        >
          Refresh Archive
        </Button>
      </div>

      {/* Generator Bar */}
      <Card
        title="Generate Institutional Validation Report (PDF)"
        subtitle="Select an institution and report format to compile a downloadable PDF report"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Institution
            </label>
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={String(inst.id)}>
                  {inst.name} ({inst.aicte_id}) — Score: {inst.compliance_score ?? 80}%
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            >
              <option value="COMPLIANCE_SUMMARY">Comprehensive Compliance Summary</option>
              <option value="DEFICIENCY_REPORT">Deficiency & Missing Document Audit</option>
              <option value="AUTHENTICATION_AUDIT">Document Authentication & OCR Audit</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <Button
              variant="primary"
              className="w-full"
              isLoading={generating}
              disabled={!selectedInstId}
              leftIcon={<FileDown className="h-4 w-4" />}
              onClick={handleGenerate}
            >
              Generate & Download PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Generated Reports Archive */}
      <Card
        title="Generated PDF Reports Archive"
        subtitle="Download previously compiled PDF validation and compliance reports"
      >
        {reports.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">
            No PDF validation reports generated yet. Select an institution above and click "Generate & Download PDF".
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-md border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {r.title || `Validation Report #${r.id}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Type: {r.report_type.replace(/_/g, ' ')} • Generated on {formatDateTime(r.created_at)}
                    </p>
                  </div>
                </div>
                <a
                  href={getDownloadUrl(r.file_path, r.title)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold self-start sm:self-center"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Download PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
