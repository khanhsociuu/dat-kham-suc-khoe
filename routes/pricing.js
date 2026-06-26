// routes/pricing.js
const express = require('express');
const { db } = require('../db/database');
const { requireAdmin } = require('./middleware');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM pricing ORDER BY category, price').all());
});

router.post('/', requireAdmin, (req, res) => {
  const { id, category, service_name, price, unit, description } = req.body;
  if (!id || !service_name) return res.status(400).json({ error: 'Thiếu mã hoặc tên dịch vụ' });
  try {
    db.prepare('INSERT INTO pricing (id,category,service_name,price,unit,description) VALUES (?,?,?,?,?,?)')
      .run(id, category, service_name, price, unit, description);
    res.status(201).json({ message: 'Đã thêm dịch vụ' });
  } catch (e) { res.status(400).json({ error: 'Mã dịch vụ đã tồn tại' }); }
});

router.put('/:id', requireAdmin, (req, res) => {
  const { category, service_name, price, unit, description } = req.body;
  db.prepare('UPDATE pricing SET category=?,service_name=?,price=?,unit=?,description=? WHERE id=?')
    .run(category, service_name, price, unit, description, req.params.id);
  res.json({ message: 'Đã cập nhật dịch vụ' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM pricing WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xoá dịch vụ' });
});

module.exports = router;
