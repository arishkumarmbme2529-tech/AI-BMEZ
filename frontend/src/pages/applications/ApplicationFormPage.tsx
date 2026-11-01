import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useApplicationCategories, useCreateApplication } from '../../hooks/useApplications';
import { useInstitutions } from '../../hooks/useInstitutions';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const ApplicationFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedInstId = searchParams.get('institution_id') || '';

  const { categories } = useApplicationCategories();
  const { items: institutions } = useInstitutions();
  const { create, loading } = useCreateApplication();

  const [institutionId, setInstitutionId] = useState(preselectedInstId);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!institutionId && institutions.length > 0) {
      setInstitutionId(String(institutions[0].id));
    }
    if (!categoryId && categories.length > 0) {
      setCategoryId(String(categories[0].id));
    }
  }, [institutions, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await create({
      institution_id: Number(institutionId),
      category_id: Number(categoryId),
      title,
    });
    if (res) {
      navigate(`/applications/${res.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/applications')}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-navy" />
            Create New Institutional Application
          </h1>
          <p className="text-sm text-slate-500">
            Select an institution and AICTE approval category to generate a document checklist
          </p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Application Configuration"
          subtitle="A unique AICTE Application ID will be generated automatically"
        />
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Submitting Institution"
            required
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            options={institutions.map((i) => ({
              value: String(i.id),
              label: `${i.name} (${i.aicte_id})`,
            }))}
          />
          <Select
            label="AICTE Approval Category"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map((c) => ({
              value: String(c.id),
              label: `${c.name} (${c.code})`,
            }))}
          />
          <Input
            label="Application Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Extension of Approval (EOA) 2026-27"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => navigate('/applications')}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Application
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

