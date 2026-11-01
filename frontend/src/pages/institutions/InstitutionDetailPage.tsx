import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  FileText,
  FolderOpen,
  Edit3,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import { useInstitution, useUpdateInstitution } from '../../hooks/useInstitutions';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatDate, formatFileSize } from '../../utils/helpers';

export const InstitutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOfficerOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'OFFICER';

  const { institution, loading, refetch } = useInstitution(id);
  const { items: documents } = useDocuments({ institution_id: id ? Number(id) : undefined });
  const { update, loading: updating } = useUpdateInstitution();

  const [apps, setApps] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'applications' | 'documents'>('overview');
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (!id) return;
    api
      .get(`/institutions/${id}/applications`)
      .then((res) => setApps(res.data))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (institution) {
      setEditData({
        name: institution.name,
        institution_type: institution.institution_type || '',
        state: institution.state || '',
        district: institution.district || '',
        city: institution.city || '',
        pincode: institution.pincode || '',
        address: institution.address || '',
        contact_person: institution.contact_person || '',
        email: institution.email || '',
        phone: institution.phone || '',
        status: institution.status,
      });
    }
  }, [institution]);

  if (loading || !institution) return <PageLoader message="Loading institution dossier..." />;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const res = await update(id, editData);
    if (res) {
      setEditModal(false);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/institutions')}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{institution.name}</h1>
              <StatusBadge status={institution.status} />
            </div>
            <p className="text-xs font-mono text-slate-500 mt-1">
              AICTE ID: <span className="font-bold text-brand-navy">{institution.aicte_id}</span> •{' '}
              {institution.institution_type || 'Technical Institution'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Edit3 className="h-4 w-4" />}
            onClick={() => setEditModal(true)}
          >
            Edit Profile
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/applications/new?institution_id=${institution.id}`)}
          >
            Create Application
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: 'overview', label: 'Institutional Profile', icon: <Building2 className="h-4 w-4" /> },
          {
            key: 'applications',
            label: `Application History (${apps.length})`,
            icon: <FileText className="h-4 w-4" />,
          },
          {
            key: 'documents',
            label: `Document Repository (${documents.length})`,
            icon: <FolderOpen className="h-4 w-4" />,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? 'border-cyan-500 text-brand-navy'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Institutional Information"
              subtitle="Official AICTE registered details"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400">Institution Name</p>
                <p className="font-semibold text-slate-900 mt-0.5">{institution.name}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400">AICTE Permanent ID</p>
                <p className="font-mono font-bold text-brand-navy mt-0.5">{institution.aicte_id}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400">Institution Category</p>
                <p className="font-medium text-slate-800 mt-0.5">
                  {institution.institution_type || '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400">Establishment Year</p>
                <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {institution.establishment_year || '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 sm:col-span-2">
                <p className="text-xs text-slate-400">Registered Address</p>
                <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {institution.address || '—'}, {institution.city || ''},{' '}
                  {institution.district || ''}, {institution.state || ''} -{' '}
                  {institution.pincode || ''}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Contact & Summary" subtitle="Administrative point of contact" />
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Head / Contact Person</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {institution.contact_person || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Mail className="h-4 w-4 text-cyan-600" />
                <span>{institution.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Phone className="h-4 w-4 text-cyan-600" />
                <span>{institution.phone || '—'}</span>
              </div>
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-navy-50">
                  <p className="text-xl font-bold text-brand-navy">{apps.length}</p>
                  <p className="text-xs text-slate-500">Applications</p>
                </div>
                <div className="p-3 rounded-xl bg-cyan-50">
                  <p className="text-xl font-bold text-cyan-700">{documents.length}</p>
                  <p className="text-xs text-slate-500">Documents</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'applications' && (
        <Card>
          <CardHeader
            title="Institution Application History"
            subtitle="All regulatory applications submitted by this institution"
          />
          {apps.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              No applications submitted for this institution.
            </p>
          ) : (
            <div className="space-y-3">
              {apps.map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/applications/${a.id}`)}
                  className="p-4 rounded-xl border border-slate-100 hover:border-cyan-400 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-mono font-bold text-brand-navy">
                      {a.application_id}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{a.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Category: {a.category} • Created: {formatDate(a.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'documents' && (
        <Card>
          <CardHeader
            title="Institutional Document Repository"
            subtitle="All documents uploaded under this institution"
          />
          {documents.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{d.original_filename}</p>
                    <p className="text-xs text-slate-500">
                      {d.document_type_name} • {formatFileSize(d.file_size)} • Uploaded{' '}
                      {formatDate(d.upload_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => navigate(`/ocr?document_id=${d.id}`)}
                    >
                      OCR
                    </Button>
                    <Button
                      size="xs"
                      variant="cyan"
                      onClick={() => navigate(`/authentication?document_id=${d.id}`)}
                    >
                      Verify Auth
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Update Institution Profile"
        size="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Institution Name"
              value={editData.name || ''}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
            <Input
              label="Contact Person"
              value={editData.contact_person || ''}
              onChange={(e) => setEditData({ ...editData, contact_person: e.target.value })}
            />
            <Input
              label="Email"
              value={editData.email || ''}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={editData.phone || ''}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
            />
            <Input
              label="State"
              value={editData.state || ''}
              onChange={(e) => setEditData({ ...editData, state: e.target.value })}
            />
            <Input
              label="District"
              value={editData.district || ''}
              onChange={(e) => setEditData({ ...editData, district: e.target.value })}
            />
            {isOfficerOrAdmin && (
              <Select
                label="Institution Status"
                value={editData.status || 'PENDING'}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'SUSPENDED', label: 'Suspended' },
                ]}
              />
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

