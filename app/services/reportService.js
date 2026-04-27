const db = require('./jsonDbService');

function parseDate(str) {
  // Support dd/mm/yyyy or yyyy-mm-dd
  if (str.includes('/')) {
    const [d, m, y] = str.split('/');
    return new Date(y, m - 1, d);
  }
  return new Date(str);
}

function formatVND(amount) {
  return Number(amount).toLocaleString('vi-VN') + ' đ';
}

async function getReportData(fromDate, toDate, category) {
  const supplies = await db.read('supplies');

  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  to.setHours(23, 59, 59, 999);

  const filtered = supplies.filter(s => {
    if (category && s.category !== category) return false;
    const d = parseDate(s.date);
    return d >= from && d <= to;
  });

  // Sort by date
  filtered.sort((a, b) => parseDate(a.date) - parseDate(b.date));

  // Calculate totals
  const totalAmount = filtered.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

  return {
    supplies: filtered,
    totalAmount,
    fromDate,
    toDate,
    category
  };
}

async function getDashboardData() {
  const supplies = await db.read('supplies');
  const materials = await db.read('materials');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const todaySupplies = supplies.filter(s => {
    const d = parseDate(s.date);
    return d.toISOString().split('T')[0] === todayStr;
  });

  const todayTotal = todaySupplies.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

  // By category
  const xiMang = supplies.filter(s => s.category === 'xi_mang_sat_thep');
  const daCat = supplies.filter(s => s.category === 'da_cat');

  const xiMangTotal = xiMang.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const daCatTotal = daCat.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

  return {
    totalMaterials: materials.filter(m => m.is_active !== false).length,
    totalSupplies: supplies.length,
    todayCount: todaySupplies.length,
    todayTotal,
    xiMangTotal,
    daCatTotal,
    grandTotal: xiMangTotal + daCatTotal
  };
}

module.exports = { getReportData, getDashboardData, parseDate, formatVND };
