import React, { useState, useEffect } from 'react';
import { CheckSquare, Play, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApplications } from '../../hooks/useApplications';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/Badge';
import { AlertBox } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import type { ComplianceRule, ComplianceResultsResponse } from '../../types';

export const CompliancePage: React.FC = () => {
  const { user } = useAuth();
  const isOfficer = user?.role === 'SUPER_ADMIN' || user?.role === 'OFFICER';

  const { items: applications } = useApplications();
  const [selectedAppId, setSelectedAppId] = useState('');
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [results, setResults] = useState<ComplianceResultsResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [ruleModal, setRuleModal] = useState(false);

  const [newRule, setNewRule] = useState({
    rule_id: '',
    name: '',
    description: '',
    requirement: '',
    validation_type: 'DOCUMENT_PRESENT',
    severity: 'HIGH',
  });

  useEffect(() => {
    if (!selectedAppId && applications.length > 0) {
      setSelectedAppId(String(applications[0].id));
    }
  }, [applications]);

  const fetchRules = () => {
    api
      .get<ComplianceRule[]>('/compliance/rules')
      .then((res) => setRules(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchRules();
  }, []);

  useEffect(() => {
    if (!selectedAppId) return;
    api
      .get<ComplianceResultsResponse>(`/compliance/results/${selectedAppId}`)
      .then((res) => setResults(res.data))
      .catch(() => setResults(null));
  }, [selectedAppId]);

  const handleRunEngine = async () => {
    if (!selectedAppId) return;
    setRunning(true);
    try {
      await api.post(`/compliance/check/${selectedAppId}`);
      const res = await api.get<ComplianceResultsResponse>(`/compliance/results/${selectedAppId}`);
      setResults(res.data);
      toast.success('Compliance rule engine evaluated all applicable rules');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Compliance check failed');
    } finally {
      setRunning(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/compliance/rules', null, { params: newRule });
      toast.success('Sample compliance rule created');
      setRuleModal(false);
      fetchRules();
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to create rule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-emerald-600" />
            Regulatory Compliance Verification Engine
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Rule-based automated compliance verification, gap identification, and rule version
            management
          </p>
        </div>
        {isOfficer && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setRuleModal(true)}
          >
            Configure New Sample Rule
          </Button>
        )}
      </div>

      <AlertBox variant="info" title="Sample Demonstration Rules Notice">
        All rules configured in this engine are marked as <b>Sample Demonstration Rules</b> for
        Smart India Hackathon 2026 and do not invent or replace official AICTE Approval Process
        Handbook provisions.
      </AlertBox>

      {/* Application Selector */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="flex-1">
            <Select
              label="Select Institutional Application to Evaluate"
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              options={applications.map((a) => ({
                value: String(a.id),
                label: `${a.application_id} — ${a.title} (${a.institution_name})`,
              }))}
            />
          </div>
          <Button
            variant="primary"
            loading={running}
            disabled={!selectedAppId}
            leftIcon={<Play className="h-4 w-4" />}
            onClick={handleRunEngine}
          >
            Run Compliance Engine
          </Button>
        </div>
      </Card>

      {/* Application Evaluation Results */}
      {results ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card padding="sm" className="text-center">
              <p className="text-xs text-slate-400">Compliance Score</p>
              <p className="text-2xl font-extrabold text-brand-navy mt-1">
                {results.summary.compliance_score}%
              </p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-xs text-slate-400">Total Rules Checked</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{results.summary.total}</p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-xs text-slate-400">Compliant</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {results.summary.compliant}
              </p>
            </Card>
            <Card padding="sm" className="text-center">
              <p className="text-xs text-slate-400">Non-Compliant Gaps</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {results.summary.non_compliant}
              </p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Application Compliance Checklist Results"
              subtitle={`Application #${results.application_id}`}
            />
            <div className="space-y-3">
              {results.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-brand-navy">
                        {item.rule_id}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{item.rule_name}</span>
                      <StatusBadge status={item.severity} />
                      {item.is_sample && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-full">
                          SAMPLE RULE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                    {item.evidence && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.evidence}</p>
                    )}
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-slate-500">
              No compliance check results recorded for the selected application yet.
            </p>
            <Button size="sm" loading={running} onClick={handleRunEngine}>
              Execute Compliance Verification Now
            </Button>
          </div>
        </Card>
      )}

      {/* Active Rules Repository */}
      <Card>
        <CardHeader
          title="Configured Regulatory Rules Repository"
          subtitle="Active sample rules evaluated by the compliance engine"
        />
        <div className="space-y-2.5">
          {rules.map((r) => (
            <div
              key={r.id}
              className="p-3.5 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-navy">{r.rule_id}</span>
                  <span className="text-sm font-semibold text-slate-900">{r.name}</span>
                  <span className="text-xs text-slate-400">v{r.version}</span>
                  {r.is_sample && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                      Sample Rule
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                <p className="text-[11px] text-cyan-700 font-medium mt-0.5">
                  Requirement: {r.requirement} • Category: {r.category_name}
                </p>
              </div>
              <StatusBadge status={r.severity} />
            </div>
          ))}
        </div>
      </Card>

      {/* Add Rule Modal */}
      <Modal
        isOpen={ruleModal}
        onClose={() => setRuleModal(false)}
        title="Configure New Sample Compliance Rule"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <Input
            label="Rule ID"
            required
            placeholder="e.g., RULE-009"
            value={newRule.rule_id}
            onChange={(e) => setNewRule({ ...newRule, rule_id: e.target.value })}
          />
          <Input
            label="Rule Name"
            required
            placeholder="e.g., Fire Safety Certificate Mandatory"
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
          />
          <Input
            label="Requirement Description"
            required
            placeholder="[SAMPLE RULE] Describe the verification requirement..."
            value={newRule.description}
            onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
          />
          <Input
            label="Required Evidence"
            required
            placeholder="e.g., Upload valid Fire Safety NOC"
            value={newRule.requirement}
            onChange={(e) => setNewRule({ ...newRule, requirement: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Validation Logic"
              value={newRule.validation_type}
              onChange={(e) => setNewRule({ ...newRule, validation_type: e.target.value })}
              options={[
                { value: 'DOCUMENT_PRESENT', label: 'Document Present' },
                { value: 'EXPIRY_CHECK', label: 'Expiry Check' },
                { value: 'FIELD_CHECK', label: 'OCR Field Check' },
              ]}
            />
            <Select
              label="Severity"
              value={newRule.severity}
              onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
              options={[
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setRuleModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Sample Rule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

