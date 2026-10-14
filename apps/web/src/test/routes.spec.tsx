import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../app-routes';

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

describe('Phase one routing', () => {
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

  it('keeps login disabled and offers an explicit preview link', () => {
    renderRoute('/login');
    expect(screen.getByRole('button', { name: '登录（认证开发中）' })).toBeDisabled();
    fireEvent.click(screen.getByRole('link', { name: /进入工作台预览/ }));
    expect(screen.getByRole('heading', { name: '工作概览' })).toBeInTheDocument();
  });

  it('provides a recovery path for unknown routes', () => {
    renderRoute('/missing');
    expect(screen.getByText('你访问的页面不存在。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '返回工作概览' }));
    expect(screen.getByRole('heading', { name: '工作概览' })).toBeInTheDocument();
  });
});
