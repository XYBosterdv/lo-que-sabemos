import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShieldIcon, CheckIcon, SendIcon } from '../components/Icons';

export default function TipForm() {
  const { API } = useAuth();
  const [form, setForm] = useState({ subject: '', message: '' });
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Completa todos los campos');
      return;
    }
    setSending(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('subject', form.subject);
      fd.append('message', form.message);
      files.forEach(f => fd.append('attachments', f));
      await axios.post(`${API}/tips`, fd);
      setSent(true);
    } catch {
      setError('Error al enviar. Intenta de nuevo.');
    }
    setSending(false);
  };

  if (sent) {
    return (
      <main className="main-content">
        <div className="tip-section" style={{ textAlign: 'center' }}>
          <CheckIcon style={{ width: 48, height: 48, color: 'var(--success)', marginBottom: 16 }} />
          <h2>Informacion recibida</h2>
          <p style={{ marginTop: 12 }}>
            Tu informacion ha sido enviada de forma anonima. Sera revisada por el equipo de investigacion.
            No se almacena ningun dato que pueda identificarte.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => { setSent(false); setForm({ subject: '', message: '' }); setFiles([]); }}>
            Enviar otra denuncia
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="tip-section">
        <h2>Enviar informacion anonima</h2>
        <p>
          Tu identidad esta protegida. No almacenamos IPs, correos ni datos personales.
          Toda la informacion sera revisada de forma confidencial.
        </p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Asunto</label>
            <input
              type="text"
              className="form-input"
              placeholder="Breve descripcion del tema..."
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Informacion</label>
            <textarea
              className="form-textarea"
              placeholder="Describe la informacion que deseas compartir. Incluye nombres, fechas, lugares y cualquier detalle relevante..."
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              rows={8}
              maxLength={5000}
            />
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {form.message.length}/5000
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Archivos adjuntos (opcional)</label>
            <input
              type="file"
              multiple
              onChange={e => setFiles(Array.from(e.target.files))}
              style={{ fontSize: 14, color: 'var(--text-secondary)' }}
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Formatos: JPG, PNG, PDF, DOC. Maximo 10MB por archivo.
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={sending} style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
            {sending ? 'Enviando...' : (
              <>
                <SendIcon style={{ width: 16, height: 16 }} />
                Enviar informacion de forma anonima
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ShieldIcon style={{ width: 20, height: 20, color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Aviso de privacidad:</strong> Esta plataforma no almacena
            direcciones IP, cookies de rastreo ni ningun dato que permita identificar al remitente.
            La informacion enviada sera utilizada unicamente con fines de investigacion y divulgacion publica.
          </p>
        </div>
      </div>
    </main>
  );
}
