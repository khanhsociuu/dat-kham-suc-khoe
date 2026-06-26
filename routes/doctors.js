// routes/doctors.js
const express = require('express');
const { db } = require('../db/database');
const { requireAdmin } = require('./middleware');
const router = express.Router();

function withJoins(rows) {
  return rows.map(d => {
    const sp = db.prepare('SELECT name FROM specialties WHERE id = ?').get(d.specialty_id);
    const cl = db.prepare('SELECT name, address, district, city FROM clinics WHERE id = ?').get(d.clinic_id);
    return { ...d, specialty_name: sp?.name || '', clinic_name: cl?.name || '', clinic_address: cl?.address || '' };
  });
}

// GET /api/doctors?specialty_id=&clinic_id=&symptom=
router.get('/', (req, res) => {
  let rows = db.prepare('SELECT * FROM doctors').all();
  const { specialty_id, clinic_id, symptom } = req.query;

  if (symptom) {
    const kw = symptom.toLowerCase().trim();
    const matchedSpecialties = db.prepare('SELECT * FROM specialties').all()
      .filter(s => (s.keywords || '').toLowerCase().split(',').some(k => k.trim() && (kw.includes(k.trim()) || k.trim().includes(kw))));
    const ids = matchedSpecialties.map(s => s.id);
    if (ids.length) rows = rows.filter(d => ids.includes(d.specialty_id));
    return res.json({ doctors: withJoins(rows), matched_specialties: matchedSpecialties });
  }

  if (specialty_id) rows = rows.filter(d => d.specialty_id === specialty_id);
  if (clinic_id) rows = rows.filter(d => d.clinic_id === clinic_id);
  res.json({ doctors: withJoins(rows), matched_specialties: [] });
});

router.get('/:id', (req, res) => {
  const d = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Không tìm thấy bác sĩ' });
  res.json(withJoins([d])[0]);
});

router.post('/', requireAdmin, (req, res) => {
  const f = req.body;
  if (!f.id || !f.full_name) return res.status(400).json({ error: 'Thiếu mã bác sĩ hoặc họ tên' });
  const image = f.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.full_name)}&background=0D8ABC&color=fff&size=256`;
  try {
    db.prepare(`INSERT INTO doctors (id,full_name,specialty_id,clinic_id,degree,experience_years,education,bio,gender,schedule,consultation_fee,rating,image)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(f.id, f.full_name, f.specialty_id, f.clinic_id, f.degree, f.experience_years, f.education, f.bio, f.gender, f.schedule, f.consultation_fee, f.rating || 5, image);
    res.status(201).json({ message: 'Đã thêm bác sĩ' });
  } catch (e) { res.status(400).json({ error: 'Mã bác sĩ đã tồn tại hoặc dữ liệu không hợp lệ' }); }
});

router.put('/:id', requireAdmin, (req, res) => {
  const f = req.body;
  db.prepare(`UPDATE doctors SET full_name=?,specialty_id=?,clinic_id=?,degree=?,experience_years=?,education=?,bio=?,gender=?,schedule=?,consultation_fee=?,rating=? WHERE id=?`)
    .run(f.full_name, f.specialty_id, f.clinic_id, f.degree, f.experience_years, f.education, f.bio, f.gender, f.schedule, f.consultation_fee, f.rating, req.params.id);
  res.json({ message: 'Đã cập nhật bác sĩ' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM doctors WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xoá bác sĩ' });
});

module.exports = router;
