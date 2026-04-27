function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error(err.stack);

  res.status(err.status || 500).render('error', {
    title: 'Lỗi',
    message: err.message || 'Đã xảy ra lỗi',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
}

module.exports = { errorHandler };
