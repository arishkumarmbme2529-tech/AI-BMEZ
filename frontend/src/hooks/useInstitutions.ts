import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import type { Institution } from '../types';

export function useInstitutions(params: Record<string, any> = {}) {
  const [items, setItems] = useState<Institution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/institutions', { params });
      const list: Institution[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setItems(list);
      setTotal(list.length);
    } catch {
      setError('Failed to load institutions');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, total, skip: 0, limit: 50, loading, error, refetch: fetch };
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

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { institution, loading, error, refetch: fetch };
}

export function useCreateInstitution() {
  const [loading, setLoading] = useState(false);

  const create = async (data: Record<string, any>): Promise<Institution | null> => {
    setLoading(true);
    try {
      const res = await api.post<Institution>('/institutions', data);
      toast.success('Institution registered');
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

  const update = async (
    id: string | number,
    data: Record<string, any>
  ): Promise<Institution | null> => {
    setLoading(true);
    try {
      const res = await api.put<Institution>(`/institutions/${id}`, data);
      toast.success('Institution updated');
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

