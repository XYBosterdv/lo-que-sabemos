require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Collection } = require('./db');

const app = express();
const admins = new Collection('admins');
const posts = new Collection('posts');
const tips = new Collection('tips');

// Validate required env vars in production
if (process.env.NODE_ENV === 'production') {
  const required = ['JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('Variables de entorno requeridas:', missing.join(', '));
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET debe tener al menos 32 caracteres');
    process.exit(1);
  }
}

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// CORS
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS no permitido'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - general
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes, intenta mas tarde' }
});
app.use('/api/', apiLimiter);

// Rate limiting - stricter for tips (anti-spam)
const tipsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Limite de envios alcanzado. Intenta en una hora.' }
});
app.use('/api/tips', tipsLimiter);

// Rate limiting - auth (anti-brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Intenta en 15 minutos.' }
});
app.use('/api/auth/login', authLimiter);

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Seed admin on first run
const existingAdmins = admins.findAll();
if (existingAdmins.length === 0) {
  const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin123!', 12);
  admins.create({
    email: (process.env.ADMIN_EMAIL || 'admin@investigacionpublica.com').toLowerCase(),
    password: hashed
  });
  console.log('Admin creado:', process.env.ADMIN_EMAIL);
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/tips', require('./routes/tips'));

// Public stats (for hero banner)
app.get('/api/stats', (req, res) => {
  try {
    const allPosts = posts.findAll();
    const publishedPosts = allPosts.filter(p => p.published);
    const totalViews = allPosts.reduce((sum, p) => sum + (p.views || 0), 0);
    res.json({ posts: allPosts.length, published: publishedPosts.length, views: totalViews });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadisticas' });
  }
});

// Admin stats (with tip count)
app.get('/api/stats/admin', require('./middleware/auth'), (req, res) => {
  try {
    const allPosts = posts.findAll();
    const publishedPosts = allPosts.filter(p => p.published);
    const totalViews = allPosts.reduce((sum, p) => sum + (p.views || 0), 0);
    const unreadTips = tips.findAll().filter(t => !t.read).length;
    res.json({
      totalPosts: allPosts.length,
      publishedPosts: publishedPosts.length,
      totalViews,
      unreadTips
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadisticas' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(clientBuild));
  // All non-API routes -> React SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  if (err.message === 'CORS no permitido') {
    return res.status(403).json({ error: 'Origen no permitido' });
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Graceful startup
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Puerto ${PORT} en uso. Usa otro puerto o cierra el proceso existente.`);
    process.exit(1);
  }
  throw err;
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Cerrando servidor...');
  server.close(() => process.exit(0));
});
