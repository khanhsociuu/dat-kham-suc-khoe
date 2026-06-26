// public/js/admin.js
let currentTab = 'clinics';
let specialtiesCache = [], clinicsCache = [];

const ENTITY = {
  clinics: {
    endpoint: '/clinics', idField: 'id',
    columns: ['id', 'name', 'district', 'city', 'phone'],
    fields: [
      { name: 'id', label: 'Mã phòng khám (vd: CL07)', type: 'text', requiredOnCreate: true },
      { name: 'name', label: 'Tên phòng khám', type: 'text' },
      { name: 'address', label: 'Địa chỉ', type: 'text' },
      { name: 'district', label: 'Quận/Huyện', type: 'text' },
      { name: 'city', label: 'Tỉnh/Thành phố', type: 'text' },
      { name: 'lat', label: 'Vĩ độ (lat)', type: 'number', step: 'any' },
      { name: 'lng', label: 'Kinh độ (lng)', type: 'number', step: 'any' },
      { name: 'phone', label: 'Số điện thoại', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'opening_hours', label: 'Giờ mở cửa', type: 'text' },
      { name: 'description', label: 'Mô tả', type: 'textarea' },
      { name: 'image', label: 'URL hình ảnh', type: 'text' },
    ]
  },
  doctors: {
    endpoint: '/doctors', idField: 'id',
    columns: ['id', 'full_name', 'specialty_id', 'clinic_id', 'consultation_fee'],
    fields: [
      { name: 'id', label: 'Mã bác sĩ (vd: DR15)', type: 'text', requiredOnCreate: true },
      { name: 'full_name', label: 'Họ tên bác sĩ', type: 'text' },
      { name: 'specialty_id', label: 'Chuyên khoa', type: 'select-specialty' },
      { name: 'clinic_id', label: 'Phòng khám', type: 'select-clinic' },
      { name: 'degree', label: 'Học hàm/học vị', type: 'text' },
      { name: 'experience_years', label: 'Số năm kinh nghiệm', type: 'number' },
      { name: 'education', label: 'Nơi đào tạo', type: 'text' },
      { name: 'gender', label: 'Giới tính', type: 'text' },
      { name: 'schedule', label: 'Lịch làm việc', type: 'text' },
      { name: 'consultation_fee', label: 'Phí khám (VNĐ)', type: 'number' },
      { name: 'rating', label: 'Đánh giá (0-5)', type: 'number', step: '0.1' },
      { name: 'bio', label: 'Giới thiệu', type: 'textarea' },
    ]
  },
  specialties: {
    endpoint: '/specialties', idField: 'id',
    columns: ['id', 'name', 'keywords'],
    fields: [
      { name: 'id', label: 'Mã chuyên khoa (vd: SP10)', type: 'text', requiredOnCreate: true },
      { name: 'name', label: 'Tên chuyên khoa', type: 'text' },
      { name: 'description', label: 'Mô tả', type: 'textarea' },
      { name: 'keywords', label: 'Từ khoá triệu chứng (cách nhau bởi dấu phẩy)', type: 'textarea' },
    ]
  },
  pricing: {
    endpoint: '/pricing', idField: 'id',
    columns: ['id', 'category', 'service_name', 'price', 'unit'],
    fields: [
      { name: 'id', label: 'Mã dịch vụ (vd: SV16)', type: 'text', requiredOnCreate: true },
      { name: 'category', label: 'Danh mục', type: 'text' },
      { name: 'service_name', label: 'Tên dịch vụ', type: 'text' },
      { name: 'price', label: 'Giá (VNĐ)', type: 'number' },
      { name: 'unit', label: 'Đơn vị', type: 'text' },
      { name: 'description', label: 'Mô tả', type: 'textarea' },
    ]
  },
  articles: {
    endpoint: '/articles', idField: 'id',
    columns: ['id', 'title', 'category'],
    fields: [
      { name: 'id', label: 'Mã bài viết (vd: AR09)', type: 'text', requiredOnCreate: true },
      { name: 'title', label: 'Tiêu đề', type: 'text' },
      { name: 'category', label: 'Chủ đề', type: 'text' },
      { name: 'summary', label: 'Tóm tắt', type: 'textarea' },
      { name: 'content', label: 'Nội dung', type: 'textarea' },
      { name: 'image', label: 'URL hình ảnh', type: 'text' },
    ]
  },
  facilities: {
    endpoint: '/facilities', idField: 'id',
    columns: ['id', 'icon', 'title', 'sort_order'],
    fields: [
      { name: 'id', label: 'Mã (vd: FC07)', type: 'text', requiredOnCreate: true },
      { name: 'title', label: 'Tên khu vực / thiết bị', type: 'text' },
      { name: 'icon', label: 'Icon (emoji, vd: 🏥)', type: 'text' },
      { name: 'description', label: 'Mô tả chi tiết', type: 'textarea' },
      { name: 'image', label: 'URL hình ảnh minh hoạ', type: 'text' },
      { name: 'sort_order', label: 'Thứ tự hiển thị (số nhỏ = lên trước)', type: 'number' },
    ]
  },
  appointments: {
    endpoint: '/appointments', idField: 'id', readOnly: true,
    columns: ['id', 'patient_name', 'patient_email', 'doctor_id', 'appointment_date', 'appointment_time', 'status'],
  },
  users: {
    endpoint: '/admin/users', idField: 'id', readOnly: true,
    columns: ['id', 'full_name', 'email', 'phone', 'role'],
  }
};

