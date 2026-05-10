const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true },
  summary: { type: String, maxlength: 500 },
  category: {
    type: String,
    enum: ['investigacion', 'denuncia', 'alerta', 'documentos', 'propiedades', 'general'],
    default: 'general'
  },
  tags: [{ type: String, trim: true }],
  images: [{ type: String }],
  documents: [{ filename: String, originalName: String, path: String }],
  persons: [{
    name: String,
    role: String,
    description: String
  }],
  locations: [{
    address: String,
    description: String,
    lat: Number,
    lng: Number
  }],
  published: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  shares: { type: Number, default: 0 }
}, { timestamps: true });

postSchema.index({ title: 'text', content: 'text', tags: 'text', 'persons.name': 'text' });

module.exports = mongoose.model('Post', postSchema);
