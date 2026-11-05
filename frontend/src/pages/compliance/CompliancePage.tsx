import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Play, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInstitutions } from '../../hooks/useInstitutions';
import api from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import type { ComplianceRecord } from '../../types';

export const CompliancePage: React.FC = () => {
  const { items: institutions } = useInstitutions();
  const [selectedInstId, setSelectedInstId] = useState('');
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [running, setRunning] = useState(false);

  const [formData, setFormData] = useState({
    total_faculty: 48,
    phd_faculty_count: 16,
    total_students: 720,
    built_up_area_sqm: 18450,
    computers_count: 310,
    annual_budget_lakhs: 1450,
    actual_utilization_lakhs: 1320,
  });

  useEffect(() => {
    if (!selectedInstId && institutions.length > 0) {
      setSelectedInstId(String(institutions[0].id));
    }
  }, [institutions, selectedInstId]);

  const fetchRecords = useCallback(() => {
    api
      .get('/compliance/records')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setRecords(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const activeRecord =
    records.find((r) => String(r.institution_id) === String(selectedInstId)) || records[0] || null;

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId) return;
    setRunning(true);
    try {
      await api.post('/compliance/evaluate', {
        institution_id: Number(selectedInstId),
        academic_year: '2026-27',
        ...formData,
      });
      toast.success('Compliance percentage recalculated');
      fetchRecords();
    } catch {
      toast.error('Compliance evaluation failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-emerald-700" />
            Regulatory Compliance Verification & Scoring
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Evaluate institutional compliance percentage across faculty ratios, infrastructure, lab equipment, financials, and verified documents.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={fetchRecords}
        >
          Refresh Scores
        </Button>
      </div>

      {/* Institution Selector */}
      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Institution to Inspect or Re-Evaluate
            </label>
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={String(inst.id)}>
                  {inst.name} ({inst.aicte_id}) — Current Score: {inst.compliance_score ?? 80}%
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {activeRecord && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <Card>
              <p className="text-xs text-slate-500">Overall Compliance</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                {activeRecord.overall_compliance_score}%
              </p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Faculty Score</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{activeRecord.faculty_score}%</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Infrastructure</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {activeRecord.infrastructure_score}%
              </p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Equipment</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {activeRecord.equipment_score}%
              </p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Financial Score</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {activeRecord.financial_score}%
              </p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Risk Assessment</p>
              <div className="mt-1.5">
                <StatusBadge status={activeRecord.risk_level} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card
              className="lg:col-span-6"
              title="Identified Deficiencies & Recommendations"
              subtitle={`Academic Year ${activeRecord.academic_year} • Faculty-Student Ratio 1:${activeRecord.faculty_student_ratio}`}
            >
              <div className="space-y-4 text-xs">
                <div>
                  <p className="font-semibold text-slate-800 mb-1.5">Deficiencies Noted:</p>
                  {activeRecord.deficiencies && activeRecord.deficiencies.length > 0 ? (
                    <ul className="space-y-1.5 text-red-700 bg-red-50 p-3 rounded border border-red-200">
                      {activeRecord.deficiencies.map((d, idx) => (
                        <li key={idx}>• {d}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-emerald-700 bg-emerald-50 p-3 rounded border border-emerald-200">
                      No regulatory deficiencies identified.
                    </p>
                  )}
                </div>

                <div>
                  <p className="font-semibold text-slate-800 mb-1.5">Corrective Recommendations:</p>
                  <ul className="space-y-1.5 text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                    {(activeRecord.recommendations || []).map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            <Card
              className="lg:col-span-6"
              title="Run Compliance Calculator"
              subtitle="Update institutional parameters to recalculate overall compliance percentage"
            >
              <form onSubmit={handleEvaluate} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Total Faculty</label>
                    <input
                      type="number"
                      value={formData.total_faculty}
                      onChange={(e) =>
                        setFormData({ ...formData, total_faculty: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Total Students</label>
                    <input
                      type="number"
                      value={formData.total_students}
                      onChange={(e) =>
                        setFormData({ ...formData, total_students: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Built-up Area (Sq.m)
                    </label>
                    <input
                      type="number"
                      value={formData.built_up_area_sqm}
                      onChange={(e) =>
                        setFormData({ ...formData, built_up_area_sqm: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Computers Count
                    </label>
                    <input
                      type="number"
                      value={formData.computers_count}
                      onChange={(e) =>
                        setFormData({ ...formData, computers_count: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={running}
                  leftIcon={<Play className="h-3.5 w-3.5" />}
                >
                  Recalculate Compliance Score
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
