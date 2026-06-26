// routes/clinic-portal.js
// Cổng dành cho NHÂN VIÊN PHÒNG KHÁM: xem lịch hẹn hôm nay, xác nhận bệnh nhân đến,
// nhập số tiền thu được → hệ thống tự tính hoa hồng 20%
const express = require('express');
const { db } = require('../db/database');
const router = express.Router();

function requireClinicStaff(req, res, next) {
  const u = req.session.user;
  if (!u) return res.status(401).json({ error: 'Bạn cần đăng nhập.' });
  if (u.role !== 'clinic_staff' && u.role !== 'admin') return res.status(403).json({ error: 'Chỉ nhân viên phòng khám mới có quyền truy cập.' });
  next();
}

function getStaffClinicId(userId) {
  const row = db.prepare('SELECT clinic_id FROM clinic_staff WHERE user_id=?').get(userId);
  return row ? row.clinic_id : null;
}

// GET /api/clinic-portal/appointments?date=YYYY-MM-DD
router.get('/appointments', requireClinicStaff, (req, res) => {
  const clinicId = req.session.user.role === 'admin' ? req.query.clinic_id : getStaffClinicId(req.session.user.id);
  if (!clinicId) return res.status(400).json({ error: 'Không tìm thấy phòng khám liên kết với tài khoản này.' });

  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`SELECT a.*, d.full_name as doctor_name FROM appointments a
    LEFT JOIN doctors d ON a.doctor_id=d.id
    WHERE a.clinic_id=? AND a.appointment_date=? AND a.status NOT IN ('cancelled')
    ORDER BY a.appointment_time ASC`).all(clinicId, date);

  const enriched = rows.map(a => ({
    ...a,
    commission: db.prepare('SELECT * FROM commissions WHERE appointment_id=?').get(a.id) || null
  }));
  res.json({ clinic_id: clinicId, date, appointments: enriched });
});

// POST /api/clinic-portal/appointments/:id/confirm
// Nhân viên xác nhận bệnh nhân đã đến + nhập số tiền thu
router.post('/appointments/:id/confirm', requireClinicStaff, async (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn.' });

  const clinicId = req.session.user.role === 'admin' ? appt.clinic_id : getStaffClinicId(req.session.user.id);
  if (appt.clinic_id !== clinicId) return res.status(403).json({ error: 'Lịch hẹn này không thuộc phòng khám của bạn.' });
  if (appt.status === 'cancelled') return res.status(400).json({ error: 'Lịch hẹn đã bị huỷ.' });

  const { amount_clinic, note } = req.body;
  if (!amount_clinic || amount_clinic <= 0) return res.status(400).json({ error: 'Vui lòng nhập số tiền bệnh nhân đã thanh toán.' });

  // Lấy tỷ lệ hoa hồng từ hợp đồng
  const contract = db.prepare('SELECT commission_rate FROM clinic_contracts WHERE clinic_id=? AND status=?').get(appt.clinic_id, 'active');
  const rate = contract ? contract.commission_rate : 0.20;
  const commissionAmount = Math.round(Number(amount_clinic) * rate);

  // Cập nhật trạng thái lịch hẹn
  db.prepare("UPDATE appointments SET status='attended' WHERE id=?").run(appt.id);

  // Ghi nhận hoa hồng
  const existing = db.prepare('SELECT id FROM commissions WHERE appointment_id=?').get(appt.id);
  if (existing) {
    db.prepare('UPDATE commissions SET amount_clinic=?,commission_rate=?,commission_amount=?,status=?,attended_at=datetime("now"),confirmed_by=?,note=? WHERE appointment_id=?')
      .run(amount_clinic, rate, commissionAmount, 'pending', req.session.user.id, note||'', appt.id);
  } else {
    db.prepare(`INSERT INTO commissions (appointment_id,clinic_id,amount_clinic,commission_rate,commission_amount,status,attended_at,confirmed_by,note)
                VALUES (?,?,?,?,?,'pending',datetime('now'),?,?)`)
      .run(appt.id, appt.clinic_id, amount_clinic, rate, commissionAmount, req.session.user.id, note||'');
  }

  res.json({
    message: `Đã xác nhận! Hoa hồng phát sinh: ${commissionAmount.toLocaleString('vi-VN')}đ (${(rate*100).toFixed(0)}%)`,
    commission_amount: commissionAmount,
    commission_rate: rate
  });
});

// GET /api/clinic-portal/summary — Thống kê nhanh cho nhân viên
router.get('/summary', requireClinicStaff, (req, res) => {
  const clinicId = req.session.user.role === 'admin' ? req.query.clinic_id : getStaffClinicId(req.session.user.id);
  if (!clinicId) return res.status(400).json({ error: 'Không tìm thấy phòng khám.' });
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const count = (sql, ...p) => db.prepare(sql).get(...p)?.c || 0;
  const sum   = (sql, ...p) => db.prepare(sql).get(...p)?.s || 0;

  res.json({
    today_appointments: count('SELECT COUNT(*) c FROM appointments WHERE clinic_id=? AND appointment_date=? AND status NOT IN (?,?)', clinicId, today, 'cancelled', 'attended') +
                        count('SELECT COUNT(*) c FROM appointments WHERE clinic_id=? AND appointment_date=? AND status=?', clinicId, today, 'attended'),
    today_attended:     count('SELECT COUNT(*) c FROM appointments WHERE clinic_id=? AND appointment_date=? AND status NOT IN (?)', clinicId, today, 'cancelled'),
    month_attended:     count(`SELECT COUNT(*) c FROM appointments WHERE clinic_id=? AND strftime('%Y-%m',appointment_date)=? AND status='attended'`, clinicId, month),
    month_commission:   sum(`SELECT SUM(commission_amount) s FROM commissions WHERE clinic_id=? AND strftime('%Y-%m',attended_at)=?`, clinicId, month),
    pending_commission: sum(`SELECT SUM(commission_amount) s FROM commissions WHERE clinic_id=? AND status='pending'`, clinicId),
  });
});

module.exports = router;
