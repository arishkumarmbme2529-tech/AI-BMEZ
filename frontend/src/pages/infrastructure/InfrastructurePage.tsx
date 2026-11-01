import React, { useState, useEffect } from 'react';
import { Layers, Plus, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApplications } from '../../hooks/useApplications';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/Badge';
import { AlertBox } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { formatDateTime } from '../../utils/helpers';
import type { InfrastructureEvidenceItem } from '../../types';

const CATEGORIES = [
  { value: 'BUILDING', label: 'Building Photographs' },
  { value: 'CLASSROOM', label: 'Classroom Photographs' },
  { value: 'LAB', label: 'Laboratory Photographs' },
  { value: 'LIBRARY', label: 'Library Photographs' },
  { value: 'EQUIPMENT', label: 'Equipment Photographs' },
  { value: 'FLOORPLAN', label: 'Building Floor Plans' },
  { value: 'OTHER', label: 'Other Infrastructure Evidence' },
];

export const InfrastructurePage: React.FC = () => {
  const { user } = useAuth();
  const isOfficer = user?.role === 'SUPER_ADMIN' || user?.role === 'OFFICER';

  const { items: applications } = useApplications();
  const { items: documents } = useDocuments();

  const [selectedAppId, setSelectedAppId] = useState('');
  const [evidences, setEvidences] = useState<InfrastructureEvidenceItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('BUILDING');
  const [documentId, setDocumentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedAppId && applications.length > 0) {
      setSelectedAppId(String(applications[0].id));
    }
  }, [applications]);

  useEffect(() => {
    if (!documentId && documents.length > 0) {
      setDocumentId(String(documents[0].id));
    }
  }, [documents]);

  const fetchEvidences = () => {
    if (!selectedAppId) return;
    api
      .get<InfrastructureEvidenceItem[]>(`/infrastructure/${selectedAppId}`)
      .then((res) => setEvidences(res.data))
      .catch(() => setEvidences([]));
  };

  useEffect(() => {
    fetchEvidences();
  }, [selectedAppId]);

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    const app = applications.find((a) => String(a.id) === String(selectedAppId));
    if (!app) return;

    setSubmitting(true);
    try {
      await api.post('/infrastructure', null, {
        params: {
          application_id: app.id,
          institution_id: app.institution_id,
          category,
          document_id: documentId ? Number(documentId) : undefined,
        },
      });
      toast.success('Infrastructure evidence added & AI quality analysis completed');
      setModalOpen(false);
      fetchEvidences();
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to add evidence');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: number, status: string) => {
    try {
      await api.put(`/infrastructure/${id}/review`, null, {
        params: { status, notes: `Marked ${status} by verification officer` },
      });
      toast.success(`Evidence marked ${status}`);
      fetchEvidences();
    } catch {
      toast.error('Failed to update review');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-brand-navy" />
            AI-Assisted Infrastructure Evidence Verification
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Categorize campus building, classroom, laboratory, and floor plan evidence with OpenCV
            quality & sharpness scoring
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
          Add Infrastructure Evidence
        </Button>
      </div>

      <AlertBox variant="warning" title="Advisory Nature of AI Infrastructure Observations">
        AI image quality scores and visual observations are strictly advisory. They cannot
        establish actual physical infrastructure compliance without appropriate verification and
        physical inspection where required.
      </AlertBox>

      {/* Application Selector */}
      <Card padding="sm">
        <Select
          label="Select Application to View Infrastructure Evidence"
          value={selectedAppId}
          onChange={(e) => setSelectedAppId(e.target.value)}
          options={applications.map((a) => ({
            value: String(a.id),
            label: `${a.application_id} — ${a.title} (${a.institution_name})`,
          }))}
        />
      </Card>

      {/* Evidence Grid */}
      {evidences.length === 0 ? (
        <Card>
          <div className="py-12 text-center space-y-3">
            <p className="text-xs text-slate-400">
              No infrastructure evidence linked to this application yet.
            </p>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              Link First Infrastructure Evidence
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidences.map((ev) => (
            <Card key={ev.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-md">
                    {ev.category}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Uploaded {formatDateTime(ev.uploaded_at)}
                  </p>
                </div>
                <StatusBadge status={ev.status} />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">AI Image Quality Score:</span>
                  <span className="font-bold text-slate-900">
                    {ev.quality_score != null ? `${ev.quality_score}/100` : 'N/A (Non-image / PDF)'}
                  </span>
                </div>
                {ev.ai_observations &&
                  Object.entries(ev.ai_observations).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                      <span className="font-medium text-slate-700 text-right">{String(v)}</span>
                    </div>
                  ))}
              </div>

              {isOfficer && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => handleReview(ev.id, 'REJECTED')}
                  >
                    Request Clearer Evidence
                  </Button>
                  <Button
                    size="xs"
                    variant="success"
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    onClick={() => handleReview(ev.id, 'APPROVED')}
                  >
                    Mark Verified
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Infrastructure Evidence for AI Quality Analysis"
      >
        <form onSubmit={handleAddEvidence} className="space-y-4">
          <Select
            label="Evidence Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORIES}
          />
          <Select
            label="Select Uploaded Document / Photograph"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            options={[
              { value: '', label: 'None (Metadata Record Only)' },
              ...documents.map((d) => ({
                value: String(d.id),
                label: `${d.original_filename} (${d.mime_type})`,
              })),
            ]}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Run Quality Check & Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

