// routes/clinics.js
const express = require('express');
const { db } = require('../db/database');
const { haversineKm } = require('../utils/distance');
const { requireAdmin } = require('./middleware');
const router = express.Router();

// GET /api/clinics?lat=..&lng=..  -> danh sách phòng khám, sắp xếp theo khoảng cách nếu có toạ độ
router.get('/', (req, res) => {
  const clinics = db.prepare('SELECT * FROM clinics').all();
  const { lat, lng } = req.query;
  let result = clinics;
  if (lat && lng) {
    result = clinics.map(c => ({
      ...c,
      distance_km: haversineKm(parseFloat(lat), parseFloat(lng), c.lat, c.lng)
    })).sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
  }
  res.json(result);
});

router.get('/:id', (req, res) => {
  const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(req.params.id);
  if (!clinic) return res.status(404).json({ error: 'Không tìm thấy phòng khám' });
  res.json(clinic);
});

// ---- ADMIN CRUD ----
router.post('/', requireAdmin, (req, res) => {
  const { id, name, address, district, city, lat, lng, phone, email, opening_hours, description, image } = req.body;
  if (!id || !name || !address) return res.status(400).json({ error: 'Thiếu id, tên hoặc địa chỉ phòng khám' });
  try {
    db.prepare(`INSERT INTO clinics (id,name,address,district,city,lat,lng,phone,email,opening_hours,description,image)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, name, address, district, city, lat, lng, phone, email, opening_hours, description, image);
    res.status(201).json({ message: 'Đã thêm phòng khám' });
  } catch (e) { res.status(400).json({ error: 'ID phòng khám đã tồn tại hoặc dữ liệu không hợp lệ' }); }
});

router.put('/:id', requireAdmin, (req, res) => {
  const f = req.body;
  db.prepare(`UPDATE clinics SET name=?,address=?,district=?,city=?,lat=?,lng=?,phone=?,email=?,opening_hours=?,description=?,image=? WHERE id=?`)
    .run(f.name, f.address, f.district, f.city, f.lat, f.lng, f.phone, f.email, f.opening_hours, f.description, f.image, req.params.id);
  res.json({ message: 'Đã cập nhật phòng khám' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM clinics WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xoá phòng khám' });
});

module.exports = router;
