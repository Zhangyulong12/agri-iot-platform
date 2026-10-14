import { Button, Result, Spin } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { restoreSession } from './session';
export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();
  if (status === 'loading')
    return (
      <div className="not-found">
        <Spin description="正在恢复登录会话" />
      </div>
    );
  if (status === 'error')
    return (
      <div className="not-found">
        <Result
          status="warning"
          title="暂时无法恢复登录"
          subTitle="请确认 API 和数据库已启动，再重试。"
          extra={
            <Button
              onClick={() => {
                void restoreSession();
              }}
            >
              重试连接
            </Button>
          }
        />
      </div>
    );
  if (status !== 'authenticated')
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
