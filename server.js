require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const compression = require('compression');
const M = require('./src/models');
const seed = require('./src/seed');
const { getSettings } = require('./src/settings');
const { csrfToken } = require('./src/security');
const utils = require('./src/utils');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kamayagi';
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https://i.ytimg.com'],
        'frame-src': [
          'https://www.youtube.com',
          'https://www.youtube-nocookie.com',
          'https://www.facebook.com',
          'https://web.facebook.com',
          'https://www.google.com',
          'https://maps.google.com',
        ],
        'media-src': ["'self'", 'https:'],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);
app.use(compression());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProd ? '7d' : 0 }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));

app.use(
  session({
    name: 'kcog.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI, ttl: 7 * 24 * 3600 }),
    cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 7 * 24 * 3600 * 1000 },
  })
);

app.get('/media/:id', async (req, res, next) => {
  if (!/^[a-f0-9]{24}$/.test(req.params.id)) return next();
  const img = await M.Image.findById(req.params.id).lean();
  if (!img) return next();
  res.set('Content-Type', img.contentType);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(img.data.buffer ? Buffer.from(img.data.buffer) : img.data);
});

app.use(async (req, res, next) => {
  res.locals.s = await getSettings();
  res.locals.u = utils;
  res.locals.path = req.path;
  res.locals.isAdmin = Boolean(req.session.userId);
  res.locals.flash = req.session.flash;
  res.locals.layout = 'public';
  delete req.session.flash;
  next();
});
app.use((req, res, next) => {
  if (req.method === 'POST' || req.path.startsWith('/admin')) {
    req.session.touch();
    return csrfToken(req, res, next);
  }
  if (req.session.csrf) res.locals.csrf = req.session.csrf;
  else if (/^\/(contact|testimonies|prayer)/.test(req.path)) return csrfToken(req, res, next);
  next();
});

app.get('/healthz', (req, res) => res.send('ok'));
app.use('/admin', require('./src/routes/admin'));
app.use('/', require('./src/routes/public'));

app.use((req, res) => res.status(404).render('public/404', { title: 'Page not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).render('public/404', { title: 'Something went wrong', error: true });
});

mongoose
  .connect(MONGODB_URI)
  .then(seed)
  .then(() => app.listen(PORT, () => console.log(`Kamayagi Church of God site running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
