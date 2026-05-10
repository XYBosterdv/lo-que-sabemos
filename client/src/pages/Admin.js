import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = (process.env.REACT_APP_API_URL || '/api').replace('/api', '') || '';

const categoryOptions = [
  { value: 'general', label: 'General' },
  { value: 'investigacion', label: 'Investigacion' },
  { value: 'denuncia', label: 'Denuncia' },
  { value: 'alerta', label: 'Alerta' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'propiedades', label: 'Propiedades' },
];

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
}

export default function Admin() {
  const { API, token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [view, setView] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [posts, setPosts] = useState([]);
  const [tips, setTips] = useState([]);
  const [tipsData, setTipsData] = useState({});
  const [toast, setToast] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [viewTip, setViewTip] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/stats/admin`, { headers });
      setStats(data);
    } catch {}
  }, [API, token]);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/posts/admin/all`, { headers });
      setPosts(data.posts);
    } catch {}
  }, [API, token]);

  const fetchTips = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/tips`, { headers });
      setTips(data.tips);
      setTipsData(data);
    } catch {}
  }, [API, token]);

  useEffect(() => {
    fetchStats();
    fetchPosts();
    fetchTips();
  }, [fetchStats, fetchPosts, fetchTips]);

  const deletePost = async (id) => {
    if (!window.confirm('Eliminar esta publicacion?')) return;
    try {
      await axios.delete(`${API}/posts/${id}`, { headers });
      showToast('Publicacion eliminada');
      fetchPosts();
      fetchStats();
    } catch { showToast('Error al eliminar', 'error'); }
  };

  const markTipRead = async (id) => {
    try {
      await axios.put(`${API}/tips/${id}/read`, {}, { headers });
      fetchTips();
    } catch {}
  };

  const archiveTip = async (id) => {
    try {
      await axios.put(`${API}/tips/${id}/archive`, {}, { headers });
      showToast('Archivado');
      fetchTips();
    } catch {}
  };

  const deleteTip = async (id) => {
    if (!window.confirm('Eliminar esta denuncia?')) return;
    try {
      await axios.delete(`${API}/tips/${id}`, { headers });
      showToast('Eliminado');
      fetchTips();
      setViewTip(null);
    } catch {}
  };

  const navItems = [
    { key: 'dashboard', label: 'Inicio', icon: '&#9776;' },
    { key: 'posts', label: 'Publicaciones', icon: '&#128196;' },
    { key: 'tips', label: 'Denuncias', icon: '&#128232;' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`admin-nav-item${view === item.key ? ' active' : ''}`}
            onClick={() => setView(item.key)}
          >
            <span dangerouslySetInnerHTML={{ __html: item.icon }} />
            {item.label}
            {item.key === 'tips' && tipsData.unread > 0 && (
              <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 10, padding: '2px 8px', fontSize: 11, marginLeft: 4 }}>
                {tipsData.unread}
              </span>
            )}
          </button>
        ))}
      </aside>

      <main className="admin-content">
        {view === 'dashboard' && (
          <>
            <div className="admin-header"><h1>Dashboard</h1></div>
            <div className="stat-cards">
              <div className="stat-card">
                <div className="label">Total publicaciones</div>
                <div className="value accent">{stats.totalPosts || 0}</div>
              </div>
              <div className="stat-card">
                <div className="label">Publicadas</div>
                <div className="value success">{stats.publishedPosts || 0}</div>
              </div>
              <div className="stat-card">
                <div className="label">Vistas totales</div>
                <div className="value info">{stats.totalViews || 0}</div>
              </div>
              <div className="stat-card">
                <div className="label">Denuncias sin leer</div>
                <div className="value warning">{stats.unreadTips || 0}</div>
              </div>
            </div>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Publicaciones recientes</h2>
            {posts.slice(0, 5).map(p => (
              <div key={p._id} className="post-card" style={{ padding: 16, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{p.title}</strong>
                    <span className={`status-badge ${p.published ? 'published' : 'draft'}`} style={{ marginLeft: 10 }}>
                      {p.published ? 'Publicado' : 'Borrador'}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {new Date(p.createdAt).toLocaleDateString('es-MX')}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {view === 'posts' && !showEditor && (
          <>
            <div className="admin-header">
              <h1>Publicaciones</h1>
              <button className="btn btn-primary" onClick={() => { setEditPost(null); setShowEditor(true); }}>
                + Nueva publicacion
              </button>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Categoria</th>
                  <th>Estado</th>
                  <th>Vistas</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p._id}>
                    <td><strong>{p.title}</strong></td>
                    <td><span className={`post-category ${p.category}`}>{p.category}</span></td>
                    <td><span className={`status-badge ${p.published ? 'published' : 'draft'}`}>{p.published ? 'Publicado' : 'Borrador'}</span></td>
                    <td>{p.views}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(p.createdAt).toLocaleDateString('es-MX')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditPost(p); setShowEditor(true); }}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deletePost(p._id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="admin-table-mobile">
              {posts.map(p => (
                <div key={p._id} className="mobile-card">
                  <div className="mobile-card-title">{p.title}</div>
                  <div className="mobile-card-meta">
                    <span className={`post-category ${p.category}`}>{p.category}</span>
                    <span className={`status-badge ${p.published ? 'published' : 'draft'}`}>{p.published ? 'Publicado' : 'Borrador'}</span>
                    <span>&#128065; {p.views}</span>
                    <span>{new Date(p.createdAt).toLocaleDateString('es-MX')}</span>
                  </div>
                  <div className="mobile-card-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditPost(p); setShowEditor(true); }}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deletePost(p._id)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
            {posts.length === 0 && (
              <div className="empty-state">
                <h3>Sin publicaciones</h3>
                <p>Crea tu primera publicacion</p>
              </div>
            )}
          </>
        )}

        {view === 'posts' && showEditor && (
          <PostEditor
            post={editPost}
            API={API}
            headers={headers}
            onSave={async () => {
              if (editPost?._fromTip) {
                try { await axios.put(`${API}/tips/${editPost._fromTip}/archive`, {}, { headers }); fetchTips(); } catch {}
              }
              setShowEditor(false); fetchPosts(); fetchStats(); showToast('Publicacion guardada');
            }}
            onCancel={() => setShowEditor(false)}
          />
        )}

        {view === 'tips' && (
          <>
            <div className="admin-header">
              <h1>Denuncias recibidas ({tipsData.total || 0})</h1>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Asunto</th>
                  <th>Adjuntos</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tips.map(t => (
                  <tr key={t._id}>
                    <td><span className={`status-badge ${t.read ? 'read' : 'unread'}`}>{t.read ? 'Leido' : 'Nuevo'}</span></td>
                    <td style={{ fontWeight: t.read ? 400 : 700 }}>{t.subject}</td>
                    <td>{t.attachments?.length || 0}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(t.createdAt).toLocaleDateString('es-MX')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setViewTip(t); markTipRead(t._id); }}>Ver</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => archiveTip(t._id)}>Archivar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteTip(t._id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="admin-table-mobile">
              {tips.map(t => (
                <div key={t._id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div className="mobile-card-title" style={{ fontWeight: t.read ? 400 : 700 }}>{t.subject}</div>
                    <span className={`status-badge ${t.read ? 'read' : 'unread'}`}>{t.read ? 'Leido' : 'Nuevo'}</span>
                  </div>
                  <div className="mobile-card-meta">
                    <span>&#128206; {t.attachments?.length || 0} adjuntos</span>
                    <span>{new Date(t.createdAt).toLocaleDateString('es-MX')}</span>
                  </div>
                  <div className="mobile-card-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => { setViewTip(t); markTipRead(t._id); }}>Ver</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => archiveTip(t._id)}>Archivar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteTip(t._id)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
            {tips.length === 0 && (
              <div className="empty-state">
                <h3>Sin denuncias</h3>
                <p>Las denuncias anonimas apareceran aqui</p>
              </div>
            )}
          </>
        )}

        {viewTip && (
          <div className="modal-overlay" onClick={() => setViewTip(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{viewTip.subject}</h2>
                <button className="btn-icon" onClick={() => setViewTip(null)} style={{ fontSize: 20 }}>&times;</button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Recibido: {new Date(viewTip.createdAt).toLocaleString('es-MX')}
              </p>
              <div style={{ background: 'var(--bg-hover)', padding: 20, borderRadius: 'var(--radius-sm)', marginBottom: 20, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14 }}>
                {viewTip.message}
              </div>
              {viewTip.attachments?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-secondary)' }}>Archivos adjuntos</h3>
                  {viewTip.attachments.map((a, i) => (
                    <a key={i} href={`${API_BASE}${a.path}`} target="_blank" rel="noopener noreferrer" className="doc-link">
                      &#128196; {a.originalName}
                    </a>
                  ))}
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 20 }}>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: 14, marginBottom: 12 }}
                  onClick={() => {
                    const paragraphs = viewTip.message.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');
                    const tipDocs = (viewTip.attachments || []).map(a => ({
                      filename: a.filename, originalName: a.originalName, path: a.path
                    }));
                    setEditPost({
                      title: viewTip.subject,
                      content: `<h2>Denuncia recibida</h2><blockquote>La siguiente informacion fue enviada de forma anonima a traves de nuestra plataforma el ${new Date(viewTip.createdAt).toLocaleDateString('es-MX')}.</blockquote>${paragraphs}`,
                      summary: viewTip.message.substring(0, 300) + (viewTip.message.length > 300 ? '...' : ''),
                      category: 'denuncia',
                      tags: ['denuncia anonima'],
                      persons: [],
                      locations: [],
                      images: [],
                      documents: tipDocs,
                      published: false,
                      pinned: false,
                      _fromTip: viewTip._id
                    });
                    setViewTip(null);
                    setView('posts');
                    setShowEditor(true);
                  }}
                >
                  &#128228; Publicar en el blog
                </button>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => archiveTip(viewTip._id)}>Archivar</button>
                  <button className="btn btn-danger" onClick={() => deleteTip(viewTip._id)}>Eliminar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function PostEditor({ post, API, headers, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: post?.title || '',
    content: post?.content || '',
    summary: post?.summary || '',
    category: post?.category || 'general',
    tags: post?.tags?.join(', ') || '',
    published: post?.published || false,
    pinned: post?.pinned || false,
  });
  const [persons, setPersons] = useState(post?.persons || []);
  const [locations, setLocations] = useState(post?.locations || []);
  const [files, setFiles] = useState([]);
  const [existingImages] = useState(post?.images || []);
  const [existingDocs] = useState(post?.documents || []);
  const [saving, setSaving] = useState(false);

  const addPerson = () => setPersons([...persons, { name: '', role: '', description: '' }]);
  const updatePerson = (i, field, val) => { const p = [...persons]; p[i][field] = val; setPersons(p); };
  const removePerson = (i) => setPersons(persons.filter((_, idx) => idx !== i));

  const addLocation = () => setLocations([...locations, { address: '', description: '' }]);
  const updateLocation = (i, field, val) => { const l = [...locations]; l[i][field] = val; setLocations(l); };
  const removeLocation = (i) => setLocations(locations.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('content', form.content);
      fd.append('summary', form.summary);
      fd.append('category', form.category);
      fd.append('tags', JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)));
      fd.append('persons', JSON.stringify(persons.filter(p => p.name)));
      fd.append('locations', JSON.stringify(locations.filter(l => l.address)));
      fd.append('published', form.published);
      fd.append('pinned', form.pinned);
      files.forEach(f => fd.append('files', f));

      if (post?._id) {
        fd.append('existingImages', JSON.stringify(existingImages));
        fd.append('existingDocs', JSON.stringify(existingDocs));
        await axios.put(`${API}/posts/${post._id}`, fd, { headers });
      } else {
        await axios.post(`${API}/posts`, fd, { headers });
      }
      onSave();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="admin-header">
        <h1>{post?._fromTip ? 'Publicar denuncia en el blog' : post?._id ? 'Editar publicacion' : 'Nueva publicacion'}</h1>
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Titulo</label>
          <input type="text" className="form-input" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={200}
            placeholder="Titulo de la publicacion..." />
        </div>

        <div className="form-group">
          <label className="form-label">Resumen (vista previa en feed)</label>
          <textarea className="form-textarea" value={form.summary}
            onChange={e => setForm({ ...form, summary: e.target.value })} rows={3} maxLength={500}
            placeholder="Breve resumen que se mostrara en el feed..." />
        </div>

        <div className="form-group">
          <label className="form-label">Contenido (acepta HTML basico: b, i, p, ul, ol, li, h2, h3, blockquote, a)</label>
          <textarea className="form-textarea" value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })} rows={12} required
            placeholder="Contenido completo de la publicacion..." style={{ minHeight: 300 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select className="form-select" value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}>
              {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tags (separados por coma)</label>
            <input type="text" className="form-input" value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="fraude, investigacion, empresa..." />
          </div>
        </div>

        {/* Persons */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Personas involucradas</label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addPerson}>+ Agregar persona</button>
          </div>
          {persons.map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
              <input type="text" className="form-input" placeholder="Nombre" value={p.name}
                onChange={e => updatePerson(i, 'name', e.target.value)} />
              <input type="text" className="form-input" placeholder="Cargo/Rol" value={p.role}
                onChange={e => updatePerson(i, 'role', e.target.value)} />
              <input type="text" className="form-input" placeholder="Descripcion" value={p.description}
                onChange={e => updatePerson(i, 'description', e.target.value)} />
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removePerson(i)}>&times;</button>
            </div>
          ))}
        </div>

        {/* Locations */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Ubicaciones</label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addLocation}>+ Agregar ubicacion</button>
          </div>
          {locations.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
              <input type="text" className="form-input" placeholder="Direccion" value={l.address}
                onChange={e => updateLocation(i, 'address', e.target.value)} />
              <input type="text" className="form-input" placeholder="Descripcion" value={l.description}
                onChange={e => updateLocation(i, 'description', e.target.value)} />
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeLocation(i)}>&times;</button>
            </div>
          ))}
        </div>

        {/* Files */}
        <div className="form-group">
          <label className="form-label">Archivos (imagenes y documentos)</label>
          <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files))}
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
            style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
          {existingImages.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              {existingImages.length} imagen(es) existente(s)
            </div>
          )}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={form.published}
              onChange={e => setForm({ ...form, published: e.target.checked })} />
            Publicar ahora
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={form.pinned}
              onChange={e => setForm({ ...form, pinned: e.target.checked })} />
            Fijar al inicio
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : (post?._id ? 'Actualizar' : 'Crear publicacion')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
