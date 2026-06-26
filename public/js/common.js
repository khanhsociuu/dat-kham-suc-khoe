// public/js/common.js
const API = '/api';

async function apiFetch(url, options = {}) {
  const res = await fetch(API + url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

function formatVND(n) {
  if (n === null || n === undefined) return '';
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

const NAV_LINKS = [
  { href: '/index.html',       label: 'Trang chủ' },
  { href: '/clinics.html',     label: 'Phòng khám' },
  { href: '/doctors.html',     label: 'Bác sĩ' },
  { href: '/booking.html',     label: '📅 Đặt lịch' },
  { href: '/pricing.html',     label: 'Bảng giá' },
  { href: '/health-guide.html',label: 'Cẩm nang' },
  { href: '/facilities.html',  label: 'Cơ sở vật chất' },
];

async function renderHeader() {
  const mount = document.getElementById('app-header');
  if (!mount) return;
  const path = location.pathname.split('/').pop() || 'index.html';

  let user = null;
  try { const r = await apiFetch('/auth/me'); user = r.user; } catch (e) {}

  const linksHtml = NAV_LINKS.map(l =>
    `<a href="${l.href}" class="${path === l.href.replace('/', '') ? 'active' : ''}">${l.label}</a>`
  ).join('');

  let actionsHtml;
  if (user) {
    actionsHtml = `
      <a href="/my-appointments.html" class="user-chip">👤 ${user.full_name.split(' ').slice(-1)}</a>
      ${user.role === 'admin' ? `<a href="/admin.html" class="btn btn-ghost btn-sm">Quản trị</a><a href="/commission-dashboard.html" class="btn btn-ghost btn-sm" style="color:var(--coral-600)">💰 Hoa hồng</a>` : ''}
      ${user.role === 'clinic_staff' ? `<a href="/clinic-portal.html" class="btn btn-ghost btn-sm">🏥 Cổng PK</a>` : ''}
      <button class="btn btn-outline btn-sm" id="logout-btn">Đăng xuất</button>`;
  } else {
    actionsHtml = `
      <a href="/login.html" class="btn btn-ghost btn-sm">Đăng nhập</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Đăng ký</a>`;
  }

  mount.innerHTML = `
    <header class="site-header">
      <div class="nav-wrap">
        <a href="/index.html" class="brand"><span class="brand-mark">⚕</span> SứcKhỏe<span style="color:var(--coral-500)">Online</span></a>
        <nav class="nav-links" id="nav-links">${linksHtml}</nav>
        <div class="nav-actions">
          ${actionsHtml}
          <button class="nav-toggle" id="nav-toggle">☰</button>
        </div>
      </div>
    </header>`;

  document.getElementById('nav-toggle')?.addEventListener('click', () => {
    document.getElementById('nav-links').classList.toggle('open');
  });
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    location.href = '/index.html';
  });

  return user;
}

function renderFooter() {
  const mount = document.getElementById('app-footer');
  if (!mount) return;
  mount.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <h4 style="font-family:var(--font-display);font-size:18px;">⚕ SứcKhỏeOnline</h4>
          <p style="color:#b7d3d1;font-size:14px;max-width:280px;">Nền tảng đặt lịch khám sức khỏe trực tuyến — tìm phòng khám gần nhà, chọn đúng chuyên khoa và bác sĩ phù hợp chỉ trong vài bước.</p>
        </div>
        <div><h4>Khám phá</h4>
          <a href="/clinics.html">Phòng khám</a><a href="/doctors.html">Đội ngũ bác sĩ</a><a href="/pricing.html">Bảng giá dịch vụ</a><a href="/health-guide.html">Cẩm nang sức khỏe</a>
        </div>
        <div><h4>Hỗ trợ</h4>
          <a href="/booking.html">Đặt lịch khám</a><a href="/my-appointments.html">Lịch hẹn của tôi</a><a href="#" id="footer-chat-link">Hỏi trợ lý ảo</a>
        </div>
        <div><h4>Liên hệ</h4>
          <a href="tel:19000000">Hotline: 1900-0000</a><a href="mailto:hotro@suckhoeonline.vn">hotro@suckhoeonline.vn</a><a href="#">Hà Nội · TP. Hồ Chí Minh</a>
        </div>
      </div>
      <div class="container footer-bottom">© 2026 SứcKhỏeOnline — Đồ án môn Công nghệ phần mềm, Khoa CNTT, Đại học Đại Nam.</div>
    </footer>`;
  document.getElementById('footer-chat-link')?.addEventListener('click', (e) => {
    e.preventDefault(); document.getElementById('chat-panel')?.classList.add('open');
  });
}

// ---------------- Chatbot widget ----------------
function renderChatbot() {
  const mount = document.getElementById('chatbot-widget');
  if (!mount) return;
  mount.innerHTML = `
    <div class="chat-panel" id="chat-panel">
      <div class="chat-head">
        <b>Trợ lý CSKH tự động</b>
        <span>Phản hồi ngay khi chưa có nhân viên trực tuyến</span>
      </div>
      <div class="chat-body" id="chat-body">
        <div class="chat-msg bot">Xin chào! 👋 Tôi là trợ lý ảo. Bạn cần hỗ trợ gì — đặt lịch, tra cứu bảng giá, tìm phòng khám, hay tư vấn triệu chứng?</div>
      </div>
      <form class="chat-input" id="chat-form">
        <input type="text" id="chat-text" placeholder="Nhập câu hỏi của bạn..." autocomplete="off" />
        <button type="submit">➤</button>
      </form>
    </div>
    <button class="chat-fab" id="chat-fab" title="Hỗ trợ trực tuyến">💬</button>
  `;
  const panel = document.getElementById('chat-panel');
  document.getElementById('chat-fab').addEventListener('click', () => panel.classList.toggle('open'));

  document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-text');
    const msg = input.value.trim();
    if (!msg) return;
    const body = document.getElementById('chat-body');
    body.insertAdjacentHTML('beforeend', `<div class="chat-msg user">${escapeHtml(msg)}</div>`);
    input.value = '';
    body.scrollTop = body.scrollHeight;
    body.insertAdjacentHTML('beforeend', `<div class="chat-msg bot" id="typing">Đang trả lời...</div>`);
    body.scrollTop = body.scrollHeight;
    try {
      const r = await apiFetch('/chatbot', { method: 'POST', body: JSON.stringify({ message: msg }) });
      document.getElementById('typing').outerHTML = `<div class="chat-msg bot">${escapeHtml(r.answer)}</div>`;
    } catch (err) {
      document.getElementById('typing').outerHTML = `<div class="chat-msg bot">Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.</div>`;
    }
    body.scrollTop = body.scrollHeight;
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
  renderChatbot();
});
