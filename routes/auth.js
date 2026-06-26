// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const router = express.Router();

router.post('/register', (req, res) => {
  const { full_name, email, phone, address, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email này đã được đăng ký.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`INSERT INTO users (full_name, email, phone, address, password_hash, role)
                            VALUES (?,?,?,?,?, 'patient')`)
    .run(full_name, email, phone || '', address || '', hash);

  req.session.user = { id: Number(info.lastInsertRowid), full_name, email, role: 'patient' };
  res.json({ message: 'Đăng ký thành công', user: req.session.user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
  }
  req.session.user = { id: user.id, full_name: user.full_name, email: user.email, role: user.role };
  res.json({ message: 'Đăng nhập thành công', user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Đã đăng xuất' }));
});

router.get('/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

module.exports = router;
