const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const M = require('../models');
const resources = require('../resources');
const settings = require('../settings');
const perms = require('../permissions');
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
  res.set('Cache-Control', 'no-store');
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

router.post('/leave', (req, res) => {
  if (req.session.userId) req.session.leftAt = Date.now();
  res.status(204).end();
});

router.use(requireAdmin);

router.use(async (req, res, next) => {
  const user = isId(req.session.userId || '') ? await M.User.findById(req.session.userId).lean() : null;
  if (!user) return req.session.destroy(() => res.redirect('/admin/login'));
  req.user = user;
  const can = (key) => perms.can(user, key);
  const count = (key, model, filter) => (can(key) ? model.countDocuments(filter) : 0);
  const [unread, prayers, pending] = await Promise.all([
    count('messages', M.Message, { kind: { $ne: 'prayer' }, read: false }),
    count('prayers', M.Message, { kind: 'prayer', read: false }),
    count('testimonies', M.Testimony, { approved: false }),
  ]);
  res.locals.badges = { messages: unread, prayers, testimonies: pending };
  res.locals.can = can;
  res.locals.isSuper = Boolean(user.isSuper);
  res.locals.resources = Object.fromEntries(Object.entries(resources).filter(([k]) => can(k)));
  res.locals.settingGroups = settings.groups.filter((g) => can(`settings-${g.id}`));
  res.locals.userName = user.name || user.email;
  next();
});

function deny(req, res) {
  flash(req, 'error', 'You do not have permission to open that page. Ask the super admin for access.');
  res.redirect('/admin');
}
const need = (key) => (req, res, next) => (perms.can(req.user, key) ? next() : deny(req, res));
const superOnly = (req, res, next) => (req.user.isSuper ? next() : deny(req, res));

router.get('/', async (req, res) => {
  const counts = {};
  await Promise.all(Object.entries(res.locals.resources).map(async ([k, r]) => (counts[k] = await r.model.countDocuments())));
  const recent = (key, filter) => (perms.can(req.user, key) ? M.Message.find(filter).sort({ createdAt: -1 }).limit(5).lean() : null);
  const [messages, prayers] = await Promise.all([recent('messages', { kind: { $ne: 'prayer' } }), recent('prayers', { kind: 'prayer' })]);
  res.render('admin/dashboard', { title: 'Dashboard', counts, messages, prayers, section: 'dashboard' });
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
router.get('/settings', (req, res) => {
  const first = res.locals.settingGroups[0];
  return first ? res.redirect(`/admin/settings/${first.id}`) : deny(req, res);
});

router.use('/settings/:group', (req, res, next) => need(`settings-${req.params.group}`)(req, res, next));

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
  if (!perms.can(req.user, key)) return deny(req, res);
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

// Messages and prayer requests
const inboxes = {
  messages: { filter: { kind: { $ne: 'prayer' } }, title: 'Messages', singular: 'Message', prayer: false },
  prayers: { filter: { kind: 'prayer' }, title: 'Prayer Requests', singular: 'Prayer request', prayer: true },
};

Object.entries(inboxes).forEach(([key, box]) => {
  const base = `/admin/${key}`;
  const find = (id) => M.Message.findOne({ _id: id, ...box.filter });
  router.use(`/${key}`, need(key));

  router.get(`/${key}`, async (req, res) => {
    const messages = await M.Message.find(box.filter).sort({ createdAt: -1 }).lean();
    res.render('admin/messages', { title: box.title, box, base, messages, section: key });
  });

  router.get(`/${key}/:id`, async (req, res, next) => {
    if (!isId(req.params.id)) return next();
    const message = await find(req.params.id);
    if (!message) return next();
    if (!message.read) await M.Message.updateOne({ _id: message._id }, { read: true });
    res.render('admin/message', { title: box.singular, box, base, message: message.toObject(), section: key });
  });

  router.post(`/${key}/:id/prayed`, async (req, res, next) => {
    if (!isId(req.params.id)) return next();
    const message = await find(req.params.id);
    if (!message) return next();
    await M.Message.updateOne({ _id: message._id }, { prayed: !message.prayed });
    res.redirect(req.body.back === 'list' ? base : `${base}/${message._id}`);
  });

  router.post(`/${key}/:id/delete`, async (req, res, next) => {
    if (!isId(req.params.id)) return next();
    await M.Message.deleteOne({ _id: req.params.id, ...box.filter });
    flash(req, 'success', `${box.singular} deleted.`);
    res.redirect(base);
  });
});

// Admin accounts (only the super admin can manage other admins)
router.get('/admins', async (req, res) => {
  const users = req.user.isSuper ? await M.User.find().sort({ createdAt: 1 }).lean() : [];
  res.render('admin/admins', { title: 'Admin Accounts', users, me: String(req.user._id), perms, section: 'admins' });
});

router.post('/admins', superOnly, async (req, res) => {
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
  await M.User.create({
    name: String(req.body.name || '').trim(),
    email,
    isSuper: req.body.isSuper === 'on',
    permissions: perms.clean(req.body.permissions),
    passwordHash: await bcrypt.hash(password, 12),
  });
  flash(req, 'success', 'Admin account created.');
  res.redirect('/admin/admins');
});

router.get('/admins/:id', superOnly, async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  const account = await M.User.findById(req.params.id).lean();
  if (!account) return next();
  res.render('admin/admin-edit', { title: 'Edit Admin', account, me: String(req.user._id), perms, section: 'admins' });
});

router.post('/admins/:id', superOnly, async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  const account = await M.User.findById(req.params.id);
  if (!account) return next();
  const isMe = String(account._id) === String(req.user._id);
  const password = String(req.body.password || '');
  if (password && password.length < 8) {
    flash(req, 'error', 'The new password must be at least 8 characters.');
    return res.redirect(`/admin/admins/${account._id}`);
  }
  account.name = String(req.body.name || '').trim();
  if (!isMe) account.isSuper = req.body.isSuper === 'on';
  account.permissions = perms.clean(req.body.permissions);
  if (password) account.passwordHash = await bcrypt.hash(password, 12);
  await account.save();
  flash(req, 'success', 'Admin account saved.');
  res.redirect('/admin/admins');
});

router.post('/admins/:id/delete', superOnly, async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  if (req.params.id === String(req.user._id)) {
    flash(req, 'error', 'You cannot delete your own account.');
    return res.redirect('/admin/admins');
  }
  await M.User.deleteOne({ _id: req.params.id });
  flash(req, 'success', 'Admin account removed.');
  res.redirect('/admin/admins');
});

router.post('/account/password', async (req, res) => {
  const user = await M.User.findById(req.user._id);
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
