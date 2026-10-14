import axios, { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthResponse } from '../auth/types';

const transport = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('../auth/transport', () => ({ authTransport: transport }));
const response: AuthResponse = {
  accessToken: 'new-memory-token',
  expiresIn: 900,
  user: {
    id: 'user',
    email: 'user@example.com',
    displayName: '用户',
    createdAt: '2026-10-14T00:00:00Z',
  },
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function failure(status: number) {
  return new AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });
}
beforeEach(() => {
  vi.resetModules();
  transport.post.mockReset();
  transport.get.mockReset();
});

describe('Session coordination', () => {
  it('shares exactly one refresh across concurrent callers and retains no persistent token', async () => {
    const session = await import('../auth/session');
    const { useAuthStore } = await import('../stores/auth-store');
    const pending = deferred<{ data: AuthResponse }>();
    transport.post.mockReturnValue(pending.promise);
    const first = session.refreshSession();
    const second = session.refreshSession();
    expect(first).toBe(second);
    pending.resolve({ data: response });
    await Promise.all([first, second]);
    expect(transport.post).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it('clears rejected sessions and allows a later explicit retry', async () => {
    const session = await import('../auth/session');
    const { useAuthStore } = await import('../stores/auth-store');
    transport.post.mockRejectedValueOnce(failure(401)).mockResolvedValueOnce({ data: response });
    await expect(session.refreshSession()).rejects.toBeInstanceOf(AxiosError);
    expect(useAuthStore.getState()).toMatchObject({
      status: 'anonymous',
      accessToken: null,
      user: null,
    });
    await session.refreshSession();
    expect(transport.post).toHaveBeenCalledTimes(2);
  });
  it('does not let a late refresh sign the user back in after logout', async () => {
    const session = await import('../auth/session');
    const { useAuthStore } = await import('../stores/auth-store');
    const pending = deferred<{ data: AuthResponse }>();
    transport.post.mockImplementation((path: string) =>
      path === '/auth/refresh' ? pending.promise : Promise.resolve({}),
    );
    const refresh = session.refreshSession();
    const rejected = expect(refresh).rejects.toSatisfy(axios.isCancel);
    await session.logout();
    pending.resolve({ data: response });
    await rejected;
    expect(useAuthStore.getState().status).toBe('anonymous');
  });
  it('restores the cookie session and verifies the current user', async () => {
    const session = await import('../auth/session');
    const { useAuthStore } = await import('../stores/auth-store');
    transport.post.mockResolvedValue({ data: response });
    transport.get.mockResolvedValue({ data: response.user });
    await session.restoreSession();
    expect(transport.get).toHaveBeenCalledWith('/auth/me', {
      headers: { Authorization: `Bearer ${response.accessToken}` },
    });
    expect(useAuthStore.getState().user).toEqual(response.user);
  });
  it('distinguishes anonymous restoration from database/network failures', async () => {
    const session = await import('../auth/session');
    const { useAuthStore } = await import('../stores/auth-store');
    transport.post.mockRejectedValueOnce(failure(401));
    await session.restoreSession();
    expect(useAuthStore.getState().status).toBe('anonymous');
    transport.post.mockRejectedValueOnce(failure(503));
    await session.restoreSession();
    expect(useAuthStore.getState().status).toBe('error');
  });
  it('keeps a newer login when an older restoration finishes late', async () => {
    const session = await import('../auth/session');
    const { useAuthStore } = await import('../stores/auth-store');
    const current = deferred<{ data: AuthResponse['user'] }>();
    transport.post.mockResolvedValueOnce({ data: response });
    transport.get.mockReturnValue(current.promise);
    const restore = session.restoreSession();
    await vi.waitFor(() => expect(transport.get).toHaveBeenCalledTimes(1));
    const other = {
      ...response,
      accessToken: 'another-account',
      user: { ...response.user, id: 'another' },
    };
    transport.post.mockResolvedValueOnce({ data: other });
    await session.login({ email: other.user.email, password: 'long-enough-password' });
    current.resolve({ data: response.user });
    await restore;
    expect(useAuthStore.getState().accessToken).toBe('another-account');
    expect(useAuthStore.getState().user?.id).toBe('another');
  });
});

describe('Business request refresh', () => {
  it('refreshes once for concurrent 401s and retries each request once', async () => {
    const { apiClient } = await import('../api/client');
    const { useAuthStore } = await import('../stores/auth-store');
    useAuthStore.setState({ status: 'authenticated', accessToken: 'old', user: response.user });
    transport.post.mockResolvedValue({ data: response });
    const adapter = vi.fn(async (config) => {
      if (config.headers.get('Authorization') === 'Bearer old')
        throw new AxiosError('Expired', 'ERR_BAD_RESPONSE', config, undefined, {
          status: 401,
          statusText: '',
          headers: {},
          data: {},
          config,
        });
      return { status: 200, statusText: '', headers: {}, data: 'ok', config };
    });
    apiClient.defaults.adapter = adapter;
    const results = await Promise.all([apiClient.get('/protected'), apiClient.get('/protected')]);
    expect(results.map((result) => result.data)).toEqual(['ok', 'ok']);
    expect(transport.post).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(4);
  });
  it('stops after a retried request is also unauthorized', async () => {
    const { apiClient } = await import('../api/client');
    const { useAuthStore } = await import('../stores/auth-store');
    useAuthStore.setState({ status: 'authenticated', accessToken: 'old', user: response.user });
    transport.post.mockResolvedValue({ data: response });
    const adapter = vi.fn(async (config) => {
      throw new AxiosError('Denied', 'ERR_BAD_RESPONSE', config, undefined, {
        status: 401,
        statusText: '',
        headers: {},
        data: {},
        config,
      });
    });
    apiClient.defaults.adapter = adapter;
    await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(AxiosError);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(transport.post).toHaveBeenCalledTimes(1);
  });
});
