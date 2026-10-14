import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/app-layout';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { NotFoundPage } from './pages/not-found-page';
import { PlaceholderPage } from './pages/placeholder-page';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="tickets" element={<PlaceholderPage module="tickets" />} />
        <Route path="members" element={<PlaceholderPage module="members" />} />
        <Route path="settings" element={<PlaceholderPage module="settings" />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
