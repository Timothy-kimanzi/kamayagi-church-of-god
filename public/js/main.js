(() => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  document.querySelectorAll('.chip[data-album]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
      const album = chip.dataset.album;
      document.querySelectorAll('.gallery-grid figure').forEach((f) => {
        f.hidden = album && f.dataset.album !== album;
      });
    });
  });

  const lb = document.querySelector('.lightbox');
  if (lb) {
    const close = () => (lb.hidden = true);
    document.querySelectorAll('.lightbox-link').forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        lb.querySelector('img').src = a.href;
        lb.querySelector('p').textContent = a.dataset.caption || '';
        lb.hidden = false;
      })
    );
    lb.addEventListener('click', (e) => e.target.tagName !== 'IMG' && close());
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  }

  document.querySelectorAll('[data-copy]').forEach((el) =>
    el.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(el.dataset.copy);
        el.classList.add('copied');
        setTimeout(() => el.classList.remove('copied'), 2000);
      } catch (_) {}
    })
  );
})();
