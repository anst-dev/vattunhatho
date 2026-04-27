const db = require('../services/jsonDbService');
const codeService = require('../services/codeService');

async function getAll() {
  return db.read('materials');
}

async function getActive() {
  const all = await db.read('materials');
  return all.filter(m => m.is_active !== false);
}

async function getByCategory(category) {
  const all = await getActive();
  return all.filter(m => m.category === category);
}

async function findById(id) {
  return db.findById('materials', id);
}

async function create(data) {
  const id = await codeService.getNextCode('materials', 'VT');
  const material = {
    id,
    name: data.name,
    unit: data.unit,
    default_price: Number(data.default_price) || 0,
    category: data.category,
    is_active: true
  };
  await db.append('materials', material);
  return material;
}

async function update(id, data) {
  return db.replaceById('materials', id, (existing) => ({
    ...existing,
    name: data.name || existing.name,
    unit: data.unit || existing.unit,
    default_price: data.default_price !== undefined ? Number(data.default_price) : existing.default_price,
    category: data.category || existing.category
  }));
}

async function remove(id) {
  return db.removeById('materials', id);
}

module.exports = { getAll, getActive, getByCategory, findById, create, update, remove };
