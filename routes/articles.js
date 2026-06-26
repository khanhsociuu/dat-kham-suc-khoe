// routes/articles.js
const express = require('express');
const { db } = require('../db/database');
const { requireAdmin } = require('./middleware');
const router = express.Router();

router.get('/', (req, res) => {
  const { category, q } = req.query;
  let rows = db.prepare('SELECT * FROM articles').all();
  if (category) rows = rows.filter(a => a.category === category);
  if (q) {
    const term = q.toLowerCase();
    rows = rows.filter(a => a.title.toLowerCase().includes(term) || (a.summary || '').toLowerCase().includes(term));
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  res.json(a);
});

router.post('/', requireAdmin, (req, res) => {
  const { id, title, category, summary, content, image } = req.body;
  if (!id || !title) return res.status(400).json({ error: 'Thiếu mã hoặc tiêu đề bài viết' });
  try {
    db.prepare('INSERT INTO articles (id,title,category,summary,content,image) VALUES (?,?,?,?,?,?)')
      .run(id, title, category, summary, content, image || 'https://picsum.photos/seed/' + id + '/600/360');
    res.status(201).json({ message: 'Đã thêm bài viết' });
  } catch (e) { res.status(400).json({ error: 'Mã bài viết đã tồn tại' }); }
});

router.put('/:id', requireAdmin, (req, res) => {
  const { title, category, summary, content, image } = req.body;
  db.prepare('UPDATE articles SET title=?,category=?,summary=?,content=?,image=? WHERE id=?')
    .run(title, category, summary, content, image, req.params.id);
  res.json({ message: 'Đã cập nhật bài viết' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xoá bài viết' });
});

module.exports = router;
