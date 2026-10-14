import axios from 'axios';
// Authentication endpoints deliberately have no 401 refresh interceptor.
export const authTransport = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-FlowDesk-CSRF': '1',
  },
});
