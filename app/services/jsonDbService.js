const fs = require('fs');
const path = require('path');
const sheetsDb = require('./sheetsDbService');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const NESTED_FIELDS = {};

function read(fileName) {
  if (sheetsDb.isConfigured()) return sheetsDb.read(fileName);

  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function write(fileName, data) {
  if (sheetsDb.isConfigured()) return sheetsDb.write(fileName, data);

  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

function append(fileName, item) {
  if (sheetsDb.isConfigured()) return sheetsDb.append(fileName, item);

  const data = read(fileName);
  data.push(item);
  write(fileName, data);
  return item;
}

function replaceById(fileName, id, updater) {
  const data = read(fileName);
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return null;

  if (typeof updater === 'function') {
    data[index] = { ...data[index], ...updater(data[index]) };
  } else {
    data[index] = { ...data[index], ...updater };
  }

  if (sheetsDb.isConfigured()) {
    write(fileName, data);
  } else {
    write(fileName, data);
  }
  return data[index];
}

function findById(fileName, id) {
  const data = read(fileName);
  return data.find(item => item.id === id) || null;
}

function removeById(fileName, id) {
  const data = read(fileName);
  const filtered = data.filter(item => item.id !== id);
  if (filtered.length === data.length) return false;
  write(fileName, filtered);
  return true;
}

function findAll(fileName, filter) {
  const data = read(fileName);
  if (!filter) return data;
  return data.filter(filter);
}

module.exports = { read, write, append, replaceById, findById, removeById, findAll };
