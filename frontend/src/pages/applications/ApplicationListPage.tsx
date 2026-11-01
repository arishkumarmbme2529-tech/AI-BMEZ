import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Plus, Search, Eye } from 'lucide-react';
import {
  useApplications,
  useApplicationCategories,
  useCreateApplication,
} from '../../hooks/useApplications';
import { useInstitutions } from '../../hooks/useInstitutions';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../utils/helpers';
import type { Application } from '../../types';

export const ApplicationListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const { items, total, loading, refetch } = useApplications({
    search: search || undefined,
    status: statusFilter || undefined,
    category_id: categoryFilter ? Number(categoryFilter) : undefined,
  });

  const { categories } = useApplicationCategories();
  const { items: institutions } = useInstitutions();
  const { create, loading: creating } = useCreateApplication();

  const [form, setForm] = useState({
    institution_id: '',
    category_id: '',
    title: '',
  });

  useEffect(() => {
    if (institutions.length > 0 && !form.institution_id) {
      setForm((f) => ({ ...f, institution_id: String(institutions[0].id) }));
    }
    if (categories.length > 0 && !form.category_id) {
      setForm((f) => ({ ...f, category_id: String(categories[0].id) }));
    }
  }, [institutions, categories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await create({
      institution_id: Number(form.institution_id),
      category_id: Number(form.category_id),
      title: form.title,
    });
    if (res) {
      setModalOpen(false);
      refetch();
      navigate(`/applications/${res.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-brand-navy" />
            Application Management & Validation
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track AICTE approval applications, automated document checklists, and review workflows (
            {total} applications)
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
          New Application
        </Button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            placeholder="Search Application ID or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'SUBMITTED', label: 'Submitted' },
              { value: 'UNDER_REVIEW', label: 'Under Review' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'RETURNED', label: 'Returned for Correction' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: '', label: 'All Approval Categories' },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <div className="flex items-center justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setCategoryFilter('');
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Applications Table */}
      <Card padding="none">
        <Table<Application>
          loading={loading}
          data={items}
          keyExtractor={(row) => String(row.id)}
          onRowClick={(row) => navigate(`/applications/${row.id}`)}
          columns={[
            {
              key: 'application_id',
              header: 'Application ID',
              cell: (row) => (
                <span className="font-mono text-xs font-bold text-brand-navy">
                  {row.application_id}
                </span>
              ),
            },
            {
              key: 'title',
              header: 'Application Title & Institution',
              cell: (row) => (
                <div className="max-w-md">
                  <p className="font-semibold text-slate-900 truncate">{row.title}</p>
                  <p className="text-xs text-slate-500 truncate">{row.institution_name}</p>
                </div>
              ),
            },
            {
              key: 'category',
              header: 'Approval Category',
              cell: (row) => (
                <span className="text-xs font-medium text-slate-700">{row.category_name}</span>
              ),
            },
            {
              key: 'docs',
              header: 'Documents',
              cell: (row) => (
                <span className="text-xs font-semibold text-cyan-700">
                  {row.document_count ?? 0} uploaded
                </span>
              ),
            },
            {
              key: 'submitted_at',
              header: 'Submitted On',
              cell: (row) => (
                <span className="text-xs text-slate-500">
                  {formatDate(row.submitted_at || row.created_at)}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'actions',
              header: 'Actions',
              cell: (row) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => navigate(`/applications/${row.id}`)}
                  >
                    Open Dossier
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* New Application Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Institutional Application"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Select Institution"
            required
            value={form.institution_id}
            onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
            options={institutions.map((i) => ({
              value: String(i.id),
              label: `${i.name} (${i.aicte_id})`,
            }))}
          />
          <Select
            label="Application Approval Category"
            required
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            options={categories.map((c) => ({
              value: String(c.id),
              label: `${c.name} (${c.code})`,
            }))}
          />
          <Input
            label="Application Title / Academic Year"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., Extension of Approval (EOA) 2026-27 — B.Tech Programmes"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create & Generate Checklist
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

