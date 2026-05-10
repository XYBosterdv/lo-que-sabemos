import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import Feed from './pages/Feed';
import PostDetail from './pages/PostDetail';
import Login from './pages/Login';
import Admin from './pages/Admin';
import TipForm from './pages/TipForm';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!isAdmin) return <Login />;
  return children;
}

function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="icon" aria-hidden="true">XY</div>
          <span>Lo que sabemos de XY Booster</span>
        </div>
        <nav className="footer-links" aria-label="Enlaces del pie de pagina">
          <Link to="/">Inicio</Link>
          <Link to="/denunciar">Enviar Info</Link>
          <Link to="/login">Admin</Link>
        </nav>
        <div className="footer-divider" aria-hidden="true" />
        <p className="footer-disclaimer">
          Esta plataforma recopila informacion de interes publico con fines de
          investigacion y transparencia. No almacenamos datos personales de los visitantes.
        </p>
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} Lo que sabemos de XY Booster. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="app">
        <a href="#main-content" className="skip-link">Saltar al contenido</a>
        <Navbar />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/denunciar" element={<TipForm />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/*" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          </Routes>
        </ErrorBoundary>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}
