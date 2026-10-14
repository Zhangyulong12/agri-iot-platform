import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../app-routes';
import { useAuthStore } from '../stores/auth-store';

vi.mock('../api/health', () => ({
  getHealth: vi.fn().mockResolvedValue({
    status: 'ok',
    service: 'flowdesk-api',
    timestamp: '2026-10-13T00:00:00Z',
  }),
  getReadiness: vi.fn().mockRejectedValue(new Error('Database unavailable')),
}));

function renderRoute(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Authenticated routing', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'authenticated',
      accessToken: 'test-memory-token',
      user: {
        id: 'test-user',
        email: 'test@example.com',
        displayName: '测试用户',
        createdAt: '2026-10-14T00:00:00Z',
      },
    });
  });
  it.each([
    ['/tickets', '工单管理正在开发中'],
    ['/members', '企业成员正在开发中'],
    ['/settings', '系统设置正在开发中'],
  ])('renders placeholder route %s', (path, title) => {
    renderRoute(path);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('shows real API and database states separately', async () => {
    renderRoute('/');
    expect(await screen.findByText('API 已连接')).toBeInTheDocument();
    expect(await screen.findByText('未就绪')).toBeInTheDocument();
  });

  it('navigates from dashboard to tickets', () => {
    renderRoute('/');
    fireEvent.click(screen.getAllByRole('link', { name: /查看模块/ })[0]!);
    expect(screen.getByRole('heading', { name: '工单管理正在开发中' })).toBeInTheDocument();
  });

  it('redirects anonymous users to an enabled login form', () => {
    useAuthStore.setState({ status: 'anonymous', accessToken: null, user: null });
    renderRoute('/tickets');
    expect(screen.getByRole('button', { name: /^登\s*录$/ })).toBeEnabled();
    expect(screen.queryByText('工单管理正在开发中')).not.toBeInTheDocument();
  });

  it('offers registration and never uses the old public workspace preview', () => {
    useAuthStore.setState({ status: 'anonymous', accessToken: null, user: null });
    renderRoute('/login');
    expect(screen.queryByRole('link', { name: /进入工作台预览/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /创建账户/ }));
    expect(screen.getByLabelText('显示名称')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册并登录' })).toBeEnabled();
  });

  it('shows a retry view when session restoration fails', () => {
    useAuthStore.setState({ status: 'error', accessToken: null, user: null });
    renderRoute('/');
    expect(screen.getByText('暂时无法恢复登录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试连接' })).toBeInTheDocument();
  });

  it('provides a recovery path for unknown routes', () => {
    renderRoute('/missing');
    expect(screen.getByText('你访问的页面不存在。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '返回工作概览' }));
    expect(screen.getByRole('heading', { name: '工作概览' })).toBeInTheDocument();
  });
});
