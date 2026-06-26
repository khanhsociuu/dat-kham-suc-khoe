// utils/reminderScheduler.js
// Tự động chạy nền: mỗi giờ kiểm tra các lịch hẹn diễn ra trong vòng 24h tới
// và CHƯA được nhắc (reminder_sent = 0) -> gửi email nhắc lịch thật (hoặc mô phỏng nếu chưa cấu hình SMTP)
const cron = require('node-cron');
const { db } = require('../db/database');
const { sendAppointmentEmail } = require('./mailer');

async function runReminderCheck() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = db.prepare(`SELECT * FROM appointments WHERE status='confirmed' AND reminder_sent=0`).all();

  for (const appt of upcoming) {
    const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}:00`);
    if (apptDateTime >= now && apptDateTime <= in24h) {
      const clinic = db.prepare('SELECT * FROM clinics WHERE id=?').get(appt.clinic_id);
      const doctor = db.prepare('SELECT * FROM doctors WHERE id=?').get(appt.doctor_id);
      const plainMessage = `Nhắc lịch: Bạn có lịch khám với ${doctor?.full_name} tại ${clinic?.name} (${clinic?.address}) vào lúc ${appt.appointment_time} ngày ${appt.appointment_date}. Vui lòng đến đúng giờ.`;
      const html = `<p><b>Nhắc lịch khám sắp tới</b></p><p>${plainMessage}</p>`;
      await sendAppointmentEmail({
        appointmentId: appt.id, to: appt.patient_email,
        subject: 'Nhắc lịch khám sức khỏe sắp tới', html, plainMessage
      });
      db.prepare('UPDATE appointments SET reminder_sent=1 WHERE id=?').run(appt.id);
      console.log(`⏰ Đã gửi nhắc lịch cho lịch hẹn #${appt.id} (${appt.patient_email})`);
    }
  }
}

function startReminderScheduler() {
  // Chạy mỗi giờ (phút 0). Có thể đổi tần suất theo nhu cầu thực tế.
  cron.schedule('0 * * * *', () => {
    runReminderCheck().catch(err => console.error('Lỗi khi chạy nhắc lịch:', err));
  });
  console.log('🔔 Bộ nhắc lịch tự động đã được khởi động (kiểm tra mỗi giờ).');
}

module.exports = { startReminderScheduler, runReminderCheck };
