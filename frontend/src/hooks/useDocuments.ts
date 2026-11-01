import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import type {
  Document,
  DocumentTypeItem,
  PaginatedResponse,
  PaginationParams,
  OCRResult,
  AuthResult,
} from '../types';

export function useDocuments(params: PaginationParams = {}) {
  const [data, setData] = useState<PaginatedResponse<Document>>({ items: [], total: 0, skip: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedResponse<Document>>('/documents', { params });
      setData(res.data);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}

export function useDocumentTypes() {
  const [types, setTypes] = useState<DocumentTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DocumentTypeItem[]>('/documents/types')
      .then((res) => setTypes(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { types, loading };
}

export function useDocument(id: string | number | undefined) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<Document>(`/documents/${id}`);
      setDocument(res.data);
    } catch {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

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
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      toast.success('Document uploaded and SHA-256 hashed successfully');
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

export function useOCR(documentId: string | number | undefined) {
  const [result, setResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExisting = useCallback(async () => {
    if (!documentId) {
      setResult(null);
      return;
    }
    setFetchLoading(true);
    try {
      const res = await api.get<OCRResult>(`/ocr/results/${documentId}`);
      setResult(res.data);
    } catch {
      setResult(null);
    } finally {
      setFetchLoading(false);
    }
  }, [documentId]);

  useEffect(() => { fetchExisting(); }, [fetchExisting]);

  const processOCR = async (): Promise<void> => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<OCRResult>(`/ocr/process/${documentId}`);
      setResult(res.data);
      toast.success('OCR processing completed');
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'OCR processing failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const correctOCR = async (resultId: number, corrections: Record<string, string | undefined>): Promise<void> => {
    setLoading(true);
    try {
      await api.put(`/ocr/correct/${resultId}`, null, { params: corrections });
      await fetchExisting();
      toast.success('OCR corrections saved with history retained');
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to save corrections');
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, fetchLoading, error, processOCR, correctOCR, refetch: fetchExisting };
}

export function useAuthAnalysis(documentId: string | number | undefined) {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExisting = useCallback(async () => {
    if (!documentId) {
      setResult(null);
      return;
    }
    setFetchLoading(true);
    try {
      const res = await api.get<AuthResult>(`/auth-engine/results/${documentId}`);
      setResult(res.data);
    } catch {
      setResult(null);
    } finally {
      setFetchLoading(false);
    }
  }, [documentId]);

  useEffect(() => { fetchExisting(); }, [fetchExisting]);

  const runAnalysis = async (): Promise<void> => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<AuthResult>(`/auth-engine/analyze/${documentId}`);
      setResult(res.data);
      toast.success('AI Document Authentication analysis completed');
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Analysis failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reviewResult = async (resultId: number, status: string, review_notes?: string): Promise<void> => {
    setLoading(true);
    try {
      await api.put(`/auth-engine/review/${resultId}`, null, { params: { status, review_notes } });
      await fetchExisting();
      toast.success(`Review recorded: ${status}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to update review');
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, fetchLoading, error, runAnalysis, reviewResult, refetch: fetchExisting };
}
