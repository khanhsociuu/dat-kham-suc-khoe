// routes/middleware.js
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Bạn cần đăng nhập để thực hiện thao tác này.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ quản trị viên (admin) mới có quyền thực hiện thao tác này.' });
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
