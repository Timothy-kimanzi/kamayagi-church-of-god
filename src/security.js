const crypto = require('crypto');

function csrfToken(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrf = req.session.csrf;
  next();
}

function verifyCsrf(req, res, next) {
  const token = (req.body && req.body._csrf) || req.get('x-csrf-token');
  if (token && req.session.csrf && token === req.session.csrf) return next();
  res.status(403).send('Your session expired. Please go back, refresh the page and try again.');
}

function requireAdmin(req, res, next) {
  if (req.session.userId) return next();
  res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
}

function flash(req, type, message) {
  req.session.flash = { type, message };
}

module.exports = { csrfToken, verifyCsrf, requireAdmin, flash };
