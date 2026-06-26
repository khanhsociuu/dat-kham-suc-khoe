// routes/facilities.js
const express = require('express');
const { db } = require('../db/database');
const { requireAdmin } = require('./middleware');
const router = express.Router();

// GET /api/facilities  -> danh sách cơ sở vật chất (sắp xếp theo sort_order)
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM facilities ORDER BY sort_order ASC, id ASC').all());
});

// GET /api/facilities/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy mục cơ sở vật chất' });
  res.json(row);
});

// POST /api/facilities  -> thêm mới (chỉ admin)
router.post('/', requireAdmin, (req, res) => {
  const { id, title, icon, description, image, sort_order } = req.body;
  if (!id || !title) return res.status(400).json({ error: 'Thiếu mã (id) hoặc tiêu đề.' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM facilities').get().m;
  try {
    db.prepare(`INSERT INTO facilities (id, title, icon, description, image, sort_order)
                VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, title, icon || '', description || '', image || '', sort_order || maxOrder + 1);
    res.status(201).json({ message: 'Đã thêm cơ sở vật chất mới.' });
  } catch (e) {
    res.status(400).json({ error: 'Mã (id) đã tồn tại hoặc dữ liệu không hợp lệ.' });
  }
});

// PUT /api/facilities/:id  -> cập nhật (chỉ admin)
router.put('/:id', requireAdmin, (req, res) => {
  const { title, icon, description, image, sort_order } = req.body;
  const existing = db.prepare('SELECT id FROM facilities WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy mục cần cập nhật.' });
  db.prepare(`UPDATE facilities SET title=?, icon=?, description=?, image=?, sort_order=? WHERE id=?`)
    .run(title, icon || '', description || '', image || '', sort_order || 0, req.params.id);
  res.json({ message: 'Đã cập nhật thành công.' });
});

// DELETE /api/facilities/:id  -> xoá (chỉ admin)
router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM facilities WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy mục cần xoá.' });
  db.prepare('DELETE FROM facilities WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xoá thành công.' });
});

module.exports = router;
