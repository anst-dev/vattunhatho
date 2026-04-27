const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supplyController');

router.get('/entry/:category', ctrl.showEntryForm);
router.post('/create', ctrl.createSupply);
router.get('/history/:category', ctrl.listSupplies);
router.post('/:id/update', ctrl.updateSupply);
router.post('/:id/delete', ctrl.deleteSupply);

module.exports = router;
