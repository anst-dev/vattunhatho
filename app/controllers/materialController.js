const materialModel = require('../models/materialModel');

async function listMaterials(req, res) {
  const category = req.query.category;
  let materials;
  if (category) {
    materials = await materialModel.getByCategory(category);
  } else {
    materials = await materialModel.getActive();
  }

  const categories = {
    xi_mang_sat_thep: 'Xi măng sắt thép',
    da_cat: 'Đá cát'
  };

  res.render('materials/list', {
    title: 'Danh sách vật tư',
    materials,
    categories,
    currentCategory: category || ''
  });
}

async function createMaterial(req, res) {
  try {
    const { name, unit, default_price, category } = req.body;
    if (!name || !unit || !category) {
      return res.redirect('/materials?error=missing_fields');
    }
    await materialModel.create({ name, unit, default_price, category });
    res.redirect('/materials?success=created');
  } catch (err) {
    res.redirect('/materials?error=' + encodeURIComponent(err.message));
  }
}

async function updateMaterial(req, res) {
  try {
    const { id } = req.params;
    const { name, unit, default_price, category } = req.body;
    await materialModel.update(id, { name, unit, default_price, category });
    res.redirect('/materials?success=updated');
  } catch (err) {
    res.redirect('/materials?error=' + encodeURIComponent(err.message));
  }
}

async function deleteMaterial(req, res) {
  try {
    const { id } = req.params;
    await materialModel.remove(id);
    res.redirect('/materials?success=deleted');
  } catch (err) {
    res.redirect('/materials?error=' + encodeURIComponent(err.message));
  }
}

module.exports = { listMaterials, createMaterial, updateMaterial, deleteMaterial };
