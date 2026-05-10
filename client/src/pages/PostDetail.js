import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { EyeIcon, ShareIcon, MapPinIcon, FileIcon, UserIcon, CopyIcon } from '../components/Icons';

const API_BASE = (process.env.REACT_APP_API_URL || '/api').replace('/api', '') || '';

const categoryLabels = {
  investigacion: 'Investigacion', denuncia: 'Denuncia', alerta: 'Alerta',
  documentos: 'Documentos', propiedades: 'Propiedades', general: 'General'
};

export default function PostDetail() {
  const { id } = useParams();
  const { API } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewImage, setViewImage] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios.get(`${API}/posts/${id}`)
      .then(({ data }) => setPost(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [API, id]);

  if (loading) return <div className="main-content"><div className="loader"><div className="spinner" /></div></div>;
  if (!post) return <div className="main-content"><div className="empty-state"><h3>Publicacion no encontrada</h3><Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Volver al inicio</Link></div></div>;

  const url = window.location.href;
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowShare(false);
  };

  const shareActions = [
    { label: copied ? 'Copiado!' : 'Copiar enlace', icon: <CopyIcon />, action: handleCopy },
    { label: 'WhatsApp', action: () => window.open(`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + url)}`) },
    { label: 'Twitter / X', action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`) },
    { label: 'Facebook', action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`) },
    { label: 'Telegram', action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`) },
  ];

  return (
    <main className="main-content">
      <Link to="/" className="btn btn-ghost" style={{ marginBottom: 20 }}>&larr; Volver</Link>

      <article className="post-card" style={{ marginBottom: 0 }}>
        <div className="post-header">
          <div className="post-meta">
            <span className={`post-category ${post.category}`}>{categoryLabels[post.category]}</span>
            <span className="post-date">
              {new Date(post.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="post-stats">
            <span><EyeIcon style={{ width: 15, height: 15 }} /> {post.views}</span>
          </div>
        </div>

        <h1 className="post-title" style={{ fontSize: 26, marginBottom: 20, letterSpacing: '-0.5px' }}>{post.title}</h1>

        {post.tags?.length > 0 && (
          <div className="post-tags">
            {post.tags.map((t, i) => <span key={i} className="tag">#{t}</span>)}
          </div>
        )}

        {post.images?.length > 0 && (
          <div className={`post-images ${post.images.length === 1 ? 'single' : 'multiple'}`} style={{ marginBottom: 24 }}>
            {post.images.map((img, i) => (
              <img key={i} src={`${API_BASE}${img}`} alt={`Imagen ${i + 1}`}
                onClick={() => setViewImage(`${API_BASE}${img}`)} loading="lazy" />
            ))}
          </div>
        )}

        <div className="post-content-full" dangerouslySetInnerHTML={{ __html: post.content }} />

        {post.persons?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12, color: 'var(--text-secondary)' }}>Personas mencionadas</h3>
            <div className="post-persons">
              <div className="persons-list">
                {post.persons.map((p, i) => (
                  <span key={i} className="person-tag">
                    <UserIcon />
                    <span className="name">{p.name}</span>
                    {p.role && <span className="role">- {p.role}</span>}
                    {p.description && <span className="role">| {p.description}</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {post.locations?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12, color: 'var(--text-secondary)' }}>Ubicaciones</h3>
            <div className="post-locations">
              {post.locations.map((loc, i) => (
                <div key={i} className="location-item">
                  <MapPinIcon />
                  <div>
                    <strong>{loc.address}</strong>
                    {loc.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{loc.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {post.documents?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12, color: 'var(--text-secondary)' }}>Documentos adjuntos</h3>
            <div className="post-documents">
              {post.documents.map((doc, i) => (
                <a key={i} href={`${API_BASE}${doc.path}`} target="_blank" rel="noopener noreferrer" className="doc-link">
                  <FileIcon /> {doc.originalName}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="post-footer" style={{ marginTop: 24, position: 'relative' }}>
          <div className="post-stats">
            <span><EyeIcon style={{ width: 15, height: 15 }} /> {post.views} vistas</span>
          </div>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowShare(!showShare)}>
              <ShareIcon style={{ width: 14, height: 14 }} /> Compartir
            </button>
            {showShare && (
              <div className="share-menu">
                {shareActions.map((s, i) => (
                  <button key={i} className="share-option" onClick={s.action}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>

      {viewImage && (
        <div className="image-viewer" onClick={() => setViewImage(null)}>
          <img src={viewImage} alt="Vista ampliada" />
        </div>
      )}
    </main>
  );
}
