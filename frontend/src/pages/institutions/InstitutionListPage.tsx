import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Eye, Edit } from 'lucide-react';
import { useInstitutions, useCreateInstitution } from '../../hooks/useInstitutions';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import type { Institution, InstitutionFormData } from '../../types';

export const InstitutionListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = user?.role === 'SUPER_ADMIN' || user?.role === 'OFFICER';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const { items, total, loading, refetch } = useInstitutions({
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const { create, loading: creating } = useCreateInstitution();

  const [form, setForm] = useState<InstitutionFormData>({
    name: '',
    aicte_id: '',
    institution_type: 'Engineering College',
    state: '',
    district: '',
    city: '',
    pincode: '',
    address: '',
    establishment_year: 2010,
    contact_person: '',
    email: '',
    phone: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await create(form);
    if (res) {
      setModalOpen(false);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-brand-navy" />
            Institution Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage technical institutions, AICTE registration records, and status tracking ({total}{' '}
            records)
          </p>
        </div>
        {canCreate && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setModalOpen(true)}
          >
            Register Institution
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search by institution name or AICTE ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'SUSPENDED', label: 'Suspended' },
            ]}
          />
          <div className="flex items-center justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Institutions Table */}
      <Card padding="none">
        <Table<Institution>
          loading={loading}
          data={items}
          keyExtractor={(row) => String(row.id)}
          onRowClick={(row) => navigate(`/institutions/${row.id}`)}
          columns={[
            {
              key: 'aicte_id',
              header: 'AICTE ID',
              cell: (row) => (
                <span className="font-mono text-xs font-bold text-brand-navy">{row.aicte_id}</span>
              ),
            },
            {
              key: 'name',
              header: 'Institution Name',
              cell: (row) => (
                <div>
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.institution_type || 'Technical Institute'}</p>
                </div>
              ),
            },
            {
              key: 'location',
              header: 'State / District',
              cell: (row) => (
                <span className="text-xs text-slate-600">
                  {row.state || '—'} {row.district ? `• ${row.district}` : ''}
                </span>
              ),
            },
            {
              key: 'contact',
              header: 'Contact Person',
              cell: (row) => (
                <div>
                  <p className="text-xs font-medium text-slate-800">{row.contact_person || '—'}</p>
                  <p className="text-[11px] text-slate-400">{row.email || ''}</p>
                </div>
              ),
            },
            {
              key: 'counts',
              header: 'Apps / Docs',
              cell: (row) => (
                <span className="text-xs font-medium text-slate-700">
                  {row.application_count ?? 0} apps • {row.document_count ?? 0} docs
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
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => navigate(`/institutions/${row.id}`)}
                  >
                    View
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Register Institution Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register New Technical Institution"
        size="xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Institution Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., National Institute of Engineering"
            />
            <Input
              label="AICTE Permanent ID"
              required
              value={form.aicte_id}
              onChange={(e) => setForm({ ...form, aicte_id: e.target.value })}
              placeholder="e.g., AICTE-NIE-2026-010"
            />
            <Select
              label="Institution Type"
              value={form.institution_type || 'Engineering College'}
              onChange={(e) => setForm({ ...form, institution_type: e.target.value })}
              options={[
                { value: 'Engineering College', label: 'Engineering College' },
                { value: 'Polytechnic', label: 'Polytechnic' },
                { value: 'Management Institute (MBA)', label: 'Management Institute (MBA)' },
                { value: 'Pharmacy College', label: 'Pharmacy College' },
                { value: 'Architecture Institute', label: 'Architecture Institute' },
              ]}
            />
            <Input
              label="Establishment Year"
              type="number"
              value={form.establishment_year || ''}
              onChange={(e) => setForm({ ...form, establishment_year: Number(e.target.value) })}
            />
            <Input
              label="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="e.g., Karnataka"
            />
            <Input
              label="District"
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              placeholder="e.g., Bengaluru Urban"
            />
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              label="Pincode"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            />
            <Input
              label="Contact Person"
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              placeholder="Dr. / Prof. Name"
            />
            <Input
              label="Official Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Register Institution
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