async function ensureCaches() {
  if (!specialtiesCache.length) specialtiesCache = await apiFetch('/specialties');
  if (!clinicsCache.length) clinicsCache = await apiFetch('/clinics');
}

async function guard() {
  const { user } = await apiFetch('/auth/me');
  if (!user || user.role !== 'admin') {
    document.getElementById('guard-msg').innerHTML = `<div class="alert alert-error">Bạn cần đăng nhập bằng tài khoản admin để truy cập trang này. <a href="/login.html">Đăng nhập</a></div>`;
    document.querySelector('.tabs').style.display = 'none';
    document.getElementById('add-btn').style.display = 'none';
    return false;
  }
  return true;
}

async function loadStats() {
  try {
    const s = await apiFetch('/admin/stats');
    document.getElementById('stats-row').innerHTML = `
      <div class="card card-body center"><b style="font-size:26px;color:var(--teal-700)">${s.clinics}</b><div class="muted">Phòng khám</div></div>
      <div class="card card-body center"><b style="font-size:26px;color:var(--teal-700)">${s.doctors}</b><div class="muted">Bác sĩ</div></div>
      <div class="card card-body center"><b style="font-size:26px;color:var(--teal-700)">${s.appointments}</b><div class="muted">Lịch hẹn (${s.appointments_confirmed} xác nhận)</div></div>
      <div class="card card-body center"><b style="font-size:26px;color:var(--teal-700)">${s.users}</b><div class="muted">Bệnh nhân đăng ký</div></div>`;
  } catch (e) {}
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('add-btn').style.display = ENTITY[tab].readOnly ? 'none' : 'inline-flex';
  loadTable();
}

async function loadTable() {
  await ensureCaches();
  const cfg = ENTITY[currentTab];
  document.getElementById('table-head').innerHTML = `<tr>${cfg.columns.map(c => `<th>${c}</th>`).join('')}<th>Thao tác</th></tr>`;
  document.getElementById('table-body').innerHTML = `<tr><td colspan="${cfg.columns.length+1}"><div class="spinner"></div></td></tr>`;

  let rows = await apiFetch(cfg.endpoint);
  if (currentTab === 'doctors') rows = rows.doctors;

  if (!rows.length) {
    document.getElementById('table-body').innerHTML = `<tr><td colspan="${cfg.columns.length+1}" class="muted center">Chưa có dữ liệu.</td></tr>`;
    return;
  }

  document.getElementById('table-body').innerHTML = rows.map(r => `
    <tr>
      ${cfg.columns.map(c => `<td>${formatCell(c, r[c])}</td>`).join('')}
      <td class="flex gap-8">
        ${!cfg.readOnly ? `<button class="btn btn-ghost btn-sm edit-btn" data-id="${r[cfg.idField]}">Sửa</button>` : ''}
        ${currentTab === 'appointments' && r.status === 'confirmed' ? `<button class="btn btn-outline btn-sm cancel-appt" data-id="${r.id}">Huỷ</button>` : ''}
        <button class="btn btn-danger btn-sm del-btn" data-id="${r[cfg.idField]}">Xoá</button>
      </td>
    </tr>`).join('');

  document.getElementById('table-body').querySelectorAll('.edit-btn').forEach(b =>
    b.addEventListener('click', () => openModal('edit', rows.find(r => String(r[cfg.idField]) === b.dataset.id))));
  document.getElementById('table-body').querySelectorAll('.del-btn').forEach(b =>
    b.addEventListener('click', () => deleteRow(b.dataset.id)));
  document.getElementById('table-body').querySelectorAll('.cancel-appt').forEach(b =>
    b.addEventListener('click', async () => { await apiFetch('/appointments/' + b.dataset.id, { method: 'DELETE' }); loadTable(); }));
}

