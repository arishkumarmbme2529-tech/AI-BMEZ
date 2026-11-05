import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInstitutions } from '../../hooks/useInstitutions';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getRoleLabel, getRoleBadgeColor, formatDateTime } from '../../utils/helpers';
import type { User } from '../../types';

export const UserManagementPage: React.FC = () => {
  const { items: institutions } = useInstitutions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'INSTITUTION_ADMIN',
    institution_id: '',
  });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api
      .get('/users')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setUsers(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', {
        email: form.email.trim().toLowerCase(),
        full_name: form.full_name,
        password: form.password,
        role: form.role,
        institution_id: form.institution_id ? Number(form.institution_id) : undefined,
      });
      toast.success('User account created');
      setShowModal(false);
      setForm({ email: '', full_name: '', password: '', role: 'INSTITUTION_ADMIN', institution_id: '' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to create user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-700" />
            Role-Based User Accounts
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Manage Admin, Institute User, and Reviewer accounts ({users.length} accounts).
          </p>
        </div>
        <Button
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setShowModal(!showModal)}
        >
          Add User Account
        </Button>
      </div>

      {showModal && (
        <Card title="Create User Account" subtitle="Provision a new role-based portal user">
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="text"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                >
                  <option value="SUPER_ADMIN">Admin</option>
                  <option value="INSTITUTION_ADMIN">Institute User</option>
                  <option value="OFFICER">Reviewer</option>
                </select>
              </div>
              {form.role === 'INSTITUTION_ADMIN' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign Institution
                  </label>
                  <select
                    value={form.institution_id}
                    onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                  >
                    <option value="">Create New Institution Automatically</option>
                    {institutions.map((i) => (
                      <option key={i.id} value={String(i.id)}>
                        {i.name} ({i.aicte_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Create Account
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Institution Scope</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : (
                users.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{row.full_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{row.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${getRoleBadgeColor(
                          row.role
                        )}`}
                      >
                        {getRoleLabel(row.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.institution_id ? `Institution #${row.institution_id}` : 'All Institutions'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(row.created_at)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
