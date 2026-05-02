const reportService = require('../services/reportService');
const XLSX = require('xlsx');

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
  const { from_date, to_date, category, customer_name } = req.query;

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
    isPrint: true,
    customerName: customer_name || ''
  });
}

async function exportExcel(req, res) {
  const { from_date, to_date, category, customer_name } = req.query;

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

  const formatters = require('../utils/formatters');
  const workbook = XLSX.utils.book_new();

  reports.forEach(report => {
    const catName = categoryNames[report.category] || report.category;
    const title = customer_name
      ? `${customer_name} - ${catName}`
      : `LỊCH SỬ CUNG CẤP VẬT TƯ - ${catName}`;

    const rows = [];
    // Tiêu đề
    rows.push([title]);
    rows.push([`Từ ngày ${formatters.formatDate(from_date)} đến ngày ${formatters.formatDate(to_date)}`]);
    rows.push([]);
    // Header bảng
    rows.push(['STT', 'Ngày', 'Tên vật tư', 'Đơn vị tính', 'Số lượng', 'Đơn giá (đ)', 'Thành tiền (đ)', 'Ghi chú']);
    // Dữ liệu
    report.supplies.forEach((s, i) => {
      rows.push([
        i + 1,
        formatters.formatDate(s.date),
        s.material_name,
        s.unit,
        Number(s.quantity),
        Number(s.unit_price),
        Number(s.total_amount),
        s.note || ''
      ]);
    });
    // Tổng
    rows.push([]);
    rows.push(['', '', '', '', '', 'Tổng tiền', report.totalAmount, '']);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Merge tiêu đề
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
    ];

    // Độ rộng cột
    ws['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 30 }, { wch: 12 },
      { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 20 }
    ];

    // Tên sheet (tối đa 31 ký tự, không có ký tự đặc biệt)
    const sheetName = catName.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
  });

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const fileName = `baocao_vattu_${from_date}_${to_date}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}

module.exports = { showReport, printReport, exportExcel };
