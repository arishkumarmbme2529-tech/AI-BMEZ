import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Upload, Scan, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments, useDocumentTypes } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import api, { getDownloadUrl } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { formatDate, formatFileSize, formatDocumentType } from '../../utils/helpers';

export const DocumentListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { items, total, loading, refetch } = useDocuments({
    status: statusFilter || undefined,
    document_type: typeFilter || undefined,
  });

  const { types } = useDocumentTypes();
  const canReview =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'OFFICER' ||
    user?.role === 'REVIEWER';

  const handleUpdateStatus = async (docId: number, status: string) => {
    try {
      await api.put(`/documents/${docId}/status`, { status }, { params: { status } });
      toast.success(`Document #${docId} status updated to ${status}`);
      refetch();
    } catch {
      toast.error('Failed to update document status');
    }
  };

  const handleRunOcr = async (docId: number) => {
    try {
      const { data } = await api.post(`/documents/${docId}/analyze`);
      toast.success(`OCR & Hash Check completed: ${data.status}`);
      refetch();
    } catch {
      toast.error('OCR analysis failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-700" />
            Institutional Document Repository
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Centralized storage with SHA-256 duplicate detection, OCR text extraction, and expiry tracking ({total} documents)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={refetch}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            leftIcon={<Upload className="h-3.5 w-3.5" />}
            onClick={() => navigate('/documents/upload')}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
          >
            <option value="">All Document Categories</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
          >
            <option value="">All Verification Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="DUPLICATE">Duplicate</option>
            <option value="SUSPICIOUS">Suspicious</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <div className="flex items-center justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTypeFilter('');
                setStatusFilter('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Documents Table */}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Document Filename</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading documents...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No documents match the selected filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const fname = row.filename || row.original_filename || `Document_${row.id}.pdf`;
                  const fhash = row.file_hash || row.sha256_hash || '';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{fname}</p>
                        <p className="text-[11px] font-mono text-slate-500">
                          SHA-256: {fhash ? `${fhash.slice(0, 16)}...` : 'Calculated'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {formatDocumentType(row.document_type || row.document_type_name || 'Document')}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatFileSize(row.file_size)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(row.created_at || row.upload_date)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {row.expiry_date ? formatDate(row.expiry_date) : 'Permanent'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleRunOcr(row.id)}
                            className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium inline-flex items-center gap-1"
                          >
                            <Scan className="h-3 w-3" />
                            OCR Check
                          </button>
                          {canReview && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(row.id, 'VERIFIED')}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(row.id, 'SUSPICIOUS')}
                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                              >
                                Suspicious
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(row.id, 'DUPLICATE')}
                                className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(row.id, 'EXPIRED')}
                                className="px-2 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-semibold"
                              >
                                Expired
                              </button>
                            </>
                          )}
                          <a
                            href={getDownloadUrl(row.file_path, fname)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                            title="Open / Download File"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
