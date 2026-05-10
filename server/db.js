const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data');
if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH);

function getFilePath(collection) {
  return path.join(DB_PATH, `${collection}.json`);
}

function readCollection(collection) {
  const file = getFilePath(collection);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Atomic write: write to temp file, then rename. Prevents corruption from concurrent writes.
function writeCollection(collection, data) {
  const file = getFilePath(collection);
  const tmp = file + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

class Collection {
  constructor(name) {
    this.name = name;
  }

  findAll(filter = {}) {
    let items = readCollection(this.name);
    for (const [key, value] of Object.entries(filter)) {
      if (key === '$text') {
        const search = value.$search.toLowerCase();
        items = items.filter(item =>
          JSON.stringify(item).toLowerCase().includes(search)
        );
      } else {
        items = items.filter(item => item[key] === value);
      }
    }
    return items;
  }

  findById(id) {
    const items = readCollection(this.name);
    return items.find(item => item._id === id) || null;
  }

  create(data) {
    const items = readCollection(this.name);
    const item = {
      _id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(item);
    writeCollection(this.name, items);
    return item;
  }

  update(id, data) {
    const items = readCollection(this.name);
    const index = items.findIndex(item => item._id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
    writeCollection(this.name, items);
    return items[index];
  }

  delete(id) {
    const items = readCollection(this.name);
    const filtered = items.filter(item => item._id !== id);
    writeCollection(this.name, filtered);
    return filtered.length < items.length;
  }

  count(filter = {}) {
    return this.findAll(filter).length;
  }
}

module.exports = { Collection };
