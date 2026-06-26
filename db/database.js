// db/database.js
// Sử dụng module SQLite tích hợp sẵn của Node.js (node:sqlite) -> KHÔNG cần build native,
// dữ liệu được lưu vĩnh viễn vào file database.sqlite trên ổ đĩa.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Cho phép trỏ database tới một ổ đĩa bền vững (persistent volume/disk) khi deploy lên
// các nền tảng như Railway/Render bằng cách đặt biến môi trường DB_PATH, ví dụ:
//   DB_PATH=/data/database.sqlite
// Nếu không đặt, mặc định lưu tại thư mục gốc dự án (dùng tốt khi chạy ở máy local).
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const isNewDb = !fs.existsSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

function init() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'patient',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clinics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    district TEXT,
    city TEXT,
    lat REAL,
    lng REAL,
    phone TEXT,
    email TEXT,
    opening_hours TEXT,
    description TEXT,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS specialties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    keywords TEXT
  );

  CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    specialty_id TEXT,
    clinic_id TEXT,
    degree TEXT,
    experience_years INTEGER,
    education TEXT,
    bio TEXT,
    gender TEXT,
    schedule TEXT,
    consultation_fee INTEGER,
    rating REAL,
    image TEXT,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(id)
  );

  CREATE TABLE IF NOT EXISTS pricing (
    id TEXT PRIMARY KEY,
    category TEXT,
    service_name TEXT NOT NULL,
    price INTEGER,
    unit TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    summary TEXT,
    content TEXT,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS chatbot_faq (
    id TEXT PRIMARY KEY,
    keywords TEXT,
    answer TEXT
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT,
    clinic_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    specialty_id TEXT,
    symptom TEXT,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    reminder_sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clinic_id) REFERENCES clinics(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  );

  CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    image TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS clinic_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id TEXT NOT NULL UNIQUE,
    commission_rate REAL DEFAULT 0.20,
    contract_start TEXT,
    contract_end TEXT,
    status TEXT DEFAULT 'active',
    contact_person TEXT,
    contact_phone TEXT,
    bank_account TEXT,
    bank_name TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clinic_id) REFERENCES clinics(id)
  );

  CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    clinic_id TEXT NOT NULL,
    attended_at TEXT,
    amount_clinic INTEGER DEFAULT 0,
    commission_rate REAL DEFAULT 0.20,
    commission_amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    confirmed_by INTEGER,
    paid_at TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS monthly_settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id TEXT NOT NULL,
    month TEXT NOT NULL,
    total_appointments INTEGER DEFAULT 0,
    total_attended INTEGER DEFAULT 0,
    total_clinic_revenue INTEGER DEFAULT 0,
    total_commission INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    invoice_date TEXT,
    payment_date TEXT,
    payment_proof TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER,
    doctor_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clinic_staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    clinic_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(id)
  );

  CREATE TABLE IF NOT EXISTS notifications_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER,
    channel TEXT,
    recipient TEXT,
    message TEXT,
    status TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  `);
}

init();

module.exports = { db, isNewDb };
