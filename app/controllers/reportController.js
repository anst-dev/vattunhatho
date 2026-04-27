const reportService = require('../services/reportService');

async function showReport(req, res) {
  const { from_date, to_date, category } = req.query;

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const fromDate = from_date || firstOfMonth.toISOString().split('T')[0];
  const toDate = to_date || today.toISOString().split('T')[0];

  const categoryNames = {
    xi_mang_sat_thep: 'Xi măng sắt thép',
    da_cat: 'Đá cát',
    all: 'Tất cả'
  };

  let reports = [];
  if (category && category !== 'all') {
    const data = await reportService.getReportData(fromDate, toDate, category);
    reports.push(data);
  } else {
    const xiMang = await reportService.getReportData(fromDate, toDate, 'xi_mang_sat_thep');
    const daCat = await reportService.getReportData(fromDate, toDate, 'da_cat');
    reports.push(xiMang);
    reports.push(daCat);
  }

  res.render('reports/report', {
    title: 'Báo cáo vật tư',
    reports,
    fromDate,
    toDate,
    category: category || 'all',
    categoryNames,
    formatVND: reportService.formatVND,
    formatDate: require('../utils/formatters').formatDate
  });
}

async function printReport(req, res) {
  const { from_date, to_date, category } = req.query;

  const categoryNames = {
    xi_mang_sat_thep: 'Xi măng sắt thép',
    da_cat: 'Đá cát',
    all: 'Tất cả'
  };

  let reports = [];
  if (category && category !== 'all') {
    const data = await reportService.getReportData(from_date, to_date, category);
    reports.push(data);
  } else {
    const xiMang = await reportService.getReportData(from_date, to_date, 'xi_mang_sat_thep');
    const daCat = await reportService.getReportData(from_date, to_date, 'da_cat');
    reports.push(xiMang);
    reports.push(daCat);
  }

  res.render('reports/print', {
    title: 'In báo cáo',
    reports,
    fromDate: from_date,
    toDate: to_date,
    category: category || 'all',
    categoryNames,
    formatVND: reportService.formatVND,
    formatDate: require('../utils/formatters').formatDate,
    isPrint: true
  });
}

module.exports = { showReport, printReport };
