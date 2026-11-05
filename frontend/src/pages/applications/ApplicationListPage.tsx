import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Plus, Eye } from 'lucide-react';
import {
  useApplications,
  useCreateApplication,
} from '../../hooks/useApplications';
import { useInstitutions } from '../../hooks/useInstitutions';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/helpers';

export const ApplicationListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [showNewForm, setShowNewForm] = useState(false);

  const { items, total, loading, refetch } = useApplications({
    status: statusFilter || undefined,
  });

  const { items: institutions } = useInstitutions();
  const { create, loading: creating } = useCreateApplication();

  const [form, setForm] = useState({
    institution_id: '',
    application_type: 'EXTENSION_OF_APPROVAL',
    academic_year: '2026-27',
    program_names: 'B.Tech Computer Science & Engineering, B.Tech ECE',
    proposed_intake: 360,
  });

  useEffect(() => {
    if (institutions.length > 0 && !form.institution_id) {
      setForm((f) => ({ ...f, institution_id: String(institutions[0].id) }));
    }
  }, [institutions, form.institution_id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await create({
      institution_id: Number(form.institution_id),
      application_type: form.application_type,
      academic_year: form.academic_year,
      program_names: form.program_names,
      proposed_intake: Number(form.proposed_intake),
    });
    if (res) {
      setShowNewForm(false);
      refetch();
      navigate(`/applications/${res.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-700" />
            Institutional Applications
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Track regulatory approval applications, completeness scores, and review decisions ({total} applications).
          </p>
        </div>
        <Button
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setShowNewForm(!showNewForm)}
        >
          New Application
        </Button>
      </div>

      {showNewForm && (
        <Card
          title="Submit New Institutional Application"
          subtitle="Create an application record for document validation and compliance review"
        >
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution</label>
                <select
                  value={form.institution_id}
                  onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                  required
                >
                  {institutions.map((i) => (
                    <option key={i.id} value={String(i.id)}>
                      {i.name} ({i.aicte_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Application Type</label>
                <select
                  value={form.application_type}
                  onChange={(e) => setForm({ ...form, application_type: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                >
                  <option value="EXTENSION_OF_APPROVAL">Extension of Approval (EOA)</option>
                  <option value="NEW_INSTITUTION">New Institution Approval</option>
                  <option value="INCREASE_IN_INTAKE">Increase in Intake</option>
                  <option value="NEW_COURSE">New Course / Program</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Programs Offered</label>
                <input
                  type="text"
                  value={form.program_names}
                  onChange={(e) => setForm({ ...form, program_names: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Proposed Intake</label>
                <input
                  type="number"
                  value={form.proposed_intake}
                  onChange={(e) => setForm({ ...form, proposed_intake: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowNewForm(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={creating} size="sm">
                Create Application
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter Bar */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
          >
            <option value="">All Application Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="DEFICIENCY_RAISED">Deficiency Raised</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <Button variant="secondary" size="sm" onClick={() => setStatusFilter('')}>
            Reset Filter
          </Button>
        </div>
      </Card>

      {/* Applications Table */}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Application #</th>
                <th className="py-3 px-4">Institution & Programs</th>
                <th className="py-3 px-4">Approval Type</th>
                <th className="py-3 px-4">Completeness</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading applications...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No applications found.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/applications/${row.id}`)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-800">
                      {row.application_number || row.application_id}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">
                        {row.institution_name || `Institution #${row.institution_id}`}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">
                        {row.program_names || row.title}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {(row.application_type || row.category_name || '').replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {row.Completeness_score ?? 80}%
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(row.submitted_at || row.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="xs"
                        leftIcon={<Eye className="h-3.5 w-3.5" />}
                        onClick={() => navigate(`/applications/${row.id}`)}
                      >
                        Open
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
