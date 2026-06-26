// utils/mailer.js
// Gửi email NHẮC LỊCH thật qua SMTP (nodemailer). Nếu chưa cấu hình SMTP trong file .env,
// hệ thống sẽ tự động chuyển sang "chế độ mô phỏng": ghi log lại nội dung email vào bảng
// notifications_log và in ra console, để bạn vẫn kiểm tra được luồng nhắc lịch hoạt động đúng.
require('dotenv').config();
const nodemailer = require('nodemailer');
const { db } = require('../db/database');

let transporter = null;
const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

if (hasSmtpConfig) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function logNotification(appointmentId, channel, recipient, message, status) {
  db.prepare(`INSERT INTO notifications_log (appointment_id, channel, recipient, message, status)
              VALUES (?,?,?,?,?)`).run(appointmentId, channel, recipient, message, status);
}

async function sendAppointmentEmail({ appointmentId, to, subject, html, plainMessage }) {
  if (!hasSmtpConfig) {
    console.log('\n========== [MÔ PHỎNG GỬI EMAIL] ==========');
    console.log('Chưa cấu hình SMTP trong file .env nên email KHÔNG được gửi thật.');
    console.log('Người nhận:', to);
    console.log('Tiêu đề  :', subject);
    console.log('Nội dung :', plainMessage);
    console.log('===========================================\n');
    logNotification(appointmentId, 'email', to, plainMessage, 'simulated_not_sent');
    return { sent: false, simulated: true };
  }

  try {
    await transporter.sendMail({
      from: `"Đặt lịch khám sức khỏe" <${process.env.SMTP_USER}>`,
      to, subject, html, text: plainMessage
    });
    logNotification(appointmentId, 'email', to, plainMessage, 'sent');
    return { sent: true, simulated: false };
  } catch (err) {
    console.error('Lỗi gửi email:', err.message);
    logNotification(appointmentId, 'email', to, plainMessage, 'failed: ' + err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendAppointmentEmail, hasSmtpConfig };
