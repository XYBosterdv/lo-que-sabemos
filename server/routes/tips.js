const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const sanitize = require('sanitize-html');
const { Collection } = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

const tips = new Collection('tips');

// Allowed MIME types for tips
const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const ALLOWED_EXTS = /\.(jpeg|jpg|png|gif|webp|pdf|doc|docx)$/i;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, 'tip-' + unique + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype) || !ALLOWED_EXTS.test(file.originalname)) {
      return cb(new Error('Tipo de archivo no permitido'), false);
    }
    cb(null, true);
  }
});

router.post('/', upload.array('attachments', 5), (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !subject.trim() || !message || !message.trim()) {
      return res.status(400).json({ error: 'Asunto y mensaje son requeridos' });
    }

    if (subject.length > 200) {
      return res.status(400).json({ error: 'Asunto demasiado largo (max 200 caracteres)' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Mensaje demasiado largo (max 5000 caracteres)' });
    }

    const attachments = req.files
      ? req.files.map(f => ({ filename: f.filename, originalName: f.originalname, path: '/uploads/' + f.filename }))
      : [];

    tips.create({
      subject: sanitize(subject.trim(), { allowedTags: [] }),
      message: sanitize(message.trim(), { allowedTags: [] }),
      attachments,
      read: false,
      archived: false
    });

    res.status(201).json({ message: 'Informacion recibida. Gracias por tu aporte.' });
  } catch (err) {
    console.error('[Tips POST]', err.message);
    res.status(500).json({ error: 'Error al enviar' });
  }
});

router.get('/', auth, (req, res) => {
  try {
    let items = tips.findAll();
    if (req.query.archived !== undefined) {
      items = items.filter(t => t.archived === (req.query.archived === 'true'));
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unread = tips.findAll().filter(t => !t.read).length;
    res.json({ tips: items, total: items.length, unread, pages: 1 });
  } catch (err) {
    console.error('[Tips GET]', err.message);
    res.status(500).json({ error: 'Error al obtener denuncias' });
  }
});

router.put('/:id/read', auth, (req, res) => {
  try {
    tips.update(req.params.id, { read: true });
    res.json({ message: 'Marcado como leido' });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

router.put('/:id/archive', auth, (req, res) => {
  try {
    tips.update(req.params.id, { archived: true });
    res.json({ message: 'Archivado' });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

router.delete('/:id', auth, (req, res) => {
  try {
    tips.delete(req.params.id);
    res.json({ message: 'Eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
