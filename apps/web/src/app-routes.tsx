import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/app-layout';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { NotFoundPage } from './pages/not-found-page';
import { PlaceholderPage } from './pages/placeholder-page';
import { ProtectedRoute } from './auth/protected-route';
import { devPreviewEnabled } from './auth/preview';
import { DevPreviewPage } from './pages/dev-preview-page';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<LoginPage mode="register" />} />
      {devPreviewEnabled && <Route path="/dev-preview" element={<DevPreviewPage />} />}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tickets" element={<PlaceholderPage module="tickets" />} />
          <Route path="members" element={<PlaceholderPage module="members" />} />
          <Route path="settings" element={<PlaceholderPage module="settings" />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
