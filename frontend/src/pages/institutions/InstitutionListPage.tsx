import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search } from 'lucide-react';
import { useInstitutions, useCreateInstitution } from '../../hooks/useInstitutions';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { InstitutionFormData } from '../../types';

export const InstitutionListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'OFFICER' ||
    user?.role === 'REVIEWER';

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { items, total, loading, refetch } = useInstitutions({
    search: search || undefined,
  });

  const { create, loading: creating } = useCreateInstitution();

  const [form, setForm] = useState<InstitutionFormData>({
    name: '',
    aicte_id: '',
    type: 'PRIVATE',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    city: 'Bengaluru',
    pincode: '560001',
    address: '',
    established_year: 2010,
    contact_email: '',
    contact_phone: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await create(form);
    if (res) {
      setShowModal(false);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-700" />
            Registered Technical Institutions
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Directory of registered institutions, AICTE permanent IDs, and regulatory compliance percentages ({total} institutions).
          </p>
        </div>
        {canCreate && (
          <Button
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowModal(!showModal)}
          >
            Register Institution
          </Button>
        )}
      </div>

      {showModal && (
        <Card
          title="Register New Technical Institution"
          subtitle="Add an institution record for document and compliance verification"
        >
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Regional Institute of Technology"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">AICTE Permanent ID</label>
                <input
                  type="text"
                  required
                  value={form.aicte_id}
                  onChange={(e) => setForm({ ...form, aicte_id: e.target.value })}
                  placeholder="e.g. AICTE-2026-RIT-015"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                <input
                  type="text"
                  value={form.contact_email || ''}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  placeholder="principal@rit.edu.in"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={form.type || 'PRIVATE'}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                >
                  <option value="PRIVATE">Private</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="AUTONOMOUS">Autonomous</option>
                  <option value="DEEMED">Deemed University</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={creating} size="sm">
                Save Institution
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by institution name or AICTE ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
            Clear
          </Button>
        </div>
      </Card>

      {/* Institutions Table */}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">AICTE ID</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Contact Email</th>
                <th className="py-3 px-4">Intake</th>
                <th className="py-3 px-4">Compliance %</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading institutions...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching institutions found.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-800">{row.aicte_id}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <p className="text-[11px] text-slate-500">{row.type || 'PRIVATE'}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.city}, {row.state}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.contact_email || row.email || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {row.total_intake ?? 360}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">
                        {row.compliance_score ?? 75}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => navigate(`/documents`)}
                      >
                        Documents
                      </Button>
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
