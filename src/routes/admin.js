const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const M = require('../models');
const resources = require('../resources');
const settings = require('../settings');
const { verifyCsrf, requireAdmin, flash } = require('../security');
const { saveImage, deleteImage, safeUrl } = require('../utils');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const isId = (id) => /^[a-f0-9]{24}$/.test(id);

router.use((req, res, next) => {
  res.locals.layout = 'admin';
  if (req.method === 'POST' && req.is('multipart/form-data')) return upload.any()(req, res, next);
  next();
});
router.use((req, res, next) => (req.method === 'POST' ? verifyCsrf(req, res, next) : next()));

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Login', next: req.query.next || '/admin' });
});

router.post('/login', loginLimiter, async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const user = await M.User.findOne({ email });
  const ok = user && (await bcrypt.compare(String(req.body.password || ''), user.passwordHash));
  if (!ok) {
    flash(req, 'error', 'Wrong email or password.');
    return res.redirect('/admin/login');
  }
  const nextUrl = /^\/admin(\/|$)/.test(req.body.next || '') ? req.body.next : '/admin';
  req.session.regenerate((err) => {
    if (err) throw err;
    req.session.userId = String(user._id);
    req.session.userName = user.name || user.email;
    res.redirect(nextUrl);
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.use(requireAdmin);

router.use(async (req, res, next) => {
  const [unread, pending] = await Promise.all([
    M.Message.countDocuments({ read: false }),
    M.Testimony.countDocuments({ approved: false }),
  ]);
  res.locals.badges = { messages: unread, testimonies: pending };
  res.locals.resources = resources;
  res.locals.settingGroups = settings.groups;
  res.locals.userName = req.session.userName;
  next();
});

router.get('/', async (req, res) => {
  const counts = {};
  await Promise.all(Object.entries(resources).map(async ([k, r]) => (counts[k] = await r.model.countDocuments())));
  const messages = await M.Message.find().sort({ createdAt: -1 }).limit(5).lean();
  res.render('admin/dashboard', { title: 'Dashboard', counts, messages, section: 'dashboard' });
});

async function applyFields(fields, body, files, doc) {
  const fileMap = Object.fromEntries((files || []).map((f) => [f.fieldname, f]));
  for (const f of fields) {
    const v = body[f.name];
    switch (f.type) {
      case 'image':
        if (fileMap[f.name]) {
          await deleteImage(doc[f.name]);
          doc[f.name] = await saveImage(fileMap[f.name]);
        } else if (body[`${f.name}_remove`]) {
          await deleteImage(doc[f.name]);
          doc[f.name] = '';
        }
        break;
      case 'checkbox':
        doc[f.name] = v === 'on' || v === 'true';
        break;
      case 'number':
        doc[f.name] = Number(v) || 0;
        break;
      case 'date':
        doc[f.name] = v ? new Date(`${v}T00:00:00+03:00`) : null;
        break;
      case 'url':
        doc[f.name] = safeUrl(String(v || '').trim());
        break;
      case 'color':
        doc[f.name] = /^#[0-9a-f]{6}$/i.test(v || '') ? v : f.default;
        break;
      default:
        doc[f.name] = String(v ?? '').trim();
    }
  }
  return doc;
}

function missingRequired(fields, doc) {
  return fields.filter((f) => f.required && !doc[f.name]).map((f) => f.label);
}

// Settings
router.get('/settings', (req, res) => res.redirect(`/admin/settings/${settings.groups[0].id}`));

router.get('/settings/:group', async (req, res, next) => {
  const group = settings.groups.find((g) => g.id === req.params.group);
  if (!group) return next();
  res.render('admin/settings', { title: group.label, group, values: await settings.getSettings(), section: `settings-${group.id}` });
});

router.post('/settings/:group', async (req, res, next) => {
  const group = settings.groups.find((g) => g.id === req.params.group);
  if (!group) return next();
  const current = await settings.getSettings();
  const updated = await applyFields(group.fields, req.body, req.files, { ...current });
  await Promise.all(group.fields.map((f) => settings.setSetting(f.name, updated[f.name])));
  flash(req, 'success', `${group.label} saved.`);
  res.redirect(`/admin/settings/${group.id}`);
});

// Generic content resources
router.param('resource', (req, res, next, key) => {
  if (!Object.hasOwn(resources, key)) return res.status(404).render('public/404', { layout: 'admin', title: 'Not found' });
  req.resource = resources[key];
  res.locals.resourceKey = key;
  res.locals.section = key;
  next();
});

router.get('/r/:resource', async (req, res) => {
  const items = await req.resource.model.find().sort(req.resource.sort).lean();
  res.render('admin/list', { title: req.resource.label, r: req.resource, items });
});

router.get('/r/:resource/new', (req, res) => {
  const item = Object.fromEntries(req.resource.fields.map((f) => [f.name, f.default ?? '']));
  res.render('admin/form', { title: `Add ${req.resource.singular}`, r: req.resource, item, action: `/admin/r/${res.locals.resourceKey}` });
});

router.post('/r/:resource', async (req, res) => {
  const doc = await applyFields(req.resource.fields, req.body, req.files, {});
  const missing = missingRequired(req.resource.fields, doc);
  if (missing.length) {
    await Promise.all(req.resource.fields.filter((f) => f.type === 'image').map((f) => deleteImage(doc[f.name])));
    flash(req, 'error', `Please fill in: ${missing.join(', ')}`);
    return res.redirect(`/admin/r/${res.locals.resourceKey}/new`);
  }
  await req.resource.model.create(doc);
  flash(req, 'success', `${req.resource.singular} added.`);
  res.redirect(`/admin/r/${res.locals.resourceKey}`);
});

router.get('/r/:resource/:id/edit', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  const item = await req.resource.model.findById(req.params.id).lean();
  if (!item) return next();
  res.render('admin/form', {
    title: `Edit ${req.resource.singular}`,
    r: req.resource,
    item,
    action: `/admin/r/${res.locals.resourceKey}/${item._id}`,
  });
});

router.post('/r/:resource/:id', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  const doc = await req.resource.model.findById(req.params.id);
  if (!doc) return next();
  const plain = doc.toObject();
  await applyFields(req.resource.fields, req.body, req.files, plain);
  const missing = missingRequired(req.resource.fields, plain);
  if (missing.length) {
    flash(req, 'error', `Please fill in: ${missing.join(', ')}`);
    return res.redirect(`/admin/r/${res.locals.resourceKey}/${doc._id}/edit`);
  }
  for (const f of req.resource.fields) doc[f.name] = plain[f.name];
  await doc.save();
  flash(req, 'success', `${req.resource.singular} saved.`);
  res.redirect(`/admin/r/${res.locals.resourceKey}`);
});

router.post('/r/:resource/:id/toggle/:field', async (req, res, next) => {
  const field = req.resource.fields.find((f) => f.name === req.params.field && f.type === 'checkbox');
  if (!field || !isId(req.params.id)) return next();
  const doc = await req.resource.model.findById(req.params.id);
  if (!doc) return next();
  doc[field.name] = !doc[field.name];
  await doc.save();
  res.redirect(`/admin/r/${res.locals.resourceKey}`);
});

router.post('/r/:resource/:id/delete', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  const doc = await req.resource.model.findById(req.params.id).lean();
  if (!doc) return next();
  await Promise.all(req.resource.fields.filter((f) => f.type === 'image').map((f) => deleteImage(doc[f.name])));
  await req.resource.model.deleteOne({ _id: doc._id });
  flash(req, 'success', `${req.resource.singular} deleted.`);
  res.redirect(`/admin/r/${res.locals.resourceKey}`);
});

