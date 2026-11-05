import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import type { Application } from '../types';

export function useApplications(params: Record<string, any> = {}) {
  const [items, setItems] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/applications', { params });
      const list: Application[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setItems(list);
      setTotal(list.length);
    } catch {
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, total, skip: 0, limit: 50, loading, error, refetch: fetch };
}

export function useApplicationCategories() {
  const categories = [
    { id: 1, name: 'Extension of Approval (EOA)', code: 'EXTENSION_OF_APPROVAL' },
    { id: 2, name: 'New Institution Approval', code: 'NEW_INSTITUTION' },
    { id: 3, name: 'Increase in Intake', code: 'INCREASE_IN_INTAKE' },
    { id: 4, name: 'New Course / Program', code: 'NEW_COURSE' },
  ];
  return { categories, loading: false };
}

export function useApplication(id: string | number | undefined) {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<Application>(`/applications/${id}`);
      setApplication(res.data);
    } catch {
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { application, loading, error, refetch: fetch };
}

export function useCreateApplication() {
  const [loading, setLoading] = useState(false);

  const create = async (data: Record<string, any>): Promise<Application | null> => {
    setLoading(true);
    try {
      const res = await api.post<Application>('/applications', data);
      toast.success('Application created');
      return res.data;
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to create application');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading };
}

export function useApplicationActions() {
  const [loading, setLoading] = useState(false);

  const submitApplication = async (id: string | number): Promise<boolean> => {
    setLoading(true);
    try {
      await api.post(`/applications/${id}/submit`);
      toast.success('Application submitted for review');
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to submit application');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (
    id: string | number,
    new_status: string,
    review_notes?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      await api.put(`/applications/${id}/review`, {
        status: new_status,
        reviewer_remarks: review_notes,
      });
      toast.success(`Application status updated to ${new_status}`);
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to update status');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submitApplication, updateStatus, loading };
}
