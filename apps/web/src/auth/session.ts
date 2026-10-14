import axios, { CanceledError } from 'axios';
import { useAuthStore } from '../stores/auth-store';
import { authTransport } from './transport';
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from './types';

let version = 0;
let refreshing: Promise<AuthResponse> | null = null;
let restoring: Promise<void> | null = null;
let channel: BroadcastChannel | undefined;

function clear(status: 'anonymous' | 'error' = 'anonymous') {
  useAuthStore.setState({ status, accessToken: null, user: null });
}
async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('flowdesk-auth-cookie', action)
    : action();
}
function apply(data: AuthResponse, expectedVersion: number) {
  if (expectedVersion !== version) throw new CanceledError('Authentication operation superseded');
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: data.accessToken,
    user: data.user,
  });
}
export function refreshSession(): Promise<AuthResponse> {
  if (refreshing) return refreshing;
  const expectedVersion = version;
  refreshing = withSessionLock(async () => {
    if (expectedVersion !== version) throw new CanceledError('Authentication operation superseded');
    const { data } = await authTransport.post<AuthResponse>('/auth/refresh', {});
    apply(data, expectedVersion);
    return data;
  })
    .catch((error: unknown) => {
      if (version === expectedVersion)
        clear(axios.isAxiosError(error) && error.response?.status === 401 ? 'anonymous' : 'error');
      throw error;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}
export function restoreSession(): Promise<void> {
  if (restoring) return restoring;
  const expectedVersion = version;
  useAuthStore.setState({ status: 'loading' });
  restoring = (async () => {
    try {
      const data = await refreshSession();
      const current = await authTransport.get<AuthUser>('/auth/me', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      apply({ ...data, user: current.data }, expectedVersion);
    } catch (error) {
      if (expectedVersion === version)
        clear(axios.isAxiosError(error) && error.response?.status === 401 ? 'anonymous' : 'error');
    }
  })().finally(() => {
    restoring = null;
  });
  return restoring;
}
async function authenticate(path: string, input: LoginInput | RegisterInput): Promise<void> {
  const expectedVersion = ++version;
  await withSessionLock(async () => {
    const { data } = await authTransport.post<AuthResponse>(path, input);
    apply(data, expectedVersion);
    channel?.postMessage('changed');
  });
}
export const login = (input: LoginInput) => authenticate('/auth/login', input);
export const register = (input: RegisterInput) => authenticate('/auth/register', input);
export async function logout(): Promise<void> {
  ++version;
  await withSessionLock(async () => {
    await authTransport.post('/auth/logout', {});
    clear();
    channel?.postMessage('logout');
  });
}
export function installAuthBroadcast(): void {
  if (channel || typeof window.BroadcastChannel !== 'function') return;
  channel = new window.BroadcastChannel('flowdesk-auth');
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (event.data !== 'logout' && event.data !== 'changed') return;
    ++version;
    clear();
  };
}
export function authErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return '请检查邮箱、昵称和密码格式';
  }
  return '服务暂不可用，请稍后重试';
}
