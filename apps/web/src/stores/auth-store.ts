import { create } from 'zustand';
import type { AuthUser } from '../auth/types';

interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous' | 'error';
  accessToken: string | null;
  user: AuthUser | null;
}
// No persistence middleware: credentials only live in this page's memory.
export const useAuthStore = create<AuthState>(() => ({
  status: 'loading',
  accessToken: null,
  user: null,
}));
