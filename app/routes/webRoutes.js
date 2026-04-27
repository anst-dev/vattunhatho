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
      formatVND
    });
  } catch (err) {
    res.render('dashboard', {
      title: 'Trang chủ',
      data: {},
      formatVND: (v) => v
    });
  }
});

router.get('/report', require('../controllers/reportController').showReport);
router.get('/report/print', require('../controllers/reportController').printReport);

module.exports = router;
