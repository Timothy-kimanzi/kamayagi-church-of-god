const bcrypt = require('bcryptjs');
const M = require('./models');
const { seedSettings } = require('./settings');

async function seedAdmin() {
  if (await M.User.countDocuments()) return;
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin account.');
    }
    email = 'admin@example.com';
    password = 'admin123';
    console.log(`Created development admin: ${email} / ${password}`);
  }
  await M.User.create({ name: 'Administrator', email, passwordHash: await bcrypt.hash(password, 12) });
}

async function migrateMessages() {
  await M.Message.updateMany({ kind: { $exists: false }, subject: /prayer/i }, { kind: 'prayer' });
}

async function seedContent() {
  const flag = await M.Setting.findOne({ key: '_contentSeeded' });
  if (flag) return;
  await M.ServiceTime.insertMany([
    { name: 'Sunday Worship Service', day: 'Sunday', startTime: '09:00', endTime: '12:30', description: 'Praise, worship and the preaching of the Word.', order: 1 },
    { name: 'Sunday School', day: 'Sunday', startTime: '09:00', endTime: '11:00', description: 'Bible lessons for children.', order: 2 },
    { name: 'Midweek Bible Study', day: 'Wednesday', startTime: '17:00', endTime: '18:30', description: 'Digging deeper into the Scriptures together.', order: 3 },
    { name: 'Prayer Meeting', day: 'Friday', startTime: '17:00', endTime: '18:30', description: 'Come and seek the Lord with us.', order: 4 },
  ]);
  await M.Ministry.insertMany([
    { name: 'Youth Ministry', meetingTime: 'Saturdays, 2:00 PM', description: 'Raising young people who love Jesus and serve their generation.', order: 1 },
    { name: "Women's Ministry", meetingTime: 'Second Saturday of the month', description: 'Women growing together in faith, prayer and fellowship.', order: 2 },
    { name: "Men's Ministry", meetingTime: 'Last Saturday of the month', description: 'Building godly men, husbands and fathers.', order: 3 },
    { name: "Children's Ministry", meetingTime: 'Sundays, 9:00 AM', description: 'Teaching children the love of God through Bible stories, songs and fun.', order: 4 },
    { name: 'Praise & Worship Team', meetingTime: 'Thursdays, 5:00 PM', description: 'Leading the church into the presence of God through music.', order: 5 },
  ]);
  const inTwoWeeks = new Date(Date.now() + 14 * 864e5);
  await M.Event.create({
    title: 'Sample Event: Thanksgiving Sunday',
    startDate: inTwoWeeks,
    time: '9:00 AM',
    location: 'Kamayagi Church of God',
    description: 'This is a sample event. Edit or delete it from the admin panel and add your own church events.',
  });
  await M.Testimony.create({
    name: 'Sample Member',
    title: 'God is faithful',
    story: 'This is a sample testimony. Church members can share their stories from the Testimonies page, and the admin approves them before they appear on the website.',
    approved: true,
    featured: true,
  });
  await M.Setting.create({ key: '_contentSeeded', value: true });
}

async function seed() {
  await seedSettings();
  await seedAdmin();
  await seedContent();
  await migrateMessages();
}

module.exports = seed;
