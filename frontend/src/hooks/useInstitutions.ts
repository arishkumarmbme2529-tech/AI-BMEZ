import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import type { Institution, InstitutionFormData, PaginatedResponse, PaginationParams } from '../types';

export function useInstitutions(params: PaginationParams = {}) {
  const [data, setData] = useState<PaginatedResponse<Institution>>({ items: [], total: 0, skip: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedResponse<Institution>>('/institutions', { params });
      setData(res.data);
    } catch {
      setError('Failed to load institutions');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}

export function useInstitution(id: string | number | undefined) {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Institution>(`/institutions/${id}`);
      setInstitution(res.data);
    } catch {
      setError('Failed to load institution');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { institution, loading, error, refetch: fetch };
}

export function useCreateInstitution() {
  const [loading, setLoading] = useState(false);

  const create = async (data: InstitutionFormData): Promise<Institution | null> => {
    setLoading(true);
    try {
      const res = await api.post<Institution>('/institutions', null, { params: data });
      toast.success('Institution registered successfully');
      return res.data;
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to register institution');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading };
}

export function useUpdateInstitution() {
  const [loading, setLoading] = useState(false);

  const update = async (id: string | number, data: Partial<InstitutionFormData> & { status?: string }): Promise<Institution | null> => {
    setLoading(true);
    try {
      const res = await api.put<Institution>(`/institutions/${id}`, null, { params: data });
      toast.success('Institution updated successfully');
      return res.data;
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to update institution');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading };
}
