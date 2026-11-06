const resources = require('./resources');
const settings = require('./settings');

const areas = [
  {
    title: 'Website content',
    items: Object.entries(resources).map(([key, r]) => ({ key, label: r.label })),
  },
  {
    title: 'Inbox (private)',
    items: [
      { key: 'prayers', label: 'Prayer Requests' },
      { key: 'messages', label: 'Messages' },
    ],
  },
  {
    title: 'Settings',
    items: settings.groups.map((g) => ({ key: `settings-${g.id}`, label: g.label })),
  },
];

const allKeys = areas.flatMap((a) => a.items.map((i) => i.key));
const labels = Object.fromEntries(areas.flatMap((a) => a.items.map((i) => [i.key, i.label])));

const can = (user, key) => Boolean(user && (user.isSuper || (user.permissions || []).includes(key)));
const clean = (input) => [].concat(input || []).filter((k) => allKeys.includes(k));

module.exports = { areas, allKeys, labels, can, clean };
