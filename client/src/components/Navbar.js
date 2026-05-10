import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="navbar" aria-label="Navegacion principal">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="Inicio - Lo que sabemos de XY Booster">
          <div className="icon" aria-hidden="true">XY</div>
          <span className="brand-full">Lo que sabemos de XY Booster</span>
          <span className="brand-short">XY Booster</span>
        </Link>
        <div className="navbar-actions">
          <Link
            to="/denunciar"
            className="btn btn-secondary btn-sm"
            aria-current={location.pathname === '/denunciar' ? 'page' : undefined}
          >
            Enviar Info
          </Link>
          {isAdmin ? (
            <>
              <Link
                to="/admin"
                className="btn btn-primary btn-sm"
                aria-current={location.pathname.startsWith('/admin') ? 'page' : undefined}
              >
                Panel Admin
              </Link>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="btn btn-ghost btn-sm"
                aria-label="Cerrar sesion de administrador"
              >
                Salir
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
