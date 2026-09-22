import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <img src="/logo.jpeg" alt="911 Transportes Especiales" />
          <div>
            <strong className="brand-font">Panel administrativo</strong>
            <span>911 Transportes Especiales</span>
          </div>
        </div>
        <div className="row">
          <span className="muted">{user?.fullName}</span>
          <button
            className="btn btn-ghost"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Salir
          </button>
        </div>
      </header>
      <nav className="mobile-nav">
        <NavLink to="/admin" end>Dashboard</NavLink>
        <NavLink to="/admin/servicios">Servicios</NavLink>
        <NavLink to="/admin/conductores">Conductores</NavLink>
        <NavLink to="/admin/auditoria">Auditoría</NavLink>
      </nav>
      <div className="layout">
        <aside className="sidebar">
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/servicios">Servicios</NavLink>
          <NavLink to="/admin/conductores">Conductores</NavLink>
          <NavLink to="/admin/auditoria">Auditoría</NavLink>
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
