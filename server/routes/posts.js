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

const posts = new Collection('posts');

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf'
];
const ALLOWED_EXTS = /\.(jpeg|jpg|png|gif|webp|pdf)$/i;

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype) || !ALLOWED_EXTS.test(file.originalname)) {
      return cb(new Error('Tipo de archivo no permitido'), false);
    }
    cb(null, true);
  }
});

// Strip ALL metadata from uploads
async function scrubAndSave(file, uploadDir) {
  const id = crypto.randomBytes(16).toString('hex');
  const isImage = file.mimetype.startsWith('image/');
  const isPdf = file.mimetype === 'application/pdf';

  let outputBuffer, outName;

  if (isImage) {
    outputBuffer = await sharp(file.buffer).rotate().webp({ quality: 85 }).toBuffer();
    outName = id + '.webp';
  } else if (isPdf) {
    const src = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
    const dest = await PDFDocument.create();
    const pages = await dest.copyPages(src, src.getPageIndices());
    pages.forEach(p => dest.addPage(p));
    dest.setTitle('');
    dest.setAuthor('');
    dest.setSubject('');
    dest.setKeywords([]);
    dest.setProducer('');
    dest.setCreator('');
    dest.setCreationDate(new Date(0));
    dest.setModificationDate(new Date(0));
    outputBuffer = Buffer.from(await dest.save({ useObjectStreams: false }));
    outName = id + '.pdf';
  } else {
    throw new Error('Tipo no soportado');
  }

  await fs.promises.writeFile(path.join(uploadDir, outName), outputBuffer);
  return outName;
}

router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const p = Number(page);
    const l = Number(limit);
    let filter = { published: true };
    let items = posts.findAll(filter);

    if (category) items = items.filter(i => i.category === category);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(i =>
        (i.title || '').toLowerCase().includes(s) ||
        (i.content || '').toLowerCase().includes(s) ||
        (i.tags || []).some(t => (t || '').toLowerCase().includes(s)) ||
        (i.persons || []).some(pr => (pr?.name || '').toLowerCase().includes(s))
      );
    }

    items.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const total = items.length;
    const paged = items.slice((p - 1) * l, p * l);
    res.json({ posts: paged, total, pages: Math.ceil(total / l), current: p });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
});

router.get('/admin/all', auth, (req, res) => {
  try {
    let items = posts.findAll();
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ posts: items, total: items.length, pages: 1 });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const post = posts.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'No encontrada' });
    posts.update(req.params.id, { views: (post.views || 0) + 1 });
    res.json({ ...post, views: (post.views || 0) + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

router.post('/', auth, upload.array('files', 10), async (req, res) => {
  try {
    const { title, content, summary, category, tags, persons, locations, published, pinned } = req.body;
    const uploadDir = path.join(__dirname, '..', 'uploads');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const images = [];
    const documents = [];

    if (req.files) {
      for (const file of req.files) {
        const filename = await scrubAndSave(file, uploadDir);
        if (filename.endsWith('.webp')) {
          images.push('/uploads/' + filename);
        } else {
          documents.push({ filename, path: '/uploads/' + filename });
        }
      }
    }

    const post = posts.create({
      title: sanitize(title, { allowedTags: [] }),
      content: sanitize(content, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a'],
        allowedAttributes: { a: ['href', 'target', 'rel'] }
      }),
      summary: summary ? sanitize(summary, { allowedTags: [] }) : '',
      category: category || 'general',
      tags: tags ? JSON.parse(tags) : [],
      persons: persons ? JSON.parse(persons) : [],
      locations: locations ? JSON.parse(locations) : [],
      images,
      documents,
      published: published === 'true',
      pinned: pinned === 'true',
      views: 0,
      shares: 0
    });

    res.status(201).json(post);
  } catch (err) {
    console.error('[Posts POST] error');
    res.status(500).json({ error: 'Error al crear publicacion' });
  }
});

router.put('/:id', auth, upload.array('files', 10), async (req, res) => {
  try {
    const post = posts.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'No encontrada' });

    const { title, content, summary, category, tags, persons, locations, published, pinned, existingImages, existingDocs } = req.body;
    const update = {};

    if (title) update.title = sanitize(title, { allowedTags: [] });
    if (content) update.content = sanitize(content, {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a'],
      allowedAttributes: { a: ['href', 'target', 'rel'] }
    });
    if (summary !== undefined) update.summary = sanitize(summary, { allowedTags: [] });
    if (category) update.category = category;
    if (tags) update.tags = JSON.parse(tags);
    if (persons) update.persons = JSON.parse(persons);
    if (locations) update.locations = JSON.parse(locations);
    if (published !== undefined) update.published = published === 'true';
    if (pinned !== undefined) update.pinned = pinned === 'true';

    let imgs = existingImages ? JSON.parse(existingImages) : (post.images || []);
    let docs = existingDocs ? JSON.parse(existingDocs) : (post.documents || []);

    if (req.files) {
      const uploadDir = path.join(__dirname, '..', 'uploads');
      await fs.promises.mkdir(uploadDir, { recursive: true });
      for (const file of req.files) {
        const filename = await scrubAndSave(file, uploadDir);
        if (filename.endsWith('.webp')) imgs.push('/uploads/' + filename);
        else docs.push({ filename, path: '/uploads/' + filename });
      }
    }
    update.images = imgs;
    update.documents = docs;

    const updated = posts.update(req.params.id, update);
    res.json(updated);
  } catch (err) {
    console.error('[Posts PUT] error');
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

router.delete('/:id', auth, (req, res) => {
  try {
    posts.delete(req.params.id);
    res.json({ message: 'Eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
