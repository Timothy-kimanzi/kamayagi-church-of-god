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
