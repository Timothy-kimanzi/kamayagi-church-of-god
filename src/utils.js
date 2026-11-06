const sharp = require('sharp');
const { Image } = require('./models');

function youtubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/|v\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function isFacebook(url) {
  return /facebook\.com|fb\.watch/i.test(url || '');
}

function facebookEmbed(url) {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=1280`;
}

function videoEmbed(url) {
  const id = youtubeId(url);
  if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
  if (isFacebook(url)) return facebookEmbed(url);
  return null;
}

function mediaUrl(id) {
  return id ? `/media/${id}` : null;
}

function formatDate(d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-KE', { ...opts, timeZone: 'Africa/Nairobi' });
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

function excerpt(text, n = 160) {
  if (!text) return '';
  const s = String(text).replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n).replace(/\s\S*$/, '')}…` : s;
}

function paragraphs(text) {
  return String(text || '')
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function lines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function safeUrl(url) {
  return /^https?:\/\//i.test(url || '') ? url : '';
}

async function saveImage(file) {
  const isLogo = file.fieldname === 'logo';
  const data = await sharp(file.buffer)
    .rotate()
    .resize({ width: isLogo ? 600 : 1800, height: isLogo ? 600 : 1800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const img = await Image.create({ data, contentType: 'image/webp', filename: file.originalname, size: data.length });
  return String(img._id);
}

async function deleteImage(id) {
  if (id && /^[a-f0-9]{24}$/.test(id)) await Image.deleteOne({ _id: id });
}

module.exports = {
  youtubeId,
  isFacebook,
  facebookEmbed,
  videoEmbed,
  mediaUrl,
  formatDate,
  formatTime,
  excerpt,
  paragraphs,
  lines,
  safeUrl,
  saveImage,
  deleteImage,
};
