const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/materialController');

router.get('/', ctrl.listMaterials);
router.post('/create', ctrl.createMaterial);
router.post('/:id/update', ctrl.updateMaterial);
router.post('/:id/delete', ctrl.deleteMaterial);

module.exports = router;
