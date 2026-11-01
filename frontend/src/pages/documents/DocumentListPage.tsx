import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Upload, Scan, Shield, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments, useDocumentTypes } from '../../hooks/useDocuments';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import { formatDate, formatFileSize } from '../../utils/helpers';
import type { Document } from '../../types';

export const DocumentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { items, total, loading, refetch } = useDocuments({
    status: statusFilter || undefined,
    document_type_id: typeFilter ? Number(typeFilter) : undefined,
  });

  const { types } = useDocumentTypes();

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document removed');
      refetch();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FolderOpen className="h-6 w-6 text-brand-navy" />
            Document Management Repository
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Centralized storage with SHA-256 cryptographic hashing, OCR extraction, and AI
            authentication ({total} documents)
          </p>
        </div>
        <Button
          leftIcon={<Upload className="h-4 w-4" />}
          onClick={() => navigate('/documents/upload')}
        >
          Upload Supporting Document
        </Button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Document Types' },
              ...types.map((t) => ({ value: String(t.id), label: t.name })),
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Verification Statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'VERIFIED', label: 'Verified' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'EXPIRED', label: 'Expired' },
            ]}
          />
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
      <Card padding="none">
        <Table<Document>
          loading={loading}
          data={items}
          keyExtractor={(row) => String(row.id)}
          columns={[
            {
              key: 'name',
              header: 'Document Filename',
              cell: (row) => (
                <div>
                  <p className="font-semibold text-slate-900">{row.original_filename}</p>
                  <p className="text-[11px] font-mono text-slate-400">
                    SHA-256: {row.sha256_hash ? `${row.sha256_hash.slice(0, 16)}...` : '—'}
                  </p>
                </div>
              ),
            },
            {
              key: 'type',
              header: 'Category',
              cell: (row) => (
                <span className="text-xs font-medium text-slate-700">
                  {row.document_type_name || '—'}
                </span>
              ),
            },
            {
              key: 'size',
              header: 'Size / Format',
              cell: (row) => (
                <span className="text-xs text-slate-500">
                  {formatFileSize(row.file_size)} • {row.mime_type?.split('/')[1]?.toUpperCase()}
                </span>
              ),
            },
            {
              key: 'date',
              header: 'Uploaded On',
              cell: (row) => (
                <span className="text-xs text-slate-500">{formatDate(row.upload_date)}</span>
              ),
            },
            {
              key: 'expiry',
              header: 'Expiry Date',
              cell: (row) => (
                <span className="text-xs text-slate-600">{formatDate(row.expiry_date)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'actions',
              header: 'AI & File Actions',
              cell: (row) => (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    variant="secondary"
                    leftIcon={<Scan className="h-3.5 w-3.5" />}
                    onClick={() => navigate(`/ocr?document_id=${row.id}`)}
                  >
                    OCR
                  </Button>
                  <Button
                    size="xs"
                    variant="cyan"
                    leftIcon={<Shield className="h-3.5 w-3.5" />}
                    onClick={() => navigate(`/authentication?document_id=${row.id}`)}
                  >
                    Auth
                  </Button>
                  <a
                    href={`http://localhost:8000/api/v1/documents/${row.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

