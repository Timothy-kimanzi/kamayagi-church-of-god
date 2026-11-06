const express = require('express');
const rateLimit = require('express-rate-limit');
const M = require('../models');
const { verifyCsrf, flash } = require('../security');

const router = express.Router();
const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

const upcoming = () => ({ published: true, $or: [{ startDate: { $gte: startOfToday() } }, { endDate: { $gte: startOfToday() } }] });
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
const isId = (id) => /^[a-f0-9]{24}$/.test(id);

router.get('/', async (req, res) => {
  const [services, events, sermons, testimonies, ministries, photos] = await Promise.all([
    M.ServiceTime.find().sort({ order: 1, createdAt: 1 }).limit(4).lean(),
    M.Event.find(upcoming()).sort({ startDate: 1 }).limit(3).lean(),
    M.Sermon.find({ published: true }).sort({ date: -1 }).limit(3).lean(),
    M.Testimony.find({ approved: true }).sort({ featured: -1, createdAt: -1 }).limit(3).lean(),
    M.Ministry.find().sort({ order: 1 }).limit(6).lean(),
    M.Photo.find().sort({ order: 1, createdAt: -1 }).limit(6).lean(),
  ]);
  res.render('public/home', { page: 'home', services, events, sermons, testimonies, ministries, photos });
});

router.get('/about', async (req, res) => {
  const leaders = await M.Leader.find().sort({ order: 1, createdAt: 1 }).lean();
  res.render('public/about', { page: 'about', title: 'About Us', leaders });
});

router.get('/services', async (req, res) => {
  const services = await M.ServiceTime.find().sort({ order: 1, createdAt: 1 }).lean();
  res.render('public/services', { page: 'services', title: 'Service Times', services });
});

router.get('/sermons', async (req, res) => {
  const sermons = await M.Sermon.find({ published: true }).sort({ date: -1 }).lean();
  res.render('public/sermons', { page: 'sermons', title: 'Sermons', sermons });
});

router.get('/sermons/:id', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  const sermon = await M.Sermon.findOne({ _id: req.params.id, published: true }).lean();
  if (!sermon) return next();
  res.render('public/sermon', { page: 'sermons', title: sermon.title, sermon });
});

router.get('/events', async (req, res) => {
  const [events, past] = await Promise.all([
    M.Event.find(upcoming()).sort({ startDate: 1 }).lean(),
    M.Event.find({ published: true, startDate: { $lt: startOfToday() }, $or: [{ endDate: null }, { endDate: { $lt: startOfToday() } }] })
      .sort({ startDate: -1 })
      .limit(6)
      .lean(),
  ]);
  res.render('public/events', { page: 'events', title: 'Events', events, past });
});

router.get('/events/:id', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  const event = await M.Event.findOne({ _id: req.params.id, published: true }).lean();
  if (!event) return next();
  res.render('public/event', { page: 'events', title: event.title, event });
});

router.get('/ministries', async (req, res) => {
  const ministries = await M.Ministry.find().sort({ order: 1, createdAt: 1 }).lean();
  res.render('public/ministries', { page: 'ministries', title: 'Ministries', ministries });
});

router.get('/testimonies', async (req, res) => {
  const testimonies = await M.Testimony.find({ approved: true }).sort({ featured: -1, createdAt: -1 }).lean();
  res.render('public/testimonies', { page: 'testimonies', title: 'Testimonies', testimonies });
});

router.post('/testimonies', formLimiter, verifyCsrf, async (req, res) => {
  const { name, title, story, website } = req.body;
  if (website) return res.redirect('/testimonies');
  if (!name?.trim() || !story?.trim()) {
    flash(req, 'error', 'Please enter your name and your story.');
    return res.redirect('/testimonies#share');
  }
  await M.Testimony.create({ name: name.slice(0, 100), title: (title || '').slice(0, 150), story: story.slice(0, 5000), approved: false });
  flash(req, 'success', 'Thank you for sharing! Your testimony will appear after it is reviewed.');
  res.redirect('/testimonies#share');
});

router.get('/gallery', async (req, res) => {
  const photos = await M.Photo.find().sort({ order: 1, createdAt: -1 }).lean();
  const albums = [...new Set(photos.map((p) => p.album).filter(Boolean))];
  res.render('public/gallery', { page: 'gallery', title: 'Gallery', photos, albums });
});

router.get('/live', (req, res) => res.render('public/live', { page: 'live', title: 'Watch Live' }));
router.get('/give', (req, res) => res.render('public/give', { page: 'give', title: 'Give' }));
router.get('/contact', (req, res) => res.render('public/contact', { page: 'contact', title: 'Contact Us' }));

router.post('/contact', formLimiter, verifyCsrf, async (req, res) => {
  const { name, email, phone, subject, message, website } = req.body;
  if (website) return res.redirect('/contact');
  if (!name?.trim() || !message?.trim()) {
    flash(req, 'error', 'Please enter your name and message.');
    return res.redirect('/contact#form');
  }
  await M.Message.create({
    name: name.slice(0, 100),
    email: (email || '').slice(0, 150),
    phone: (phone || '').slice(0, 30),
    subject: (subject || 'General').slice(0, 100),
    message: message.slice(0, 5000),
  });
  flash(req, 'success', 'Thank you! Your message has been received. We will get back to you soon.');
  res.redirect('/contact#form');
});

module.exports = router;
