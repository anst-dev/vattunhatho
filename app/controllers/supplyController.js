const supplyModel = require('../models/supplyModel');
const materialModel = require('../models/materialModel');

async function showEntryForm(req, res) {
  const category = req.params.category || 'xi_mang_sat_thep';
  const materials = await materialModel.getByCategory(category);

  const categoryNames = {
    xi_mang_sat_thep: 'Xi măng sắt thép',
    da_cat: 'Đá cát'
  };

  res.render('supplies/entry', {
    title: 'Nhập vật tư - ' + (categoryNames[category] || category),
    materials,
    category,
    categoryName: categoryNames[category] || category
  });
}

async function createSupply(req, res) {
  try {
    const { date, material_id, material_name, unit, quantity, unit_price, note, category } = req.body;

    if (!date || !material_name || !unit || !quantity || !unit_price) {
      return res.redirect(`/supplies/entry/${category}?error=missing_fields`);
    }

    await supplyModel.create({
      date, material_id, material_name, unit,
      quantity, unit_price, note, category
    });

    res.redirect(`/supplies/entry/${category}?success=created`);
  } catch (err) {
    const category = req.body.category || 'xi_mang_sat_thep';
    res.redirect(`/supplies/entry/${category}?error=` + encodeURIComponent(err.message));
  }
}

async function listSupplies(req, res) {
  const category = req.params.category || 'xi_mang_sat_thep';
  const supplies = await supplyModel.getByCategory(category);

  const categoryNames = {
    xi_mang_sat_thep: 'Xi măng sắt thép',
    da_cat: 'Đá cát'
  };

  // Sort by date descending
  supplies.sort((a, b) => {
    const da = new Date(a.date.includes('/') ? a.date.split('/').reverse().join('-') : a.date);
    const db2 = new Date(b.date.includes('/') ? b.date.split('/').reverse().join('-') : b.date);
    return db2 - da;
  });

  const totalAmount = supplies.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

  res.render('supplies/history', {
    title: 'Lịch sử - ' + (categoryNames[category] || category),
    supplies,
    category,
    categoryName: categoryNames[category] || category,
    totalAmount
  });
}

async function updateSupply(req, res) {
  try {
    const { id } = req.params;
    const { date, material_name, unit, quantity, unit_price, note, category } = req.body;

    if (!date || !material_name || !unit || !quantity || !unit_price) {
      return res.redirect(`/supplies/history/${category || 'xi_mang_sat_thep'}?error=missing_fields`);
    }

    await supplyModel.update(id, {
      date, material_name, unit,
      quantity, unit_price, note
    });

    res.redirect(`/supplies/history/${category || 'xi_mang_sat_thep'}?success=updated`);
  } catch (err) {
    const category = req.body.category || 'xi_mang_sat_thep';
    res.redirect(`/supplies/history/${category}?error=` + encodeURIComponent(err.message));
  }
}

async function deleteSupply(req, res) {
  try {
    const { id } = req.params;
    const { category } = req.query;
    await supplyModel.remove(id);
    res.redirect(`/supplies/history/${category || 'xi_mang_sat_thep'}?success=deleted`);
  } catch (err) {
    res.redirect('/supplies?error=' + encodeURIComponent(err.message));
  }
}

module.exports = { showEntryForm, createSupply, listSupplies, updateSupply, deleteSupply };
