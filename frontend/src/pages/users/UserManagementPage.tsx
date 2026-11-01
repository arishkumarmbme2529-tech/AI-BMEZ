import React, { useState, useEffect } from 'react';
import { Users, Plus, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInstitutions } from '../../hooks/useInstitutions';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { getRoleLabel, getRoleBadgeColor, formatDateTime } from '../../utils/helpers';
import type { User } from '../../types';

export const UserManagementPage: React.FC = () => {
  const { items: institutions } = useInstitutions();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'OFFICER',
    institution_id: '',
  });

  const fetchUsers = () => {
    setLoading(true);
    api
      .get('/users')
      .then((res) => {
        setUsers(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', null, {
        params: {
          email: form.email,
          full_name: form.full_name,
          password: form.password,
          role: form.role,
          institution_id: form.institution_id ? Number(form.institution_id) : undefined,
        },
      });
      toast.success('Authorized user account provisioned');
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to create user');
    }
  };

  const handleDeactivate = async (id: number | string) => {
    await api.delete(`/users/${id}`);
    toast.success('User deactivated');
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-brand-navy" />
            Role-Based User & Access Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage Super Administrators, AICTE Verification Officers, and Institution Administrators
            ({total} users)
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
          Provision User Account
        </Button>
      </div>

      <Card padding="none">
        <Table<User>
          loading={loading}
          data={users}
          keyExtractor={(row) => String(row.id)}
          columns={[
            {
              key: 'name',
              header: 'Full Name & Email',
              cell: (row) => (
                <div>
                  <p className="font-semibold text-slate-900">{row.full_name}</p>
                  <p className="text-xs text-slate-500">{row.email}</p>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Assigned Role',
              cell: (row) => (
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                    row.role
                  )}`}
                >
                  {getRoleLabel(row.role)}
                </span>
              ),
            },
            {
              key: 'inst',
              header: 'Institution Scope',
              cell: (row) => (
                <span className="text-xs text-slate-600">
                  {row.institution_id ? `Institution #${row.institution_id}` : 'Global AICTE Scope'}
                </span>
              ),
            },
            {
              key: 'last_login',
              header: 'Last Login',
              cell: (row) => (
                <span className="text-xs text-slate-500">{formatDateTime(row.last_login)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                    row.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {row.is_active ? 'Active' : 'Deactivated'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              cell: (row) => (
                <Button
                  size="xs"
                  variant="ghost"
                  leftIcon={<UserX className="h-3.5 w-3.5 text-red-500" />}
                  onClick={() => handleDeactivate(row.id)}
                >
                  Deactivate
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision Authorized Platform User"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <Input
            label="Official Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Initial Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={[
              { value: 'SUPER_ADMIN', label: 'Super Administrator' },
              { value: 'OFFICER', label: 'AICTE Verification Officer' },
              { value: 'INSTITUTION_ADMIN', label: 'Institution Administrator' },
            ]}
          />
          {form.role === 'INSTITUTION_ADMIN' && (
            <Select
              label="Assign Institution"
              value={form.institution_id}
              onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
              options={[
                { value: '', label: 'Select Institution' },
                ...institutions.map((i) => ({
                  value: String(i.id),
                  label: `${i.name} (${i.aicte_id})`,
                })),
              ]}
            />
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

