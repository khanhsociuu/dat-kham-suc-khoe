// routes/chatbot.js
// Chatbot CSKH tự động: trả lời dựa trên từ khoá khi chưa có nhân viên trực tuyến.
// Đây là rule-based matching trên bảng chatbot_faq (đọc từ data/chatbot_faq.csv).
const express = require('express');
const { db } = require('../db/database');
const router = express.Router();

function findBestAnswer(message) {
  const text = (message || '').toLowerCase();
  const faqs = db.prepare('SELECT * FROM chatbot_faq').all();
  let best = null, bestScore = 0;
  for (const f of faqs) {
    const keywords = (f.keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    let score = 0;
    for (const k of keywords) { if (k && text.includes(k)) score++; }
    if (score > bestScore) { bestScore = score; best = f; }
  }
  if (best) return best.answer;
  return 'Xin lỗi, hiện chưa có nhân viên trực tuyến để trả lời câu hỏi này. Bạn vui lòng để lại số điện thoại/email, đội ngũ tư vấn sẽ liên hệ lại sớm nhất, hoặc gọi hotline 1900-0000 (giờ hành chính). Bạn cũng có thể thử hỏi về: cách đặt lịch, bảng giá, địa chỉ phòng khám, danh sách bác sĩ, hoặc triệu chứng bạn đang gặp phải.';
}

router.post('/', (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Vui lòng nhập nội dung câu hỏi.' });
  const answer = findBestAnswer(message);
  res.json({ answer });
});

module.exports = router;
