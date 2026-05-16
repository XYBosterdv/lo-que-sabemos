require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Collection } = require('./db');

const app = express();

// Trust the Railway proxy so rate-limit & req.ip work correctly
app.set('trust proxy', 1);

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
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    }
  } : false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: { camera: ["()"], microphone: ["()"], geolocation: ["()"] }
  }
}));

// Hide tech stack
app.disable('x-powered-by');

// CORS — in production same-origin is allowed automatically
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    // No origin = same-origin request (production) or server-to-server
    if (!origin) return cb(null, true);
    // Check against allowed list
    if (allowedOrigins.some(o => origin === o.trim())) return cb(null, true);
    // In production, also allow the Railway auto-generated domain
    if (process.env.RAILWAY_PUBLIC_DOMAIN && origin === `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`) {
      return cb(null, true);
    }
    // Allow custom domain
    if (process.env.CUSTOM_DOMAIN && origin === `https://${process.env.CUSTOM_DOMAIN}`) {
      return cb(null, true);
    }
    cb(new Error('CORS no permitido'));
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

// Rate limiting - auth (anti-brute-force) — only 5 attempts per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de login. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
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

// Health check (no info disclosure)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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
