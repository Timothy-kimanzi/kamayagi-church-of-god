const M = require('./models');

const types = {
  login: { label: 'Login', plural: 'Logins' },
  logout: { label: 'Logout', plural: 'Logouts' },
  failed: { label: 'Failed login', plural: 'Failed logins' },
  denied: { label: 'Blocked', plural: 'Blocked attempts' },
  change: { label: 'Change', plural: 'Changes' },
  view: { label: 'Page', plural: 'Pages viewed' },
};

function device(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser';
  const os = /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iPhone/iPad'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'Mac'
    : /Linux/.test(ua) ? 'Linux'
    : '';
  return os ? `${browser} on ${os}` : browser;
}

function record(req, type, action, { user, at } = {}) {
  const u = user || req.user || {};
  return M.Activity.create({
    user: u._id || req.session?.userId || undefined,
    userName: u.name || req.session?.userName || undefined,
    email: u.email || req.session?.userEmail || undefined,
    type,
    action: String(action).slice(0, 300),
    path: String(req.originalUrl || '').slice(0, 200),
    ip: req.ip,
    device: device(req.get('user-agent')),
    ...(at ? { createdAt: new Date(at) } : {}),
  }).catch((err) => console.error('Activity log failed:', err.message));
}

module.exports = { types, device, record };
