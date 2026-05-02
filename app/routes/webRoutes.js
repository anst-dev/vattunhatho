const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');

router.get('/', async (req, res) => {
  try {
    const data = await reportService.getDashboardData();
    const { formatVND } = require('../utils/formatters');
    res.render('dashboard', {
      title: 'Trang chủ - Quản lý vật tư nhà thờ',
      data,
      formatVND,
      success: req.query.success || null,
      resetCount: req.query.count ? Number(req.query.count) : 0,
      error: req.query.error || null,
    });
  } catch (err) {
    res.render('dashboard', {
      title: 'Trang chủ',
      data: {},
      formatVND: (v) => v,
      success: null,
      resetCount: 0,
      error: null,
    });
  }
});

router.get('/report', require('../controllers/reportController').showReport);
router.get('/report/print', require('../controllers/reportController').printReport);
router.get('/report/export', require('../controllers/reportController').exportExcel);

router.get('/reset/backup-excel', require('../controllers/resetController').backupExcel);
router.post('/reset/confirm', require('../controllers/resetController').confirmReset);

module.exports = router;