function formatCell(col, val) {
  if (col === 'price' || col === 'consultation_fee') return formatVND(val);
  if (col === 'status') return val === 'confirmed' ? '✅ Xác nhận' : '❌ Đã huỷ';
  if (val === null || val === undefined) return '';
  return String(val).length > 60 ? String(val).slice(0, 60) + '…' : val;
}

async function deleteRow(id) {
  if (!confirm('Bạn chắc chắn muốn xoá mục này? Hành động không thể hoàn tác.')) return;
  const cfg = ENTITY[currentTab];
  const endpoint = currentTab === 'users' ? `/admin/users/${id}` : `${cfg.endpoint}/${id}`;
  try {
    await apiFetch(endpoint, { method: 'DELETE' });
    loadTable(); loadStats();
  } catch (err) { alert(err.error || 'Không thể xoá.'); }
}

async function openModal(mode, data) {
  await ensureCaches();
  const cfg = ENTITY[currentTab];
  document.getElementById('modal-title').textContent = mode === 'edit' ? 'Chỉnh sửa' : 'Thêm mới';
  const form = document.getElementById('modal-form');
  form.innerHTML = cfg.fields.map(f => {
    const value = data ? (data[f.name] ?? '') : '';
    const disabled = (mode === 'edit' && f.name === cfg.idField) ? 'disabled' : '';
    if (f.type === 'textarea') return `<div class="form-group"><label>${f.label}</label><textarea name="${f.name}" ${disabled}>${value}</textarea></div>`;
    if (f.type === 'select-specialty') return `<div class="form-group"><label>${f.label}</label><select name="${f.name}">${specialtiesCache.map(s => `<option value="${s.id}" ${s.id===value?'selected':''}>${s.name}</option>`).join('')}</select></div>`;
    if (f.type === 'select-clinic') return `<div class="form-group"><label>${f.label}</label><select name="${f.name}">${clinicsCache.map(c => `<option value="${c.id}" ${c.id===value?'selected':''}>${c.name}</option>`).join('')}</select></div>`;
    return `<div class="form-group"><label>${f.label}</label><input type="${f.type}" ${f.step?`step="${f.step}"`:''} name="${f.name}" value="${value}" ${disabled}></div>`;
  }).join('') + `<button class="btn btn-primary btn-block mt-8" type="submit">${mode === 'edit' ? 'Lưu thay đổi' : 'Thêm mới'}</button>`;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const payload = {};
    new FormData(form).forEach((v, k) => payload[k] = v);
    if (mode === 'edit') payload[cfg.idField] = data[cfg.idField];
    try {
      if (mode === 'edit') await apiFetch(`${cfg.endpoint}/${data[cfg.idField]}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await apiFetch(cfg.endpoint, { method: 'POST', body: JSON.stringify(payload) });
      closeModal(); loadTable(); loadStats();
    } catch (err) { alert(err.error || 'Có lỗi xảy ra.'); }
  };
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') closeModal(); });
document.getElementById('add-btn').addEventListener('click', () => openModal('create', null));
document.querySelectorAll('#admin-tabs .tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

(async () => {
  const ok = await guard();
  if (!ok) return;
  loadStats();
  switchTab('clinics');
})();
