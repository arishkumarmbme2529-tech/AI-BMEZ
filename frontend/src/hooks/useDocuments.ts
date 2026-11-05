import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import type { Document } from '../types';

export interface DocumentTypeItem {
  id: string;
  name: string;
}

const DEFAULT_DOCUMENT_TYPES: DocumentTypeItem[] = [
  { id: 'AFFIDAVIT', name: 'Notarized Affidavit' },
  { id: 'BUILDING_PLAN', name: 'Approved Building Plan' },
  { id: 'FIRE_NOC', name: 'Fire Safety NOC' },
  { id: 'LAND_OWNERSHIP', name: 'Land Ownership Certificate' },
  { id: 'FACULTY_LIST', name: 'Faculty Roster & Qualifications' },
  { id: 'EQUIPMENT_SPEC', name: 'Lab Equipment Specification' },
  { id: 'AUDIT_STATEMENT', name: 'Audited Financial Statement' },
  { id: 'TRUST_DEED', name: 'Trust / Society Registration Deed' },
  { id: 'ACCREDITATION', name: 'NBA / NAAC Accreditation' },
  { id: 'OTHER', name: 'Other Supporting Document' },
];

export function useDocuments(params: Record<string, any> = {}) {
  const [items, setItems] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/documents', { params });
      const list: Document[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setItems(list);
      setTotal(list.length);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, total, skip: 0, limit: 50, loading, error, refetch: fetch };
}

export function useDocumentTypes() {
  return { types: DEFAULT_DOCUMENT_TYPES, loading: false };
}

export function useDocument(id: string | number | undefined) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<any>('/documents');
      const list: Document[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
      const found = list.find((d) => String(d.id) === String(id)) || null;
      setDocument(found);
    } catch {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { document, loading, error, refetch: fetch };
}

export function useUploadDocument() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (formData: FormData): Promise<Document | null> => {
    setLoading(true);
    setProgress(0);
    try {
      const res = await api.post<Document>('/documents/upload', formData, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      toast.success('Document uploaded and validated with OCR & SHA-256 hash');
      return res.data;
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to upload document');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { upload, loading, progress };
}
