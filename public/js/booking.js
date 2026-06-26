// public/js/booking.js
const state = {
  step: 1,
  clinics: [], specialties: [], doctors: [],
  clinic_id: null, specialty_id: null, doctor_id: null, symptom: '',
  date: '', time: '',
  matchedSpecialties: []
};

const qs = new URLSearchParams(location.search);
const app = document.getElementById('booking-app');

function setStep(n) {
  state.step = n;
  document.querySelectorAll('.step-pill').forEach(p => {
    const s = Number(p.dataset.step);
    p.classList.toggle('active', s === n);
    p.classList.toggle('done', s < n);
  });
  render();
}

async function init() {
  state.clinics = await apiFetch('/clinics');
  state.specialties = await apiFetch('/specialties');
  if (qs.get('clinic_id')) state.clinic_id = qs.get('clinic_id');
  if (qs.get('doctor_id')) {
    const d = await apiFetch('/doctors/' + qs.get('doctor_id'));
    state.doctor_id = d.id; state.clinic_id = d.clinic_id; state.specialty_id = d.specialty_id;
    setStep(3); return;
  }
  setStep(state.clinic_id ? 2 : 1);
}

function render() {
  if (state.step === 1) return renderStep1();
  if (state.step === 2) return renderStep2();
  if (state.step === 3) return renderStep3();
  if (state.step === 4) return renderStep4();
}

