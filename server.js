// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const { startReminderScheduler } = require('./utils/reminderScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dat-kham-suc-khoe-secret-key-doi-trong-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 ngày
}));

// ---- API ROUTES ----
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/clinics',       require('./routes/clinics'));
app.use('/api/facilities',    require('./routes/facilities'));
app.use('/api/doctors',       require('./routes/doctors'));
app.use('/api/specialties',   require('./routes/specialties'));
app.use('/api/pricing',       require('./routes/pricing'));
app.use('/api/articles',      require('./routes/articles'));
app.use('/api/appointments',  require('./routes/appointments'));
app.use('/api/chatbot',       require('./routes/chatbot'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/clinic-portal', require('./routes/clinic-portal'));
app.use('/api/commissions',   require('./routes/commissions'));

// ---- FRONTEND (static files) ----
app.use(express.static(path.join(__dirname, 'public')));

app.get('/healthz', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`👤 Tài khoản admin mặc định: admin@suckhoe.vn / admin123\n`);
  startReminderScheduler();
});
