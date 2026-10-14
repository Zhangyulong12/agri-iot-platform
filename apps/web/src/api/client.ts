import axios from 'axios';
import { useAuthStore } from '../stores/auth-store';
import { refreshSession } from '../auth/session';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 5000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) throw error;
    const config = error.config as typeof error.config & { authRetried?: boolean };
    if (config.authRetried || useAuthStore.getState().status !== 'authenticated') throw error;
    config.authRetried = true;
    let token = useAuthStore.getState().accessToken;
    if (!token || config.headers.get('Authorization') === `Bearer ${token}`)
      token = (await refreshSession()).accessToken;
    config.headers.set('Authorization', `Bearer ${token}`);
    return apiClient(config);
  },
);
