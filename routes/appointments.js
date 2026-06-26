// routes/appointments.js — NÂNG CẤP: QR Code, trạng thái nâng cao, đánh giá sau khám
const express = require('express');
const { db } = require('../db/database');
const { requireAdmin } = require('./middleware');
const { sendAppointmentEmail } = require('../utils/mailer');
const QRCode = require('qrcode');
const router = express.Router();

const SLOT_MINUTES = 30;
const DAY_START = '07:00';
const DAY_END = '20:00';

function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function toHHMM(mins) { return `${Math.floor(mins/60).toString().padStart(2,'0')}:${(mins%60).toString().padStart(2,'0')}`; }

function isDoctorBusy(doctorId, date, time, excludeId = null) {
  let sql = `SELECT id FROM appointments WHERE doctor_id=? AND appointment_date=? AND appointment_time=? AND status NOT IN ('cancelled')`;
  const params = [doctorId, date, time];
  if (excludeId) { sql += ' AND id != ?'; params.push(excludeId); }
  return !!db.prepare(sql).get(...params);
}

function suggestAlternativeSlots(doctorId, date, time, count = 5) {
  const start = toMinutes(DAY_START), end = toMinutes(DAY_END), requested = toMinutes(time);
  const booked = new Set(db.prepare(`SELECT appointment_time FROM appointments WHERE doctor_id=? AND appointment_date=? AND status NOT IN ('cancelled')`).all(doctorId, date).map(r => r.appointment_time));
  const suggestions = [];
  for (let offset = SLOT_MINUTES; offset <= (end - start); offset += SLOT_MINUTES) {
    for (const t of [toHHMM(requested + offset), toHHMM(requested - offset)]) {
      const m = toMinutes(t);
      if (m >= start && m <= end && !booked.has(t)) suggestions.push({ date, time: t });
      if (suggestions.length >= count) break;
    }
    if (suggestions.length >= count) break;
  }
  if (suggestions.length < count) {
    const nd = new Date(date); nd.setDate(nd.getDate() + 1);
    const ns = nd.toISOString().slice(0, 10);
    if (!isDoctorBusy(doctorId, ns, time)) suggestions.push({ date: ns, time });
  }
  return suggestions.slice(0, count);
}

// ─── POST /api/appointments  ── Đặt lịch + sinh QR code ───────────────────────
router.post('/', async (req, res) => {
  const { patient_name, patient_email, patient_phone, clinic_id, doctor_id, specialty_id, symptom, appointment_date, appointment_time } = req.body;
  if (!patient_name || !patient_email || !clinic_id || !doctor_id || !appointment_date || !appointment_time)
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin đặt lịch.' });

  if (isDoctorBusy(doctor_id, appointment_date, appointment_time)) {
    return res.status(409).json({
      conflict: true,
      message: 'Bác sĩ đã có lịch hẹn khác vào khung giờ này. Vui lòng chọn khung giờ thay thế:',
      alternatives: suggestAlternativeSlots(doctor_id, appointment_date, appointment_time)
    });
  }

  const userId = req.session.user ? req.session.user.id : null;
  const info = db.prepare(`INSERT INTO appointments
    (user_id,patient_name,patient_email,patient_phone,clinic_id,doctor_id,specialty_id,symptom,appointment_date,appointment_time,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,'confirmed')`)
    .run(userId, patient_name, patient_email, patient_phone||'', clinic_id, doctor_id, specialty_id||'', symptom||'', appointment_date, appointment_time);

  const appointmentId = Number(info.lastInsertRowid);
  const clinic  = db.prepare('SELECT * FROM clinics WHERE id=?').get(clinic_id);
  const doctor  = db.prepare('SELECT * FROM doctors WHERE id=?').get(doctor_id);

  // Sinh QR code chứa mã lịch hẹn để bệnh nhân xuất trình tại phòng khám
  const qrData = JSON.stringify({ appointment_id: appointmentId, patient: patient_name, date: appointment_date, time: appointment_time, clinic: clinic_id });
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });

  const plainMessage = `Xác nhận lịch khám: Bác sĩ ${doctor?.full_name} tại ${clinic?.name} — ${clinic?.address}, ${clinic?.district} lúc ${appointment_time} ngày ${appointment_date}. Mã lịch hẹn: #${appointmentId}`;
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#0f7173;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h2 style="margin:0">✅ Đặt lịch khám thành công!</h2>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e3edec;border-top:none;border-radius:0 0 12px 12px">
        <p>Xin chào <b>${patient_name}</b>,</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:10px;background:#eafbf8;border-radius:6px 0 0 0;font-weight:700">🩺 Bác sĩ</td><td style="padding:10px;background:#eafbf8">${doctor?.full_name} (${doctor?.degree||''})</td></tr>
          <tr><td style="padding:10px;font-weight:700">🏥 Phòng khám</td><td style="padding:10px">${clinic?.name}</td></tr>
          <tr><td style="padding:10px;background:#eafbf8;font-weight:700">🗺️ Địa chỉ</td><td style="padding:10px;background:#eafbf8">${clinic?.address}, ${clinic?.district}, ${clinic?.city}</td></tr>
          <tr><td style="padding:10px;font-weight:700">📅 Thời gian</td><td style="padding:10px"><b>${appointment_time} — ${appointment_date}</b></td></tr>
          <tr><td style="padding:10px;background:#eafbf8;font-weight:700">📞 Liên hệ PK</td><td style="padding:10px;background:#eafbf8">${clinic?.phone}</td></tr>
        </table>
        <div style="text-align:center;margin:24px 0;padding:20px;background:#f6faf9;border-radius:10px">
          <p style="font-weight:700;color:#0f7173">Mã QR xác nhận — xuất trình khi đến phòng khám</p>
          <img src="${qrDataUrl}" style="width:160px;height:160px">
          <p style="font-size:13px;color:#6b7d82">Mã lịch hẹn: <b>#${appointmentId}</b></p>
        </div>
        <p style="font-size:13px;color:#6b7d82">⏰ Vui lòng đến trước giờ hẹn 15 phút. Nếu cần huỷ hoặc đổi lịch, vào "Lịch hẹn của tôi" trên website.</p>
      </div>
    </div>`;

  const emailResult = await sendAppointmentEmail({ appointmentId, to: patient_email, subject: `Xác nhận lịch khám #${appointmentId} — ${appointment_date} ${appointment_time}`, html, plainMessage });

  res.status(201).json({ message: 'Đặt lịch thành công!', appointment_id: appointmentId, qr_data_url: qrDataUrl, email_status: emailResult });
});

