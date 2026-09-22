import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DriverHomePage } from './pages/DriverHomePage';
import { StartServicePage } from './pages/StartServicePage';
import { EndServicePage } from './pages/EndServicePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminServicesPage } from './pages/AdminServicesPage';
import { AdminServiceDetailPage } from './pages/AdminServiceDetailPage';
import { AdminDriversPage } from './pages/AdminDriversPage';
import { AdminAuditPage } from './pages/AdminAuditPage';

function Protected({ children, role }: { children: ReactNode; role?: 'ADMIN' | 'DRIVER' }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="login-page">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected role="DRIVER"><DriverHomePage /></Protected>} />
      <Route path="/iniciar" element={<Protected role="DRIVER"><StartServicePage /></Protected>} />
      <Route path="/cerrar/:id" element={<Protected role="DRIVER"><EndServicePage /></Protected>} />
      <Route path="/admin" element={<Protected role="ADMIN"><AdminLayout /></Protected>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="servicios" element={<AdminServicesPage />} />
        <Route path="servicios/:id" element={<AdminServiceDetailPage />} />
        <Route path="conductores" element={<AdminDriversPage />} />
        <Route path="auditoria" element={<AdminAuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
