// routes/admin.js
const express = require('express');
const { db } = require('../db/database');
const { requireAdmin } = require('./middleware');
const router = express.Router();

router.get('/stats', requireAdmin, (req, res) => {
  const count = (sql) => db.prepare(sql).get().c;
  res.json({
    clinics: count('SELECT COUNT(*) c FROM clinics'),
    doctors: count('SELECT COUNT(*) c FROM doctors'),
    users: count("SELECT COUNT(*) c FROM users WHERE role='patient'"),
    appointments: count('SELECT COUNT(*) c FROM appointments'),
    appointments_confirmed: count("SELECT COUNT(*) c FROM appointments WHERE status='confirmed'"),
    appointments_cancelled: count("SELECT COUNT(*) c FROM appointments WHERE status='cancelled'"),
    articles: count('SELECT COUNT(*) c FROM articles'),
    notifications: count('SELECT COUNT(*) c FROM notifications_log')
  });
});

router.get('/users', requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT id, full_name, email, phone, address, role, created_at FROM users ORDER BY created_at DESC").all());
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  if (Number(req.params.id) === req.session.user.id) {
    return res.status(400).json({ error: 'Không thể tự xoá chính tài khoản admin đang đăng nhập.' });
  }
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: 'Đã xoá người dùng' });
});

router.get('/notifications', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM notifications_log ORDER BY created_at DESC LIMIT 100').all());
});

module.exports = router;
