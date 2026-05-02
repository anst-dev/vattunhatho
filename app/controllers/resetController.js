const XLSX = require('xlsx');
const db = require('../services/jsonDbService');
const formatters = require('../utils/formatters');

const CATEGORY_NAMES = {
  xi_mang_sat_thep: 'Xi măng sắt thép',
  da_cat: 'Đá cát',
};

/**
 * GET /reset/backup-excel
 * Xuất toàn bộ dữ liệu phiếu nhập ra Excel, không lọc ngày.
 * Được gọi tự động trước khi reset.
 */
async function backupExcel(req, res) {
  try {
    const supplies = db.read('supplies');
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5).replace(':', 'h');

    const workbook = XLSX.utils.book_new();

    // Sheet tổng hợp tất cả
    const allRows = [];
    allRows.push([`TOÀN BỘ DỮ LIỆU VẬT TƯ — Xuất lúc ${formatters.formatDate(dateStr)} ${timeStr}`]);
    allRows.push([]);
    allRows.push(['STT', 'Ngày', 'Nhóm', 'Tên vật tư', 'Đơn vị', 'Số lượng', 'Đơn giá (đ)', 'Thành tiền (đ)', 'Ghi chú']);

    const sorted = [...supplies].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach((s, i) => {
      allRows.push([
        i + 1,
        formatters.formatDate(s.date),
        CATEGORY_NAMES[s.category] || s.category,
        s.material_name,
        s.unit,
        Number(s.quantity),
        Number(s.unit_price),
        Number(s.total_amount),
        s.note || '',
      ]);
    });

    const grandTotal = sorted.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    allRows.push([]);
    allRows.push(['', '', '', '', '', '', 'TỔNG CỘNG', grandTotal, '']);

    const wsAll = XLSX.utils.aoa_to_sheet(allRows);
    wsAll['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
    wsAll['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 18 }, { wch: 30 },
      { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsAll, 'Tất cả');

    // Sheet theo từng nhóm
    for (const [catKey, catName] of Object.entries(CATEGORY_NAMES)) {
      const catSupplies = sorted.filter(s => s.category === catKey);
      const rows = [];
      rows.push([`${catName} — Xuất lúc ${formatters.formatDate(dateStr)} ${timeStr}`]);
      rows.push([]);
      rows.push(['STT', 'Ngày', 'Tên vật tư', 'Đơn vị', 'Số lượng', 'Đơn giá (đ)', 'Thành tiền (đ)', 'Ghi chú']);

      catSupplies.forEach((s, i) => {
        rows.push([
          i + 1,
          formatters.formatDate(s.date),
          s.material_name,
          s.unit,
          Number(s.quantity),
          Number(s.unit_price),
          Number(s.total_amount),
          s.note || '',
        ]);
      });

      const catTotal = catSupplies.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
      rows.push([]);
      rows.push(['', '', '', '', '', 'Tổng tiền', catTotal, '']);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
      ws['!cols'] = [
        { wch: 5 }, { wch: 12 }, { wch: 30 }, { wch: 10 },
        { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(workbook, ws, catName.substring(0, 31));
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `backup_vattu_truoc_reset_${dateStr}_${timeStr}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /reset/confirm
 * Xóa toàn bộ phiếu nhập (supplies), giữ lại danh mục vật tư (materials).
 * Chỉ được gọi sau khi backup Excel đã hoàn thành ở client.
 */
function confirmReset(req, res) {
  try {
    const supplies = db.read('supplies');
    const count = supplies.length;

    // Xóa toàn bộ phiếu nhập
    db.write('supplies', []);

    res.redirect(`/?success=reset&count=${count}`);
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent('Lỗi khi reset: ' + err.message));
  }
}

module.exports = { backupExcel, confirmReset };
