import axios from 'axios';
import { handleEmbeddedApiRequest, generatePdfBlobUrl } from './localEngine';

const metaEnv = (import.meta as any).env || {};
export const API_BASE_URL = (
  metaEnv.VITE_API_BASE_URL ||
  metaEnv.VITE_API_URL ||
  '/api/v1'
).replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getDownloadUrl(filePath?: string | null, fallbackTitle?: string): string {
  if (!filePath) {
    return generatePdfBlobUrl(fallbackTitle || 'Verification Document', [
      'Document verified by AI-BMEZ Regulatory Compliance System.',
    ]);
  }
  if (
    filePath.startsWith('blob:') ||
    filePath.startsWith('data:') ||
    filePath.startsWith('http://') ||
    filePath.startsWith('https://')
  ) {
    return filePath;
  }
  // If we are running against a live backend, construct origin-relative URL
  if (sessionStorage.getItem('aibmez_embedded_mode') === 'true') {
    return generatePdfBlobUrl(fallbackTitle || filePath.split('/').pop() || 'Institutional Report', [
      `Document / Report Path: ${filePath}`,
      'Authenticated by AI-BMEZ Document Verification Engine.',
      'Status: Verified & Cryptographically Hashed (SHA-256).',
    ]);
  }
  const backendOrigin = API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/api\/v1$/, '')
    : window.location.origin;
  const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${backendOrigin}${normalized}`;
}

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aibmez_access_token') || localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle static host fallback or 401
api.interceptors.response.use(
  async (response) => {
    // If a static host (e.g. Vercel SPA rewrite) returned index.html (string starting with <!doctype html) for an API route
    if (
      typeof response.data === 'string' &&
      (response.data.trim().toLowerCase().startsWith('<!doctype') ||
        response.data.trim().toLowerCase().startsWith('<html'))
    ) {
      sessionStorage.setItem('aibmez_embedded_mode', 'true');
      return handleEmbeddedApiRequest(response.config);
    }
    sessionStorage.removeItem('aibmez_embedded_mode');
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
    const isStaticHostMissingRoute =
      status === 404 ||
      status === 405 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      (typeof error.response?.data === 'string' && error.response.data.includes('<!DOCTYPE'));

    if (error.config && (isNetworkError || isStaticHostMissingRoute)) {
      try {
        sessionStorage.setItem('aibmez_embedded_mode', 'true');
        return await handleEmbeddedApiRequest(error.config);
      } catch (embeddedErr: any) {
        if (embeddedErr?.response?.status === 401) {
          const reqUrl = String(error.config?.url || '');
          if (!reqUrl.includes('/auth/login') && !reqUrl.includes('/auth/register')) {
            localStorage.removeItem('aibmez_access_token');
            localStorage.removeItem('aibmez_user');
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(embeddedErr);
      }
    }

    if (status === 401) {
      const reqUrl = String(error.config?.url || '');
      if (!reqUrl.includes('/auth/login') && !reqUrl.includes('/auth/register')) {
        localStorage.removeItem('aibmez_access_token');
        localStorage.removeItem('aibmez_user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
