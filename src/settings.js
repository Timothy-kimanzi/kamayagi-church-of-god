const { Setting } = require('./models');

const ADDRESS = 'Kamayagi Market, Thagicu Sub-County, Mwingi North, Kitui County, Kenya';

const groups = [
  {
    id: 'general',
    label: 'General & Branding',
    fields: [
      { name: 'churchName', label: 'Church name', type: 'text', default: 'Kamayagi Church of God' },
      { name: 'tagline', label: 'Tagline', type: 'text', default: 'A family of faith at Kamayagi Market' },
      { name: 'logo', label: 'Church logo', type: 'image', help: 'Square or wide logo. PNG with transparent background works best.' },
      { name: 'primaryColor', label: 'Main color', type: 'color', default: '#1e3a8a' },
      { name: 'accentColor', label: 'Accent color', type: 'color', default: '#d4a017' },
      { name: 'footerText', label: 'Footer text', type: 'textarea', default: 'Kamayagi Church of God exists to love God, love people and make disciples of Jesus Christ in Thagicu and beyond.' },
    ],
  },
  {
    id: 'home',
    label: 'Home Page',
    fields: [
      { name: 'heroTitle', label: 'Main heading', type: 'text', default: 'Welcome Home to Kamayagi Church of God' },
      { name: 'heroSubtitle', label: 'Sub heading', type: 'textarea', default: 'Come as you are. Worship with us this Sunday and grow in faith, hope and love.' },
      { name: 'heroImage', label: 'Main banner photo', type: 'image', help: 'A wide photo of the church or congregation.' },
      { name: 'welcomeTitle', label: 'Welcome section title', type: 'text', default: 'You belong here' },
      { name: 'welcomeText', label: 'Welcome section text', type: 'textarea', default: 'Whether you are new to faith or have walked with Jesus for years, there is a place for you at Kamayagi Church of God. We are a Bible-believing, Spirit-filled family serving the Kamayagi community and the wider Mwingi North.' },
      { name: 'verseText', label: 'Featured Bible verse', type: 'textarea', default: 'For where two or three gather in my name, there am I with them.' },
      { name: 'verseRef', label: 'Verse reference', type: 'text', default: 'Matthew 18:20' },
    ],
  },
  {
    id: 'about',
    label: 'About Us',
    fields: [
      { name: 'aboutIntro', label: 'Introduction', type: 'textarea', default: 'Kamayagi Church of God is a local congregation located at Kamayagi Market in Thagicu Sub-County, Kitui County. We gather to worship God, study His Word and serve our neighbours.' },
      { name: 'aboutImage', label: 'About page photo', type: 'image' },
      { name: 'history', label: 'Our history', type: 'textarea', default: 'Add the story of how the church started, key milestones and how God has been faithful over the years.' },
      { name: 'mission', label: 'Our mission', type: 'textarea', default: 'To love God, love people and make disciples of Jesus Christ.' },
      { name: 'vision', label: 'Our vision', type: 'textarea', default: 'A transformed community in Thagicu and beyond through the Gospel of Jesus Christ.' },
      { name: 'beliefs', label: 'What we believe', type: 'textarea', help: 'One belief per line.', default: 'The Bible is the inspired Word of God.\nThere is one God, eternally existing as Father, Son and Holy Spirit.\nSalvation is by grace through faith in Jesus Christ.\nThe Holy Spirit empowers believers for holy living and service.\nJesus Christ will return again.' },
    ],
  },
  {
    id: 'pastor',
    label: 'Pastor',
    fields: [
      { name: 'pastorName', label: 'Pastor name', type: 'text', default: 'Pastor Name' },
      { name: 'pastorTitle', label: 'Title', type: 'text', default: 'Senior Pastor' },
      { name: 'pastorPhoto', label: 'Pastor photo', type: 'image' },
      { name: 'pastorMessage', label: "Pastor's welcome message", type: 'textarea', default: 'On behalf of our church family, I warmly welcome you. We would love to worship with you and walk with you in your journey of faith.' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact & Location',
    fields: [
      { name: 'address', label: 'Address', type: 'textarea', default: ADDRESS },
      { name: 'phone', label: 'Phone', type: 'text', default: '+254 700 000 000' },
      { name: 'whatsapp', label: 'WhatsApp number', type: 'text', help: 'International format, e.g. 254700000000', default: '' },
      { name: 'email', label: 'Email', type: 'text', default: 'info@kamayagichurch.org' },
      { name: 'officeHours', label: 'Office hours', type: 'text', default: 'Mon - Fri, 9:00 AM - 4:00 PM' },
      { name: 'prayerIntro', label: 'Prayer request page text', type: 'textarea', default: 'Whatever you are going through, you are not alone. Send us your prayer request and our pastors and prayer team will stand with you in prayer.' },
      { name: 'mapQuery', label: 'Google Maps location', type: 'text', help: 'Place name or coordinates (e.g. -0.6, 38.2) shown on the map.', default: 'Kamayagi, Mwingi North, Kitui County, Kenya' },
    ],
  },
  {
    id: 'giving',
    label: 'Giving / Offering',
    fields: [
      { name: 'givingText', label: 'Giving message', type: 'textarea', default: 'Thank you for supporting the work of God through your tithes and offerings. You can give securely through M-Pesa.' },
      { name: 'givingVerse', label: 'Giving verse', type: 'text', default: 'Each of you should give what you have decided in your heart to give... for God loves a cheerful giver. - 2 Corinthians 9:7' },
      { name: 'mpesaPaybill', label: 'M-Pesa Paybill number', type: 'text', default: '000000' },
      { name: 'mpesaAccount', label: 'Paybill account number', type: 'text', default: 'Your Name / Tithe' },
      { name: 'mpesaTill', label: 'M-Pesa Till number (Buy Goods)', type: 'text', default: '' },
      { name: 'bankDetails', label: 'Bank details (optional)', type: 'textarea', default: '' },
    ],
  },
  {
    id: 'live',
    label: 'Live Streaming',
    fields: [
      { name: 'isLive', label: 'We are LIVE now (show live banner on the website)', type: 'checkbox', default: false },
      { name: 'liveSchedule', label: 'Live stream schedule', type: 'text', default: 'Every Sunday from 9:00 AM (EAT)' },
      { name: 'youtubeLiveUrl', label: 'YouTube live video link', type: 'url', help: 'Paste the link of the current YouTube live stream or video.' },
      { name: 'youtubeChannelId', label: 'YouTube channel ID (optional)', type: 'text', help: 'Starts with "UC". When set and no live link is given, your channel\'s current live stream is shown automatically.' },
      { name: 'facebookLiveUrl', label: 'Facebook live video link', type: 'url', help: 'Paste the link of the Facebook live video.' },
      { name: 'otherLiveUrl', label: 'Other platform link (optional)', type: 'url', help: 'e.g. TikTok Live, Instagram Live, radio stream.' },
      { name: 'otherLiveLabel', label: 'Other platform name', type: 'text', default: 'Watch on other platform' },
    ],
  },
  {
    id: 'social',
    label: 'Social Media',
    fields: [
      { name: 'facebookUrl', label: 'Facebook page', type: 'url' },
      { name: 'youtubeUrl', label: 'YouTube channel', type: 'url' },
      { name: 'instagramUrl', label: 'Instagram', type: 'url' },
      { name: 'tiktokUrl', label: 'TikTok', type: 'url' },
      { name: 'xUrl', label: 'X (Twitter)', type: 'url' },
    ],
  },
];

const allFields = groups.flatMap((g) => g.fields);

async function seedSettings() {
  const existing = new Set((await Setting.find({}, 'key').lean()).map((s) => s.key));
  const missing = allFields.filter((f) => !existing.has(f.name));
  if (missing.length) {
    await Setting.insertMany(missing.map((f) => ({ key: f.name, value: f.default ?? '' })));
  }
}

async function getSettings() {
  const docs = await Setting.find().lean();
  const out = {};
  for (const f of allFields) out[f.name] = f.default ?? '';
  for (const d of docs) out[d.key] = d.value;
  return out;
}

async function setSetting(key, value) {
  await Setting.updateOne({ key }, { $set: { value } }, { upsert: true });
}

module.exports = { groups, allFields, seedSettings, getSettings, setSetting };
