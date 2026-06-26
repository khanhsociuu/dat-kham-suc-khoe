// routes/specialties.js
const express = require('express');
const { db } = require('../db/database');
const { requireAdmin } = require('./middleware');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM specialties').all());
});

router.post('/', requireAdmin, (req, res) => {
  const { id, name, description, keywords } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'Thiếu mã hoặc tên chuyên khoa' });
  try {
    db.prepare('INSERT INTO specialties (id,name,description,keywords) VALUES (?,?,?,?)')
      .run(id, name, description, keywords);
    res.status(201).json({ message: 'Đã thêm chuyên khoa' });
  } catch (e) { res.status(400).json({ error: 'Mã chuyên khoa đã tồn tại' }); }
});

router.put('/:id', requireAdmin, (req, res) => {
  const { name, description, keywords } = req.body;
  db.prepare('UPDATE specialties SET name=?,description=?,keywords=? WHERE id=?')
    .run(name, description, keywords, req.params.id);
  res.json({ message: 'Đã cập nhật chuyên khoa' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM specialties WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xoá chuyên khoa' });
});

module.exports = router;
