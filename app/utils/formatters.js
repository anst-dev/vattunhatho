function formatVND(amount) {
  if (!amount && amount !== 0) return '0 đ';
  return Number(amount).toLocaleString('vi-VN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' đ';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  // If already dd/mm/yyyy
  if (dateStr.includes('/')) return dateStr;
  // yyyy-mm-dd -> dd/mm/yyyy
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  // dd/mm/yyyy -> yyyy-mm-dd
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

module.exports = { formatVND, formatDate, formatDateInput };
