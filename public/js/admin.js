(() => {
  document.querySelector('.sb-toggle')?.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
  document.querySelectorAll('form.confirm').forEach((f) =>
    f.addEventListener('submit', (e) => {
      if (!confirm('Are you sure? This cannot be undone.')) e.preventDefault();
    })
  );
  document.querySelectorAll('.image-field input[type=file]').forEach((input) =>
    input.addEventListener('change', () => {
      const img = input.parentElement.querySelector('.preview');
      if (input.files[0]) {
        img.src = URL.createObjectURL(input.files[0]);
        img.hidden = false;
      }
    })
  );
})();

// Require a fresh login whenever an admin leaves the admin panel (new tab, closed tab, other website).
(() => {
  const TAB_KEY = 'kcogAdminTab';
  document.getElementById('login-form')?.addEventListener('submit', () => sessionStorage.setItem(TAB_KEY, '1'));
  if (!document.querySelector('.sidebar')) return;

  const csrf = document.querySelector('meta[name=csrf]')?.content || '';
  const post = () => {
    const body = new FormData();
    body.append('_csrf', csrf);
    return body;
  };
  const toLogin = () => location.replace(`/admin/login?next=${encodeURIComponent(location.pathname)}`);

  if (!sessionStorage.getItem(TAB_KEY)) {
    fetch('/admin/logout', { method: 'POST', body: post(), credentials: 'same-origin' }).finally(toLogin);
    return;
  }

  let internal = false;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin === location.origin && url.pathname.startsWith('/admin')) internal = true;
  });
  document.addEventListener('submit', (e) => {
    if (!e.defaultPrevented) internal = true;
  });
  window.addEventListener('pagehide', () => {
    if (internal) return;
    navigator.sendBeacon('/admin/leave', post());
  });
  window.addEventListener('pageshow', (e) => {
    internal = false;
    if (e.persisted) location.reload();
  });
})();