function renderStep1() {
  app.innerHTML = `
    <h3>Chọn phòng khám gần bạn</h3>
    <div class="grid grid-3" id="clinic-cards">
      ${state.clinics.map(c => `
        <div class="option-card ${state.clinic_id===c.id?'selected':''}" data-id="${c.id}">
          <img src="${c.image}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:10px">
          <b>${c.name}</b>
          <p style="font-size:13px;margin:6px 0 0">🗺️ ${c.address}, ${c.district}</p>
        </div>`).join('')}
    </div>
    <div class="flex-between mt-24">
      <span></span>
      <button class="btn btn-primary" id="next1" ${state.clinic_id?'':'disabled'}>Tiếp tục →</button>
    </div>`;
  document.querySelectorAll('#clinic-cards .option-card').forEach(card => {
    card.addEventListener('click', () => {
      state.clinic_id = card.dataset.id;
      document.querySelectorAll('#clinic-cards .option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      document.getElementById('next1').disabled = false;
    });
  });
  document.getElementById('next1').addEventListener('click', () => setStep(2));
}

function renderStep2() {
  app.innerHTML = `
    <h3>Bạn đang gặp triệu chứng gì?</h3>
    <p class="muted">Mô tả ngắn gọn (vd: sốt, ho, đau bụng...) để hệ thống gợi ý đúng chuyên khoa. Hoặc bỏ qua và tự chọn chuyên khoa bên dưới.</p>
    <div class="form-group">
      <input type="text" id="symptom-input" placeholder="Ví dụ: sốt, ho, đau đầu..." value="${state.symptom}">
    </div>
    <button class="btn btn-ghost btn-sm" id="symptom-search">🔍 Tìm chuyên khoa phù hợp</button>
    <div id="symptom-result" class="mt-16"></div>

    <h3 class="mt-32">Hoặc chọn chuyên khoa trực tiếp</h3>
    <div class="grid grid-3" id="specialty-cards">
      ${state.specialties.map(s => `
        <div class="option-card ${state.specialty_id===s.id?'selected':''}" data-id="${s.id}">
          <b>${s.name}</b>
          <p style="font-size:13px;margin:6px 0 0">${s.description}</p>
        </div>`).join('')}
    </div>
    <div class="flex-between mt-24">
      <button class="btn btn-outline" id="back2">← Quay lại</button>
      <button class="btn btn-primary" id="next2" ${state.specialty_id?'':'disabled'}>Tiếp tục →</button>
    </div>`;

  function selectSpecialtyCard(id) {
    state.specialty_id = id;
    document.querySelectorAll('#specialty-cards .option-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
    document.getElementById('next2').disabled = false;
  }

  document.querySelectorAll('#specialty-cards .option-card').forEach(card => {
    card.addEventListener('click', () => selectSpecialtyCard(card.dataset.id));
  });

  document.getElementById('symptom-search').addEventListener('click', async () => {
    state.symptom = document.getElementById('symptom-input').value.trim();
    const resultBox = document.getElementById('symptom-result');
    if (!state.symptom) { resultBox.innerHTML = ''; return; }
    resultBox.innerHTML = '<div class="spinner"></div>';
    const { matched_specialties } = await apiFetch('/doctors?symptom=' + encodeURIComponent(state.symptom));
    if (!matched_specialties.length) {
      resultBox.innerHTML = '<div class="alert alert-info">Không tìm thấy chuyên khoa phù hợp tự động, vui lòng chọn chuyên khoa Nội tổng quát hoặc chọn thủ công bên dưới.</div>';
      return;
    }
    resultBox.innerHTML = `<div class="alert alert-success">Gợi ý chuyên khoa phù hợp với "${escapeHtml(state.symptom)}":</div>
      <div class="tag-row">${matched_specialties.map(s => `<button class="btn btn-ghost btn-sm" data-id="${s.id}">${s.name}</button>`).join('')}</div>`;
    resultBox.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', () => selectSpecialtyCard(b.dataset.id)));
  });

  document.getElementById('back2').addEventListener('click', () => setStep(1));
  document.getElementById('next2').addEventListener('click', () => setStep(3));
}

async function renderStep3() {
  app.innerHTML = '<div class="spinner"></div>';
  const { doctors } = await apiFetch(`/doctors?specialty_id=${state.specialty_id}`);
  const inClinic = doctors.filter(d => d.clinic_id === state.clinic_id);
  const list = inClinic.length ? inClinic : doctors;
  const note = inClinic.length ? '' : `<div class="alert alert-info">Phòng khám bạn chọn chưa có bác sĩ chuyên khoa này. Dưới đây là bác sĩ chuyên khoa phù hợp tại các phòng khám khác.</div>`;

  app.innerHTML = `
    <h3>Chọn bác sĩ</h3>
    ${note}
    <div class="grid grid-3" id="doctor-cards">
      ${list.map(d => `
        <div class="option-card ${state.doctor_id===d.id?'selected':''}" data-id="${d.id}" data-clinic="${d.clinic_id}">
          <div class="flex gap-12"><img src="${d.image}" style="width:48px;height:48px;border-radius:50%"><div><b>${d.full_name}</b><div class="rating">⭐ ${d.rating}</div></div></div>
          <p style="font-size:13px;margin-top:8px">${d.degree} · ${d.experience_years} năm KN<br>🏥 ${d.clinic_name}<br>💰 ${formatVND(d.consultation_fee)}</p>
        </div>`).join('') || '<p class="muted">Không có bác sĩ phù hợp.</p>'}
    </div>

    <div class="form-row mt-24">
      <div class="form-group">
        <label>Chọn ngày khám</label>
        <input type="date" id="date-input" min="${new Date().toISOString().slice(0,10)}" value="${state.date}">
      </div>
      <div class="form-group">
        <label>Chọn giờ khám</label>
        <input type="time" id="time-input" min="07:00" max="20:00" step="1800" value="${state.time}">
      </div>
    </div>
    <div id="conflict-box"></div>

    <div class="flex-between mt-24">
      <button class="btn btn-outline" id="back3">← Quay lại</button>
      <button class="btn btn-primary" id="next3">Tiếp tục →</button>
    </div>`;

  document.querySelectorAll('#doctor-cards .option-card').forEach(card => {
    card.addEventListener('click', () => {
      state.doctor_id = card.dataset.id; state.clinic_id = card.dataset.clinic;
      document.querySelectorAll('#doctor-cards .option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
  document.getElementById('back3').addEventListener('click', () => setStep(2));
  document.getElementById('next3').addEventListener('click', () => {
    state.date = document.getElementById('date-input').value;
    state.time = document.getElementById('time-input').value;
    const box = document.getElementById('conflict-box');
    if (!state.doctor_id) { box.innerHTML = '<div class="alert alert-error">Vui lòng chọn bác sĩ.</div>'; return; }
    if (!state.date || !state.time) { box.innerHTML = '<div class="alert alert-error">Vui lòng chọn ngày và giờ khám.</div>'; return; }
    setStep(4);
  });
}

function renderStep4() {
  app.innerHTML = '<div class="spinner"></div>';
  apiFetch('/auth/me').then(({ user }) => {
    app.innerHTML = `
      <h3>Xác nhận thông tin đặt lịch</h3>
      <div class="form-row">
        <div class="form-group"><label>Họ và tên</label><input id="f-name" value="${user?.full_name || ''}"></div>
        <div class="form-group"><label>Email nhận xác nhận / nhắc lịch</label><input id="f-email" type="email" value="${user?.email || ''}"></div>
      </div>
      <div class="form-group"><label>Số điện thoại</label><input id="f-phone" type="tel"></div>
      <div class="form-group"><label>Mô tả triệu chứng (không bắt buộc)</label><textarea id="f-symptom">${state.symptom}</textarea></div>

      <div class="card card-body" style="background:var(--mint-100);border:none">
        <b>Tóm tắt lịch hẹn</b>
        <p style="font-size:14px;margin-top:8px" id="summary-box">Đang tải...</p>
      </div>

      <div id="result-box" class="mt-16"></div>

      <div class="flex-between mt-24">
        <button class="btn btn-outline" id="back4">← Quay lại</button>
        <button class="btn btn-primary" id="submit4">✅ Xác nhận đặt lịch</button>
      </div>`;

    loadSummary();
    document.getElementById('back4').addEventListener('click', () => setStep(3));
    document.getElementById('submit4').addEventListener('click', submitBooking);
  });
}

async function loadSummary() {
  const clinic = await apiFetch('/clinics/' + state.clinic_id);
  const doctor = await apiFetch('/doctors/' + state.doctor_id);
  document.getElementById('summary-box').innerHTML =
    `🏥 ${clinic.name} — ${clinic.address}, ${clinic.district}<br>
     🩺 ${doctor.full_name} (${doctor.specialty_name})<br>
     📅 ${state.date} lúc ${state.time}<br>
     💰 Phí khám dự kiến: ${formatVND(doctor.consultation_fee)}`;
}

async function submitBooking() {
  const resultBox = document.getElementById('result-box');
  const payload = {
    patient_name: document.getElementById('f-name').value.trim(),
    patient_email: document.getElementById('f-email').value.trim(),
    patient_phone: document.getElementById('f-phone').value.trim(),
    clinic_id: state.clinic_id, doctor_id: state.doctor_id, specialty_id: state.specialty_id,
    symptom: document.getElementById('f-symptom').value.trim(),
    appointment_date: state.date, appointment_time: state.time
  };
  if (!payload.patient_name || !payload.patient_email) {
    resultBox.innerHTML = '<div class="alert alert-error">Vui lòng nhập họ tên và email.</div>'; return;
  }
  resultBox.innerHTML = '<div class="spinner"></div>';
  try {
    const r = await apiFetch('/appointments', { method: 'POST', body: JSON.stringify(payload) });
    resultBox.innerHTML = `<div class="alert alert-success">🎉 ${r.message} Một email xác nhận đã được gửi tới ${payload.patient_email}.
      ${r.email_status?.simulated ? '<br><i>(Lưu ý demo: SMTP chưa cấu hình nên email được mô phỏng — xem hướng dẫn cấu hình trong README để gửi email thật.)</i>' : ''}</div>
      <a href="/my-appointments.html" class="btn btn-primary mt-16">Xem lịch hẹn của tôi</a>`;
    document.getElementById('submit4').remove();
  } catch (err) {
    if (err.conflict) {
      resultBox.innerHTML = `<div class="alert alert-error">⚠️ ${err.message}</div>
        <div class="tag-row">${err.alternatives.map(a => `<button class="btn btn-ghost btn-sm alt-slot" data-date="${a.date}" data-time="${a.time}">${a.date === state.date ? a.time : a.date + ' ' + a.time}</button>`).join('')}</div>`;
      resultBox.querySelectorAll('.alt-slot').forEach(b => b.addEventListener('click', () => {
        state.date = b.dataset.date; state.time = b.dataset.time;
        loadSummary();
        resultBox.innerHTML = `<div class="alert alert-info">Đã chọn khung giờ thay thế: ${state.time} ngày ${state.date}. Vui lòng bấm "Xác nhận đặt lịch" lại.</div>`;
      }));
    } else {
      resultBox.innerHTML = `<div class="alert alert-error">${err.error || 'Có lỗi xảy ra, vui lòng thử lại.'}</div>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
