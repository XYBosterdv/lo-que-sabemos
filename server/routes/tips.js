const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sanitize = require('sanitize-html');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const { Collection } = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

const tips = new Collection('tips');

// Only safe formats — no Office docs (heavy metadata risk)
const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf'
];
const ALLOWED_EXTS = /\.(jpeg|jpg|png|gif|webp|pdf)$/i;

// In-memory storage so we can scrub metadata before disk write
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype) || !ALLOWED_EXTS.test(file.originalname)) {
      return cb(new Error('Tipo de archivo no permitido'), false);
    }
    cb(null, true);
  }
});

// Strip ALL metadata: EXIF, GPS, camera serial, author, etc.
async function scrubAndSave(file, uploadDir) {
  const id = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(file.originalname).toLowerCase();
  const isImage = file.mimetype.startsWith('image/');
  const isPdf = file.mimetype === 'application/pdf';

  let outputBuffer;
  let outName;

  if (isImage) {
    // sharp drops all EXIF/IPTC/XMP by default; convert all to webp for uniformity
    outputBuffer = await sharp(file.buffer)
      .rotate() // honor EXIF orientation, then drop EXIF
      .webp({ quality: 85 })
      .toBuffer();
    outName = 'tip-' + id + '.webp';
  } else if (isPdf) {
    // Re-create PDF with no author/creator/producer/title/subject metadata
    const src = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
    const dest = await PDFDocument.create();
    const pages = await dest.copyPages(src, src.getPageIndices());
    pages.forEach(p => dest.addPage(p));
    // Explicitly clear all metadata
    dest.setTitle('');
    dest.setAuthor('');
    dest.setSubject('');
    dest.setKeywords([]);
    dest.setProducer('');
    dest.setCreator('');
    dest.setCreationDate(new Date(0));
    dest.setModificationDate(new Date(0));
    outputBuffer = Buffer.from(await dest.save({ useObjectStreams: false }));
    outName = 'tip-' + id + '.pdf';
  } else {
    throw new Error('Tipo no soportado');
  }

  const outPath = path.join(uploadDir, outName);
  await fs.promises.writeFile(outPath, outputBuffer);
  return outName;
}

router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !subject.trim() || !message || !message.trim()) {
      return res.status(400).json({ error: 'Asunto y mensaje son requeridos' });
    }
    if (subject.length > 200) {
      return res.status(400).json({ error: 'Asunto demasiado largo' });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: 'Mensaje demasiado largo' });
    }

    const uploadDir = path.join(__dirname, '..', 'uploads');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        const filename = await scrubAndSave(f, uploadDir);
        // NEVER store originalname — it can leak tipster identity
        attachments.push({ filename, path: '/uploads/' + filename });
      }
    }

    tips.create({
      subject: sanitize(subject.trim(), { allowedTags: [] }),
      message: sanitize(message.trim(), { allowedTags: [] }),
      attachments,
      read: false,
      archived: false
    });

    res.status(201).json({ message: 'Informacion recibida.' });
  } catch (err) {
    // Never log the err object (may contain file content); only generic message
    console.error('[Tips POST] error');
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
    // Also delete attachment files from disk
    const tip = tips.findAll().find(t => t._id === req.params.id);
    if (tip && tip.attachments) {
      for (const a of tip.attachments) {
        const filePath = path.join(__dirname, '..', 'uploads', a.filename);
        fs.promises.unlink(filePath).catch(() => {});
      }
    }
    tips.delete(req.params.id);
    res.json({ message: 'Eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
