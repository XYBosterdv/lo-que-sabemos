import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { SearchIcon, AlertIcon } from '../components/Icons';

const categories = [
  { key: '', label: 'Todos' },
  { key: 'investigacion', label: 'Investigacion' },
  { key: 'denuncia', label: 'Denuncias' },
  { key: 'alerta', label: 'Alertas' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'propiedades', label: 'Propiedades' },
  { key: 'general', label: 'General' },
];

export default function Feed() {
  const { API } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [stats, setStats] = useState({ posts: 0, published: 0, views: 0 });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (category) params.category = category;
      if (search) params.search = search;
      const { data } = await axios.get(`${API}/posts`, { params });
      setPosts(data.posts);
      setTotalPages(data.pages);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [API, page, category, search]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    axios.get(`${API}/stats`).then(({ data }) => setStats(data)).catch(() => {});
  }, [API]);

  const handleSearch = (val) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 500);
    setSearchTimeout(timeout);
  };

  return (
    <main className="main-content" id="main-content" role="main">
      {/* Hero Banner */}
      {!search && !category && page === 1 && (
        <div className="hero-banner">
          <div className="hero-badge">
            <AlertIcon style={{ width: 14, height: 14 }} />
            Investigacion en curso
          </div>
          <h1 className="hero-title">
            Todo sobre <span className="accent">XY Booster</span>
          </h1>
          <p className="hero-description">
            Plataforma de investigacion publica y colaborativa. Aqui recopilamos documentos,
            testimonios y evidencia sobre las operaciones de XY Booster.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="num">{stats.published || 0}</span> publicaciones
            </div>
            <div className="hero-stat">
              <span className="num">{stats.views || 0}</span> lecturas
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="search-container">
        <div className="search-wrapper">
          <span className="search-icon">
            <SearchIcon />
          </span>
          <input
            type="search"
            className="search-input"
            placeholder="Buscar personas, empresas, publicaciones..."
            aria-label="Buscar publicaciones"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="categories-filter">
        {categories.map(c => (
          <button
            key={c.key}
            className={`cat-btn${category === c.key ? ' active' : ''}`}
            onClick={() => { setCategory(c.key); setPage(1); }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <SearchIcon />
          <h3>No se encontraron publicaciones</h3>
          <p>Intenta con otros terminos de busqueda o selecciona otra categoria</p>
        </div>
      ) : (
        <>
          {posts.map(post => <PostCard key={post._id} post={post} />)}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} className={`page-btn${page === i + 1 ? ' active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
