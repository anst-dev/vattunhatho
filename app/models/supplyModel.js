const db = require('../services/jsonDbService');
const codeService = require('../services/codeService');

async function getAll() {
  return db.read('supplies');
}

async function getByCategory(category) {
  const all = await db.read('supplies');
  return all.filter(s => s.category === category);
}

async function findByDateRange(fromDate, toDate, category) {
  const all = await db.read('supplies');
  const { parseDate } = require('../services/reportService');

  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  to.setHours(23, 59, 59, 999);

  return all.filter(s => {
    if (category && s.category !== category) return false;
    const d = parseDate(s.date);
    return d >= from && d <= to;
  });
}

async function findById(id) {
  return db.findById('supplies', id);
}

async function create(data) {
  const id = await codeService.getNextCode('supplies', 'CC');
  const supply = {
    id,
    date: data.date,
    material_id: data.material_id || '',
    material_name: data.material_name,
    unit: data.unit,
    quantity: Number(data.quantity),
    unit_price: Number(data.unit_price),
    total_amount: Number(data.quantity) * Number(data.unit_price),
    note: data.note || '',
    category: data.category
  };
  await db.append('supplies', supply);
  return supply;
}

async function update(id, data) {
  return db.replaceById('supplies', id, (existing) => {
    const qty = data.quantity !== undefined ? Number(data.quantity) : existing.quantity;
    const price = data.unit_price !== undefined ? Number(data.unit_price) : existing.unit_price;
    return {
      ...existing,
      date: data.date || existing.date,
      material_name: data.material_name || existing.material_name,
      unit: data.unit || existing.unit,
      quantity: qty,
      unit_price: price,
      total_amount: qty * price,
      note: data.note !== undefined ? data.note : existing.note
    };
  });
}

async function remove(id) {
  return db.removeById('supplies', id);
}

module.exports = { getAll, getByCategory, findByDateRange, findById, create, update, remove };