// Messages
router.get('/messages', async (req, res) => {
  const messages = await M.Message.find().sort({ createdAt: -1 }).lean();
  res.render('admin/messages', { title: 'Messages', messages, section: 'messages' });
});

router.get('/messages/:id', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  const message = await M.Message.findByIdAndUpdate(req.params.id, { read: true }, { new: true }).lean();
  if (!message) return next();
  res.render('admin/message', { title: 'Message', message, section: 'messages' });
});

router.post('/messages/:id/delete', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  await M.Message.deleteOne({ _id: req.params.id });
  flash(req, 'success', 'Message deleted.');
  res.redirect('/admin/messages');
});

// Admin accounts
router.get('/admins', async (req, res) => {
  const users = await M.User.find().sort({ createdAt: 1 }).lean();
  res.render('admin/admins', { title: 'Admin Accounts', users, me: req.session.userId, section: 'admins' });
});

router.post('/admins', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  if (!email || password.length < 8) {
    flash(req, 'error', 'Enter an email and a password of at least 8 characters.');
    return res.redirect('/admin/admins');
  }
  if (await M.User.exists({ email })) {
    flash(req, 'error', 'An admin with that email already exists.');
    return res.redirect('/admin/admins');
  }
  await M.User.create({ name: String(req.body.name || '').trim(), email, passwordHash: await bcrypt.hash(password, 12) });
  flash(req, 'success', 'Admin account created.');
  res.redirect('/admin/admins');
});

router.post('/admins/:id/delete', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  if (req.params.id === req.session.userId) {
    flash(req, 'error', 'You cannot delete your own account.');
    return res.redirect('/admin/admins');
  }
  await M.User.deleteOne({ _id: req.params.id });
  flash(req, 'success', 'Admin account removed.');
  res.redirect('/admin/admins');
});

router.post('/account/password', async (req, res) => {
  const user = await M.User.findById(req.session.userId);
  const { current, password, confirm } = req.body;
  if (!user || !(await bcrypt.compare(String(current || ''), user.passwordHash))) {
    flash(req, 'error', 'Current password is wrong.');
  } else if (String(password || '').length < 8 || password !== confirm) {
    flash(req, 'error', 'New passwords must match and be at least 8 characters.');
  } else {
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    flash(req, 'success', 'Password changed.');
  }
  res.redirect('/admin/admins');
});

module.exports = router;
