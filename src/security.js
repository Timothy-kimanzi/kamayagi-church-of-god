const crypto = require('crypto');
const activity = require('./activity');

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

const RELOAD_GRACE_MS = 4000;

function requireAdmin(req, res, next) {
  const { leftAt } = req.session;
  if (leftAt) {
    delete req.session.leftAt;
    if (Date.now() - leftAt > RELOAD_GRACE_MS) {
      activity.record(req, 'logout', 'Logged out automatically (left the admin panel)', { at: leftAt });
      delete req.session.userId;
      delete req.session.userName;
      delete req.session.userEmail;
    }
  }
  if (req.session.userId) return next();
  res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
}

function flash(req, type, message) {
  req.session.flash = { type, message };
}

module.exports = { csrfToken, verifyCsrf, requireAdmin, flash };
