import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app-routes';
import 'antd/dist/reset.css';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});
const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');
createRoot(root).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#155eef',
          colorText: '#182230',
          colorTextSecondary: '#667085',
          colorBgLayout: '#f5f7fb',
          borderRadius: 10,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif",
        },
        components: {
          Menu: { itemHeight: 44, itemMarginBlock: 5, itemSelectedBg: '#eaf0ff' },
          Layout: { headerBg: '#fff', siderBg: '#fff' },
          Card: { headerFontSize: 15 },
        },
      }}
    >
      <App>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </QueryClientProvider>
      </App>
    </ConfigProvider>
  </StrictMode>,
);
