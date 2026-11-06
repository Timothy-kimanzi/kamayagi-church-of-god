const mongoose = require('mongoose');
const { Schema } = mongoose;

const ImageSchema = new Schema(
  { data: Buffer, contentType: String, filename: String, size: Number },
  { timestamps: true }
);

const SettingSchema = new Schema({ key: { type: String, unique: true }, value: Schema.Types.Mixed });

const UserSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    passwordHash: String,
    isSuper: { type: Boolean, default: false },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

const opts = { timestamps: true };

const ServiceTime = new Schema(
  { name: String, day: String, startTime: String, endTime: String, description: String, order: { type: Number, default: 0 } },
  opts
);

const Sermon = new Schema(
  {
    title: String,
    preacher: String,
    date: Date,
    scripture: String,
    summary: String,
    videoUrl: String,
    audioUrl: String,
    image: String,
    published: { type: Boolean, default: true },
  },
  opts
);

const Event = new Schema(
  {
    title: String,
    startDate: Date,
    endDate: Date,
    time: String,
    location: String,
    description: String,
    image: String,
    published: { type: Boolean, default: true },
  },
  opts
);

const Ministry = new Schema(
  { name: String, leader: String, meetingTime: String, description: String, image: String, order: { type: Number, default: 0 } },
  opts
);

const Testimony = new Schema(
  {
    name: String,
    title: String,
    story: String,
    photo: String,
    approved: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
  },
  opts
);

const Photo = new Schema({ caption: String, album: String, image: String, order: { type: Number, default: 0 } }, opts);

const Leader = new Schema(
  { name: String, role: String, bio: String, photo: String, order: { type: Number, default: 0 } },
  opts
);

const Message = new Schema(
  {
    kind: { type: String, enum: ['message', 'prayer'], default: 'message', index: true },
    name: String,
    email: String,
    phone: String,
    subject: String,
    message: String,
    confidential: { type: Boolean, default: false },
    wantsCall: { type: Boolean, default: false },
    prayed: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
  },
  opts
);

module.exports = {
  Image: mongoose.model('Image', ImageSchema),
  Setting: mongoose.model('Setting', SettingSchema),
  User: mongoose.model('User', UserSchema),
  ServiceTime: mongoose.model('ServiceTime', ServiceTime),
  Sermon: mongoose.model('Sermon', Sermon),
  Event: mongoose.model('Event', Event),
  Ministry: mongoose.model('Ministry', Ministry),
  Testimony: mongoose.model('Testimony', Testimony),
  Photo: mongoose.model('Photo', Photo),
  Leader: mongoose.model('Leader', Leader),
  Message: mongoose.model('Message', Message),
};
