const mongoose = require('mongoose');

const tipSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 5000 },
  attachments: [{ filename: String, originalName: String, path: String }],
  read: { type: Boolean, default: false },
  archived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Tip', tipSchema);