// ─── GET /api/appointments/mine ────────────────────────────────────────────────
router.get('/mine', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Bạn cần đăng nhập' });
  const rows = db.prepare('SELECT * FROM appointments WHERE user_id=? ORDER BY appointment_date DESC, appointment_time DESC').all(req.session.user.id);
  const enriched = rows.map(a => ({
    ...a,
    clinic: db.prepare('SELECT name,address,district,city,phone FROM clinics WHERE id=?').get(a.clinic_id),
    doctor: db.prepare('SELECT full_name,degree FROM doctors WHERE id=?').get(a.doctor_id),
    review: db.prepare('SELECT * FROM reviews WHERE appointment_id=?').get(a.id) || null
  }));
  res.json(enriched);
});

// ─── POST /api/appointments/:id/review ── Đánh giá sau khám ───────────────────
router.post('/:id/review', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Bạn cần đăng nhập' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });
  if (appt.user_id !== req.session.user.id) return res.status(403).json({ error: 'Không có quyền đánh giá lịch hẹn này' });
  if (!['attended','commission_due','commission_paid'].includes(appt.status)) return res.status(400).json({ error: 'Chỉ có thể đánh giá sau khi đã đến khám.' });
  const existing = db.prepare('SELECT id FROM reviews WHERE appointment_id=?').get(appt.id);
  if (existing) return res.status(409).json({ error: 'Bạn đã đánh giá lịch hẹn này rồi.' });

  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Điểm đánh giá từ 1–5.' });
  db.prepare('INSERT INTO reviews (appointment_id,user_id,doctor_id,clinic_id,rating,comment) VALUES (?,?,?,?,?,?)')
    .run(appt.id, req.session.user.id, appt.doctor_id, appt.clinic_id, rating, comment||'');

  // Cập nhật rating trung bình bác sĩ
  const avg = db.prepare('SELECT AVG(rating) as avg FROM reviews WHERE doctor_id=?').get(appt.doctor_id);
  db.prepare('UPDATE doctors SET rating=? WHERE id=?').run(Math.round(avg.avg * 10) / 10, appt.doctor_id);
  res.json({ message: 'Cảm ơn bạn đã đánh giá!' });
});

// ─── GET /api/appointments/reviews ── Đánh giá công khai ──────────────────────
router.get('/reviews', (req, res) => {
  const { doctor_id, clinic_id } = req.query;
  let sql = `SELECT r.*, u.full_name as reviewer_name, d.full_name as doctor_name, c.name as clinic_name
             FROM reviews r
             LEFT JOIN users u ON r.user_id=u.id
             LEFT JOIN doctors d ON r.doctor_id=d.id
             LEFT JOIN clinics c ON r.clinic_id=c.id`;
  const conds = [], params = [];
  if (doctor_id) { conds.push('r.doctor_id=?'); params.push(doctor_id); }
  if (clinic_id) { conds.push('r.clinic_id=?'); params.push(clinic_id); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY r.created_at DESC LIMIT 50';
  res.json(db.prepare(sql).all(...params));
});

// ─── DELETE /api/appointments/:id ── Huỷ lịch ─────────────────────────────────
router.delete('/:id', (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });
  const isOwner = req.session.user && req.session.user.id === appt.user_id;
  const isAdmin = req.session.user && req.session.user.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Không có quyền huỷ lịch hẹn này' });
  db.prepare("UPDATE appointments SET status='cancelled' WHERE id=?").run(req.params.id);
  res.json({ message: 'Đã huỷ lịch hẹn' });
});

// ─── ADMIN: GET all appointments ───────────────────────────────────────────────
router.get('/', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC').all());
});

module.exports = router;
