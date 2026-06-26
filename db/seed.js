// db/seed.js
// Đọc dữ liệu từ các file CSV trong /data và nạp vào database.sqlite
// Chạy: npm run seed   (chỉ cần chạy 1 lần đầu, hoặc khi muốn reset dữ liệu mẫu)
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const bcrypt = require('bcryptjs');
const { db } = require('./database');

function readCsv(file) {
  const content = fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function upsert(table, idCol, row) {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(',');
  const updates = cols.filter(c => c !== idCol).map(c => `${c}=excluded.${c}`).join(',');
  const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})
               ON CONFLICT(${idCol}) DO UPDATE SET ${updates}`;
  db.prepare(sql).run(...cols.map(c => row[c]));
}

function seedClinics() {
  const rows = readCsv('clinics.csv');
  for (const r of rows) {
    upsert('clinics', 'id', {
      id: r.clinic_id, name: r.name, address: r.address, district: r.district,
      city: r.city, lat: parseFloat(r.lat), lng: parseFloat(r.lng), phone: r.phone,
      email: r.email, opening_hours: r.opening_hours, description: r.description, image: r.image
    });
  }
  console.log(`✔ Đã nạp ${rows.length} phòng khám`);
}

function seedSpecialties() {
  const rows = readCsv('specialties.csv');
  for (const r of rows) {
    upsert('specialties', 'id', {
      id: r.specialty_id, name: r.name, description: r.description, keywords: r.keywords
    });
  }
  console.log(`✔ Đã nạp ${rows.length} chuyên khoa`);
}

function seedDoctors() {
  const rows = readCsv('doctors.csv');
  for (const r of rows) {
    upsert('doctors', 'id', {
      id: r.doctor_id, full_name: r.full_name, specialty_id: r.specialty_id,
      clinic_id: r.clinic_id, degree: r.degree, experience_years: parseInt(r.experience_years || 0),
      education: r.education, bio: r.bio, gender: r.gender, schedule: r.schedule,
      consultation_fee: parseInt(r.consultation_fee || 0), rating: parseFloat(r.rating || 0),
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(r.full_name)}&background=0D8ABC&color=fff&size=256`
    });
  }
  console.log(`✔ Đã nạp ${rows.length} bác sĩ`);
}

function seedPricing() {
  const rows = readCsv('pricing.csv');
  for (const r of rows) {
    upsert('pricing', 'id', {
      id: r.service_id, category: r.category, service_name: r.service_name,
      price: parseInt(r.price || 0), unit: r.unit, description: r.description
    });
  }
  console.log(`✔ Đã nạp ${rows.length} dịch vụ / bảng giá`);
}

function seedArticles() {
  const rows = readCsv('articles.csv');
  for (const r of rows) {
    upsert('articles', 'id', {
      id: r.article_id, title: r.title, category: r.category,
      summary: r.summary, content: r.content, image: r.image
    });
  }
  console.log(`✔ Đã nạp ${rows.length} bài viết cẩm nang sức khỏe`);
}

function seedFaq() {
  const rows = readCsv('chatbot_faq.csv');
  for (const r of rows) {
    upsert('chatbot_faq', 'id', { id: r.faq_id, keywords: r.keywords, answer: r.answer });
  }
  console.log(`✔ Đã nạp ${rows.length} câu hỏi thường gặp cho chatbot`);
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@suckhoe.vn');
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (full_name, email, phone, address, password_hash, role)
                VALUES (?,?,?,?,?,?)`)
      .run('Quản trị viên', 'admin@suckhoe.vn', '0900000000', 'Hà Nội', hash, 'admin');
    console.log('✔ Đã tạo tài khoản admin mặc định: admin@suckhoe.vn / admin123');
  } else {
    console.log('ℹ Tài khoản admin đã tồn tại, bỏ qua.');
  }
}

function seedFacilities() {
  const rows = readCsv('facilities.csv');
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    upsert('facilities', 'id', {
      id: r.facility_id,
      title: r.title,
      icon: r.icon,
      description: r.description,
      image: r.image,
      sort_order: i + 1
    });
  }
  console.log(`✔ Đã nạp ${rows.length} cơ sở vật chất`);
}

function seedContracts() {
  const clinics = db.prepare('SELECT id FROM clinics').all();
  const contracts = [
    { clinic_id: 'CL01', rate: 0.20, contact: 'Nguyễn Văn Minh', phone: '0912345678', bank: '1234567890', bank_name: 'Vietcombank', start: '2026-01-01' },
    { clinic_id: 'CL02', rate: 0.20, contact: 'Trần Thị Hoa', phone: '0923456789', bank: '0987654321', bank_name: 'Techcombank', start: '2026-01-01' },
    { clinic_id: 'CL03', rate: 0.18, contact: 'Lê Văn Phú', phone: '0934567890', bank: '1122334455', bank_name: 'BIDV', start: '2026-02-01' },
    { clinic_id: 'CL04', rate: 0.20, contact: 'Phạm Thị Lan', phone: '0945678901', bank: '5566778899', bank_name: 'MB Bank', start: '2026-01-15' },
    { clinic_id: 'CL05', rate: 0.15, contact: 'Đỗ Văn Nam', phone: '0956789012', bank: '9988776655', bank_name: 'Agribank', start: '2026-03-01' },
    { clinic_id: 'CL06', rate: 0.20, contact: 'Vũ Thị Mai', phone: '0967890123', bank: '4433221100', bank_name: 'ACB', start: '2026-01-01' },
  ];
  for (const c of contracts) {
    const existing = db.prepare('SELECT id FROM clinic_contracts WHERE clinic_id=?').get(c.clinic_id);
    if (!existing) {
      db.prepare(`INSERT INTO clinic_contracts (clinic_id,commission_rate,contract_start,contact_person,contact_phone,bank_account,bank_name,status)
                  VALUES (?,?,?,?,?,?,?,'active')`)
        .run(c.clinic_id, c.rate, c.start, c.contact, c.phone, c.bank, c.bank_name);
    }
  }
  console.log(`✔ Đã tạo ${contracts.length} hợp đồng phòng khám mẫu`);
}

function seedClinicStaff() {
  const existing = db.prepare("SELECT id FROM users WHERE email='staff@ankhang.vn'").get();
  if (!existing) {
    const hash = bcrypt.hashSync('staff123', 10);
    const info = db.prepare(`INSERT INTO users (full_name,email,phone,address,password_hash,role) VALUES (?,?,?,?,?,'clinic_staff')`)
      .run('Nhân viên An Khang', 'staff@ankhang.vn', '0912000001', 'Hà Nội', hash);
    db.prepare('INSERT INTO clinic_staff (user_id, clinic_id) VALUES (?,?)').run(Number(info.lastInsertRowid), 'CL01');
    console.log('✔ Đã tạo tài khoản nhân viên phòng khám: staff@ankhang.vn / staff123 (Phòng khám CL01)');
  } else {
    console.log('ℹ Tài khoản nhân viên phòng khám đã tồn tại.');
  }
}

seedClinics();
seedSpecialties();
seedDoctors();
seedPricing();
seedArticles();
seedFaq();
seedFacilities();
seedContracts();
seedClinicStaff();
seedAdmin();

console.log('\n🎉 Hoàn tất nạp dữ liệu mẫu vào database.sqlite');
