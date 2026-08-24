import axios from 'axios';
import { useAuthStore } from '@/hooks/useAuth';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Envoie le cookie JWT httpOnly automatiquement
});

let isRefreshing = false;
let pendingQueue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

const flushQueue = (error?: unknown) => {
  pendingQueue.forEach(p => error ? p.reject(error) : p.resolve());
  pendingQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    const isAuthEndpoint = original?.url?.includes('/auth/login')
      || original?.url?.includes('/auth/register')
      || original?.url?.includes('/auth/refresh');

    if (err.response?.status !== 401 || original?._retry || isAuthEndpoint) {
      if (err.response?.status === 401 && window.location.pathname !== '/auth') {
        useAuthStore.getState().setUser(null);
        window.location.href = '/auth';
      }
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: () => resolve(api(original)),
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      await api.post('/auth/refresh');
      flushQueue();
      return api(original);
    } catch (refreshErr) {
      flushQueue(refreshErr);
      useAuthStore.getState().setUser(null);
      window.location.href = '/auth';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);
