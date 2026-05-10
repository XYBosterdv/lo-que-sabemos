import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, ShareIcon, MapPinIcon, FileIcon, UserIcon, PinIcon, CopyIcon, ExternalLinkIcon } from './Icons';

const API_BASE = (process.env.REACT_APP_API_URL || '/api').replace('/api', '') || '';

const categoryLabels = {
  investigacion: 'Investigacion',
  denuncia: 'Denuncia',
  alerta: 'Alerta',
  documentos: 'Documentos',
  propiedades: 'Propiedades',
  general: 'General'
};

function formatDate(d) {
  const date = new Date(d);
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} dias`;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PostCard({ post }) {
  const [showShare, setShowShare] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [showAllPersons, setShowAllPersons] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/post/${post._id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowShare(false);
  };

  const shareActions = [
    { label: copied ? 'Copiado!' : 'Copiar enlace', icon: <CopyIcon />, action: handleCopy },
    { label: 'WhatsApp', icon: null, action: () => window.open(`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + url)}`) },
    { label: 'Twitter / X', icon: null, action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`) },
    { label: 'Facebook', icon: null, action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`) },
    { label: 'Telegram', icon: null, action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`) },
  ];

  const MAX_PERSONS = 3;
  const visiblePersons = showAllPersons ? post.persons : post.persons?.slice(0, MAX_PERSONS);
  const hiddenCount = (post.persons?.length || 0) - MAX_PERSONS;

  return (
    <>
      <article className={`post-card${post.pinned ? ' pinned' : ''}`}>
        <div className="post-header">
          <div className="post-meta">
            <span className={`post-category ${post.category}`}>{categoryLabels[post.category] || post.category}</span>
            <span className="post-date">{formatDate(post.createdAt)}</span>
            {post.pinned && (
              <span className="pinned-badge">
                <PinIcon />
                Fijado
              </span>
            )}
          </div>
        </div>

        <h2 className="post-title"><Link to={`/post/${post._id}`}>{post.title}</Link></h2>

        {post.summary && <p className="post-summary">{post.summary}</p>}

        {post.tags?.length > 0 && (
          <div className="post-tags">
            {post.tags.map((t, i) => <span key={i} className="tag">#{t}</span>)}
          </div>
        )}

        {post.images?.length > 0 && (
          <div className={`post-images ${post.images.length === 1 ? 'single' : 'multiple'}`}>
            {post.images.slice(0, 4).map((img, i) => (
              <img
                key={i}
                src={`${API_BASE}${img}`}
                alt={`Imagen ${i + 1}`}
                onClick={() => setViewImage(`${API_BASE}${img}`)}
                loading="lazy"
              />
            ))}
          </div>
        )}

        {visiblePersons?.length > 0 && (
          <div className="post-persons">
            <div className="persons-list">
              {visiblePersons.map((p, i) => (
                <span key={i} className="person-tag">
                  <UserIcon />
                  <span className="name">{p.name}</span>
                  {p.role && <span className="role">- {p.role}</span>}
                </span>
              ))}
              {!showAllPersons && hiddenCount > 0 && (
                <button className="persons-toggle" onClick={() => setShowAllPersons(true)}>
                  +{hiddenCount} mas
                </button>
              )}
              {showAllPersons && post.persons?.length > MAX_PERSONS && (
                <button className="persons-toggle" onClick={() => setShowAllPersons(false)}>
                  Ver menos
                </button>
              )}
            </div>
          </div>
        )}

        {post.locations?.length > 0 && (
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
        )}

        {post.documents?.length > 0 && (
          <div className="post-documents">
            {post.documents.map((doc, i) => (
              <a key={i} href={`${API_BASE}${doc.path}`} target="_blank" rel="noopener noreferrer" className="doc-link">
                <FileIcon /> {doc.originalName}
              </a>
            ))}
          </div>
        )}

        <div className="post-footer">
          <div className="post-stats">
            <span><EyeIcon /> {post.views || 0}</span>
            <span><ShareIcon /> {post.shares || 0}</span>
          </div>
          <div className="post-actions" style={{ position: 'relative' }}>
            <Link to={`/post/${post._id}`} className="btn btn-ghost btn-sm">
              Leer mas <ExternalLinkIcon style={{ width: 14, height: 14 }} />
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowShare(!showShare)} aria-label="Compartir publicacion" aria-expanded={showShare}>
              Compartir <ShareIcon style={{ width: 14, height: 14 }} />
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
    </>
  );
}
