import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import type {
  Application,
  ApplicationFormData,
  ApplicationCategoryItem,
  ApplicationChecklist,
  ValidationSummary,
  PaginatedResponse,
  PaginationParams,
} from '../types';

export function useApplications(params: PaginationParams = {}) {
  const [data, setData] = useState<PaginatedResponse<Application>>({ items: [], total: 0, skip: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedResponse<Application>>('/applications', { params });
      setData(res.data);
    } catch {
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}

export function useApplicationCategories() {
  const [categories, setCategories] = useState<ApplicationCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApplicationCategoryItem[]>('/applications/categories')
      .then((res) => setCategories(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}

export function useApplication(id: string | number | undefined) {
  const [application, setApplication] = useState<Application | null>(null);
  const [checklist, setChecklist] = useState<ApplicationChecklist | null>(null);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [appRes, checkRes, valRes] = await Promise.allSettled([
        api.get<Application>(`/applications/${id}`),
        api.get<ApplicationChecklist>(`/applications/${id}/checklist`),
        api.get<ValidationSummary>(`/applications/${id}/validation-summary`),
      ]);
      if (appRes.status === 'fulfilled') setApplication(appRes.value.data);
      if (checkRes.status === 'fulfilled') setChecklist(checkRes.value.data);
      if (valRes.status === 'fulfilled') setValidation(valRes.value.data);
    } catch {
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { application, checklist, validation, loading, error, refetch: fetch };
}

export function useCreateApplication() {
  const [loading, setLoading] = useState(false);

  const create = async (data: ApplicationFormData): Promise<Application | null> => {
    setLoading(true);
    try {
      const res = await api.post<Application>('/applications', null, { params: data });
      toast.success('Application created successfully');
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
      await api.put(`/applications/${id}/submit`);
      toast.success('Application submitted for official review');
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to submit application');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string | number, new_status: string, review_notes?: string): Promise<boolean> => {
    setLoading(true);
    try {
      await api.put(`/applications/${id}/status`, null, {
        params: { new_status, review_notes },
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
