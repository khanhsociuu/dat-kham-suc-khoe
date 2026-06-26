// routes/commissions.js
// Quản lý hoa hồng: danh sách, tổng hợp tháng, đánh dấu đã thanh toán
const express = require('express');
const { db } = require('../db/database');
const { requireAdmin } = require('./middleware');
const router = express.Router();

// GET /api/commissions?clinic_id=&month=2026-06&status=pending
router.get('/', requireAdmin, (req, res) => {
  const { clinic_id, month, status } = req.query;
  let sql = `SELECT c.*, a.patient_name, a.appointment_date, a.appointment_time,
             cl.name as clinic_name, d.full_name as doctor_name
             FROM commissions c
             LEFT JOIN appointments a ON c.appointment_id=a.id
             LEFT JOIN clinics cl ON c.clinic_id=cl.id
             LEFT JOIN doctors d ON a.doctor_id=d.id WHERE 1=1`;
  const params = [];
  if (clinic_id) { sql += ' AND c.clinic_id=?'; params.push(clinic_id); }
  if (month)     { sql += ` AND strftime('%Y-%m',c.attended_at)=?`; params.push(month); }
  if (status)    { sql += ' AND c.status=?'; params.push(status); }
  sql += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/commissions/summary — Tổng quan hoa hồng toàn hệ thống
router.get('/summary', requireAdmin, (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const clinics = db.prepare('SELECT * FROM clinics').all();
  const summary = clinics.map(cl => {
    const row = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(commission_amount),0) as total
                            FROM commissions WHERE clinic_id=? AND strftime('%Y-%m',attended_at)=?`).get(cl.id, month);
    const pending = db.prepare(`SELECT COALESCE(SUM(commission_amount),0) as s FROM commissions WHERE clinic_id=? AND status='pending'`).get(cl.id);
    const contract = db.prepare('SELECT commission_rate FROM clinic_contracts WHERE clinic_id=?').get(cl.id);
    return {
      clinic_id: cl.id, clinic_name: cl.name,
      commission_rate: contract ? (contract.commission_rate * 100).toFixed(0) + '%' : 'N/A',
      month_count: row.cnt, month_total: row.total,
      pending_total: pending.s
    };
  });
  const totalMonth  = summary.reduce((s, r) => s + r.month_total, 0);
  const totalPending = summary.reduce((s, r) => s + r.pending_total, 0);
  res.json({ month, summary, total_month: totalMonth, total_pending: totalPending });
});

// PUT /api/commissions/:id/paid — Đánh dấu đã thanh toán hoa hồng
router.put('/:id/paid', requireAdmin, (req, res) => {
  db.prepare(`UPDATE commissions SET status='paid', paid_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json({ message: 'Đã đánh dấu thanh toán hoa hồng.' });
});

// POST /api/commissions/bulk-paid — Thanh toán hàng loạt theo clinic + tháng
router.post('/bulk-paid', requireAdmin, (req, res) => {
  const { clinic_id, month } = req.body;
  if (!clinic_id || !month) return res.status(400).json({ error: 'Thiếu clinic_id hoặc month' });
  const info = db.prepare(`UPDATE commissions SET status='paid', paid_at=datetime('now')
                            WHERE clinic_id=? AND strftime('%Y-%m',attended_at)=? AND status='pending'`).run(clinic_id, month);
  res.json({ message: `Đã thanh toán ${info.changes} khoản hoa hồng cho phòng khám trong tháng ${month}.`, count: info.changes });
});

// GET /api/commissions/contracts — Danh sách hợp đồng
router.get('/contracts', requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT cc.*, cl.name as clinic_name, cl.address, cl.phone FROM clinic_contracts cc
                            LEFT JOIN clinics cl ON cc.clinic_id=cl.id ORDER BY cc.created_at DESC`).all();
  res.json(rows);
});

// POST /api/commissions/contracts — Thêm/cập nhật hợp đồng
router.post('/contracts', requireAdmin, (req, res) => {
  const { clinic_id, commission_rate, contract_start, contract_end, status, contact_person, contact_phone, bank_account, bank_name, note } = req.body;
  if (!clinic_id) return res.status(400).json({ error: 'Thiếu clinic_id' });
  const existing = db.prepare('SELECT id FROM clinic_contracts WHERE clinic_id=?').get(clinic_id);
  if (existing) {
    db.prepare(`UPDATE clinic_contracts SET commission_rate=?,contract_start=?,contract_end=?,status=?,contact_person=?,contact_phone=?,bank_account=?,bank_name=?,note=? WHERE clinic_id=?`)
      .run(commission_rate, contract_start, contract_end, status||'active', contact_person, contact_phone, bank_account, bank_name, note, clinic_id);
    return res.json({ message: 'Đã cập nhật hợp đồng.' });
  }
  db.prepare(`INSERT INTO clinic_contracts (clinic_id,commission_rate,contract_start,contract_end,status,contact_person,contact_phone,bank_account,bank_name,note)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(clinic_id, commission_rate||0.20, contract_start, contract_end, status||'active', contact_person, contact_phone, bank_account, bank_name, note);
  res.status(201).json({ message: 'Đã tạo hợp đồng mới.' });
});

// PUT /api/commissions/contracts/:clinic_id
router.put('/contracts/:clinic_id', requireAdmin, (req, res) => {
  const { commission_rate, contract_start, contract_end, status, contact_person, contact_phone, bank_account, bank_name, note } = req.body;
  db.prepare(`UPDATE clinic_contracts SET commission_rate=?,contract_start=?,contract_end=?,status=?,contact_person=?,contact_phone=?,bank_account=?,bank_name=?,note=? WHERE clinic_id=?`)
    .run(commission_rate, contract_start, contract_end, status, contact_person, contact_phone, bank_account, bank_name, note, req.params.clinic_id);
  res.json({ message: 'Đã cập nhật hợp đồng.' });
});

module.exports = router;
