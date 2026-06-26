# 🏥 Hệ thống Đặt lịch khám sức khỏe Online — SứcKhỏeOnline

Đồ án môn **Công nghệ phần mềm** — Khoa CNTT, Trường Đại học Đại Nam.
Bản **full-stack thật**: Node.js (Express) + SQLite (lưu trữ vĩnh viễn trên ổ đĩa) + gửi email thật qua SMTP.
**Đây KHÔNG phải bản demo/giả lập giao diện** — toàn bộ dữ liệu (tài khoản, lịch hẹn, phòng khám, bác sĩ...) được lưu thật vào file `database.sqlite` và còn nguyên sau khi tắt/mở lại server.

---

## 1. Mục lục
1. Tính năng đã làm
2. Cấu trúc thư mục
3. Cài đặt & chạy thử trong 5 phút
4. Cách bật gửi EMAIL THẬT (quan trọng)
5. Cách bật gửi SMS thật (tuỳ chọn nâng cao)
6. Tài khoản demo
7. Giải thích kiến trúc & cách hoạt động
8. Đối chiếu với yêu cầu đề bài gốc
9. Cách đưa lên Internet thật (deploy) để không chỉ chạy ở máy bạn
10. Giới hạn hiện tại & hướng nâng cấp
11. Sự cố thường gặp

---

## 2. Tính năng đã làm

| Nhóm | Tính năng |
|---|---|
| Dữ liệu | File CSV gốc (`data/*.csv`) + nạp vào **SQLite thật** (`database.sqlite`), lưu vĩnh viễn |
| Phòng khám | Danh sách phòng khám **kèm địa chỉ đầy đủ**, giờ mở cửa, SĐT, mô tả, hình ảnh |
| Tìm phòng khám gần nhà | Chọn khu vực của bạn → tính khoảng cách (km) **giả lập theo toạ độ** → sắp xếp gần nhất |
| Bác sĩ | Danh sách bác sĩ **đầy đủ thông tin**: bằng cấp, nơi đào tạo, số năm kinh nghiệm, lịch làm việc, phí khám, đánh giá, ảnh đại diện |
| Chọn theo triệu chứng | Nhập triệu chứng → tự gợi ý đúng chuyên khoa + bác sĩ phù hợp |
| Đặt lịch | Chọn ngày giờ mong muốn theo luồng 4 bước |
| Chống trùng lịch | Tự động kiểm tra trùng lịch bác sĩ; nếu trùng → **đề xuất khung giờ thay thế gần nhất**; nếu trống → đặt lịch ngay |
| Nhắc lịch | Gửi **email thật** (qua SMTP) ngay khi đặt lịch + **tự động nhắc lại trước giờ hẹn 24h** (chạy nền bằng cron) |
| Đăng nhập/Đăng ký | Tài khoản bệnh nhân + **tài khoản admin** (mật khẩu mã hoá bcrypt, phiên đăng nhập bằng session) |
| Trang quản trị (Admin) | Thêm/Sửa/**Xoá trực tiếp trên web**: phòng khám, bác sĩ, chuyên khoa, bảng giá, bài cẩm nang, lịch hẹn, người dùng |
| Bảng giá | Trang **Bảng giá** đầy đủ chi phí khám/xét nghiệm/dịch vụ, lọc theo danh mục |
| Cẩm nang sức khỏe | Các bài viết kiến thức y khoa theo chủ đề, tìm kiếm, đọc chi tiết |
| Cơ sở vật chất | Mô tả **trang thiết bị + hình ảnh minh hoạ + công dụng** từng khu vực phòng khám |
| Chăm sóc khách hàng tự động | **Chatbot rule-based** trả lời tức thì khi chưa có nhân viên trực tuyến (góc dưới phải mọi trang) |
| Hình ảnh sinh động | Toàn bộ trang đều có ảnh minh hoạ (ảnh đại diện bác sĩ tự sinh theo tên, ảnh phòng khám, ảnh bài viết...) |

---

## 3. Cấu trúc thư mục

```
project/
├── server.js                # Điểm khởi động server Express
├── package.json
├── .env.example              # Mẫu cấu hình — copy thành .env rồi điền thông tin thật
├── data/                      # CSV gốc theo đúng yêu cầu đề bài
│   ├── clinics.csv
│   ├── doctors.csv
│   ├── specialties.csv
│   ├── pricing.csv
│   ├── articles.csv
│   └── chatbot_faq.csv
├── db/
│   ├── database.js           # Khởi tạo SQLite (dùng module node:sqlite có sẵn của Node.js)
│   └── seed.js                # Script nạp dữ liệu CSV vào database.sqlite
├── routes/                    # API: auth, clinics, doctors, specialties, pricing, articles, appointments, chatbot, admin
├── utils/
│   ├── mailer.js              # Gửi email thật (nodemailer) — tự chuyển "mô phỏng" nếu chưa cấu hình SMTP
│   ├── distance.js            # Tính khoảng cách Haversine (km) giữa 2 toạ độ
│   └── reminderScheduler.js   # Cron chạy nền, tự gửi email nhắc lịch trước giờ hẹn
└── public/                    # Toàn bộ giao diện (HTML/CSS/JS thuần, không cần build)
    ├── index.html, clinics.html, doctors.html, booking.html, pricing.html,
    │ health-guide.html, facilities.html, login.html, register.html,
    │ my-appointments.html, admin.html
    ├── css/style.css
    └── js/common.js, booking.js, admin.js
```

---

## 4. Cài đặt & chạy thử trong 5 phút

**Yêu cầu:** Node.js bản **20 trở lên** (khuyến nghị 22+, vì dùng module `node:sqlite` có sẵn — không cần cài thêm driver C++ phức tạp).

```bash
# 1. Vào thư mục dự án
cd project

# 2. Cài thư viện
npm install

# 3. Copy file cấu hình mẫu
cp .env.example .env

# 4. Nạp dữ liệu mẫu (chỉ cần chạy 1 lần đầu, hoặc khi muốn reset dữ liệu)
npm run seed

# 5. Chạy server
npm start
```

Mở trình duyệt: **http://localhost:3000**

> Mặc định cổng là `3000`, có thể đổi trong file `.env` (biến `PORT`).

---

## 5. Cách bật gửi EMAIL THẬT (quan trọng — đọc kỹ phần này)

Mặc định khi chưa cấu hình, hệ thống **không gửi được email thật** vì:
- Email cần một tài khoản SMTP thật (Gmail, Outlook, hoặc dịch vụ như SendGrid/Mailgun) để xác thực gửi đi.
- Tôi (AI) **không thể tự tạo hộ bạn** một tài khoản email/SMTP — đây là thông tin bảo mật riêng của bạn, không ai có thể cấp thay được.

Khi chưa cấu hình, hệ thống **vẫn chạy đúng toàn bộ logic** (đặt lịch, nhắc lịch...) nhưng email sẽ được ghi vào log/console thay vì gửi đi thật (gọi là "chế độ mô phỏng" — bạn sẽ thấy dòng `[MÔ PHỎNG GỬI EMAIL]` trong terminal).

**Cách bật gửi thật bằng Gmail (miễn phí, 5 phút):**

1. Bật xác minh 2 bước cho Gmail: https://myaccount.google.com/security
2. Tạo mật khẩu ứng dụng tại: https://myaccount.google.com/apppasswords
3. Mở file `.env`, điền:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=email-cua-ban@gmail.com
   SMTP_PASS=mat-khau-ung-dung-16-ky-tu
   ```
4. Khởi động lại server (`npm start`) — từ giờ email xác nhận đặt lịch & nhắc lịch sẽ được gửi thật.

Bạn cũng có thể dùng SMTP của Outlook, Zoho Mail, hoặc dịch vụ chuyên gửi email như **SendGrid**, **Mailgun**, **Amazon SES** — chỉ cần đổi `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` tương ứng.

---

## 6. Cách bật gửi SMS thật (tuỳ chọn nâng cao)

Hệ thống hiện **chưa tích hợp sẵn SMS thật** vì gửi SMS cần một tài khoản trả phí của nhà cung cấp (ví dụ **Twilio**, **eSMS.vn**, **Speed SMS**...) — tôi không thể tạo sẵn tài khoản đó thay bạn. Nếu bạn muốn bổ sung:

1. Đăng ký tài khoản tại nhà cung cấp SMS (ví dụ https://www.twilio.com — có gói dùng thử miễn phí).
2. Lấy `Account SID`, `Auth Token`, và số điện thoại gửi.
3. Cài thư viện: `npm install twilio`
4. Tạo file `utils/sms.js` tương tự `utils/mailer.js`, gọi API Twilio để gửi SMS, rồi gọi hàm đó tại điểm đặt lịch trong `routes/appointments.js` (chỗ đang gọi `sendAppointmentEmail`).

Tôi có thể giúp bạn viết code phần này chi tiết nếu bạn đã có tài khoản Twilio (hoặc tương đương) sẵn sàng — chỉ cần cung cấp lại các thông tin trên (đừng dán Auth Token vào đoạn chat công khai).

---

## 7. Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| **Admin** (quản trị toàn hệ thống) | `admin@suckhoe.vn` | `admin123` |
| Bệnh nhân | Tự đăng ký tại trang **Đăng ký** | — |

> ⚠️ Trước khi đưa lên Internet thật cho người dùng thật, hãy đổi mật khẩu admin và đổi `SESSION_SECRET` trong `.env`.

---

## 8. Giải thích kiến trúc & cách hoạt động

- **Backend:** Node.js + Express, expose REST API tại `/api/...`
- **Cơ sở dữ liệu:** SQLite — dùng module **`node:sqlite`** tích hợp sẵn trong Node.js (không cần build native, không cần cài MySQL/Postgres riêng). Dữ liệu lưu trong file `database.sqlite` ngay trong thư mục dự án → **lưu vĩnh viễn**, mất điện/tắt máy vẫn còn nguyên.
- **Xác thực:** Mật khẩu được mã hoá bằng `bcryptjs` (không lưu plain-text), đăng nhập dùng `express-session` (cookie phiên).
- **Chống trùng lịch:** Mỗi khi đặt lịch, hệ thống truy vấn xem bác sĩ đó đã có lịch hẹn nào khác ở cùng ngày + cùng giờ chưa; nếu có, tính toán các khung giờ trống gần nhất (cách nhau 30 phút) trong giờ làm việc để đề xuất.
- **Nhắc lịch:** Dùng `node-cron` chạy một tác vụ nền **mỗi giờ một lần**, quét các lịch hẹn sắp diễn ra trong 24h tới mà chưa được nhắc, rồi gửi email và đánh dấu đã nhắc — hoàn toàn tự động, không cần bạn làm gì thêm.
- **Tìm khoảng cách:** Dùng công thức Haversine tính khoảng cách thực giữa hai toạ độ (vĩ độ/kinh độ) — đúng theo yêu cầu đề bài là "khoảng cách giả lập" (vì không tích hợp GPS/Google Maps API thật, nhưng công thức tính khoảng cách là thật).
- **Chatbot CSKH:** So khớp từ khoá trong bảng `chatbot_faq` (đọc từ `data/chatbot_faq.csv`) — đây là rule-based đơn giản, đủ dùng cho đồ án. Có thể nâng cấp lên gọi AI thật (xem mục 10).

---

## 9. Đối chiếu với yêu cầu đề bài gốc

| # | Yêu cầu trong đề | Đã đáp ứng tại |
|---|---|---|
| 1 | File dữ liệu CSV (doctors.csv, clinics.csv, appointments.csv...) | `data/*.csv` — nạp vào DB qua `db/seed.js`. Lịch hẹn lưu trong bảng `appointments` của SQLite (đầy đủ hơn CSV tĩnh vì cần ghi liên tục) |
| 2 | Tìm phòng khám gần nhà bằng khoảng cách giả lập | Trang `clinics.html` — chọn khu vực, sắp xếp theo km |
| 3 | Chọn chuyên khoa + bác sĩ theo triệu chứng | `booking.html` bước 2 — nhập triệu chứng, hệ thống match theo `keywords` trong `specialties.csv` |
| 4 | Đặt lịch theo thời gian mong muốn | `booking.html` bước 3-4 |
| 5 | Tự động phát hiện trùng lịch + đề xuất giờ thay thế | `routes/appointments.js` (hàm `isDoctorBusy`, `suggestAlternativeSlots`) |
| 6 | Nhắc lịch gửi đến `patient_email` | `utils/mailer.js` + `utils/reminderScheduler.js` |

**Các phần bổ sung theo yêu cầu thêm của bạn:** địa chỉ phòng khám đầy đủ, chatbot CSKH tự động, hồ sơ bác sĩ chi tiết, cẩm nang sức khỏe, đăng nhập/đăng ký + phân quyền admin xoá/sửa trực tiếp trên web, bảng giá, mô tả cơ sở vật chất kèm ảnh, lưu trữ vĩnh viễn bằng database thật, gửi email thật — **tất cả đã có ở trên**.

---

## 10. Cách đưa lên Internet thật (deploy) để không chỉ chạy ở máy bạn

Hiện tại bạn đang chạy ở `localhost` (chỉ máy bạn truy cập được). Để bạn bè/giảng viên truy cập từ xa, chọn 1 trong các cách sau (đều có gói miễn phí):

1. **Render.com** (dễ nhất): Tạo tài khoản → New Web Service → kết nối GitHub repo chứa code này → Build command: `npm install && npm run seed` → Start command: `npm start` → thêm các biến môi trường trong mục Environment (giống file `.env`).
2. **Railway.app**: tương tự Render, deploy trực tiếp từ GitHub.
3. **VPS riêng** (DigitalOcean, Vultu, AWS EC2...): cài Node.js, kéo code về, chạy bằng `pm2 start server.js` để server tự khởi động lại khi sập/khi reboot máy.

> Lưu ý: file `database.sqlite` sẽ được lưu trên ổ đĩa của server đó. Một số nền tảng miễn phí (như Render free tier) có thể xoá ổ đĩa khi container khởi động lại — nếu cần dữ liệu bền vững lâu dài trên môi trường production thật, nên gắn thêm **Persistent Disk** (Render có hỗ trợ trả phí) hoặc chuyển sang dùng PostgreSQL (Render/Railway đều có PostgreSQL miễn phí dạng managed database).

---

## 11. Giới hạn hiện tại & hướng nâng cấp

Để bạn hiểu rõ ranh giới giữa "chạy được ngay" và "cần bạn tự bổ sung":

| Mục | Trạng thái hiện tại | Vì sao chưa làm được / cách nâng cấp |
|---|---|---|
| Gửi Email | **Thật**, chỉ cần điền SMTP trong `.env` | Đã sẵn sàng, chỉ cần bạn có 1 email |
| Gửi SMS | Chưa tích hợp (chỉ có hướng dẫn) | Cần tài khoản Twilio/eSMS trả phí — tôi không thể tự tạo hộ bạn |
| Khoảng cách nhà → phòng khám | Giả lập theo khu vực bạn **chọn từ danh sách** | Đề bài yêu cầu "giả lập" — nếu muốn định vị thật bằng GPS trình duyệt + Google Maps Distance Matrix API, cần bạn đăng ký Google Cloud API Key (có phí khi vượt hạn mức miễn phí) |
| Ảnh minh hoạ | Ảnh ngẫu nhiên từ Picsum/UI Avatars (dịch vụ ảnh công khai, miễn phí, ổn định) | Nếu muốn ảnh thật của từng phòng khám/bác sĩ cụ thể, vào trang Admin → Sửa → dán URL ảnh thật của bạn vào trường "URL hình ảnh" |
| Chatbot CSKH | Rule-based (so khớp từ khoá) | Đủ dùng cho đồ án; nếu muốn "thông minh" hơn (hiểu ngôn ngữ tự nhiên), có thể tích hợp Anthropic Claude API hoặc OpenAI API — cần bạn có API Key riêng |
| Bảo mật | Cơ bản (bcrypt + session) | Trước khi dùng thật cho dữ liệu y tế thực, nên bổ sung HTTPS, giới hạn rate-limit, và tuân thủ quy định bảo mật dữ liệu y tế hiện hành |

---

## 12. Sự cố thường gặp

- **Lỗi "address already in use" khi `npm start`:** cổng 3000 đang bị chiếm — đổi `PORT` trong `.env` hoặc tắt tiến trình đang dùng cổng đó.
- **Đăng nhập admin không được:** đảm bảo đã chạy `npm run seed` ít nhất 1 lần để tạo tài khoản admin mặc định.
- **Email không gửi được dù đã điền SMTP:** kiểm tra lại đã dùng **App Password** (16 ký tự, không dấu cách) chứ không phải mật khẩu Gmail thường; kiểm tra đã bật xác minh 2 bước.
- **Muốn xoá hết dữ liệu và làm lại từ đầu:** xoá file `database.sqlite`, chạy lại `npm run seed`.

---

Nếu bạn cần tôi giải thích sâu hơn bất kỳ phần code nào, hoặc muốn tôi hoàn thiện thêm phần SMS/Twilio khi bạn đã có tài khoản, cứ nói nhé! 🎓
