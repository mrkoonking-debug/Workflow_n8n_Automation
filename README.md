# 📦 Smart Lending — ระบบยืม-คืนหนังสืออัตโนมัติ

> **Low-Code Library Engine** — ระบบจัดการยืม-คืนหนังสือ/ทรัพยากร ที่ใช้ n8n เป็น Workflow Automation Engine, Google Sheets เป็น Persistent Storage และ Vue.js เป็น Frontend

[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![n8n](https://img.shields.io/badge/n8n-Workflow_Automation-EA4B71?style=flat-square&logo=n8n&logoColor=white)](https://n8n.io/)
[![Google Sheets](https://img.shields.io/badge/Google_Sheets-Database-34A853?style=flat-square&logo=google-sheets&logoColor=white)](https://sheets.google.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com/)
[![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                               │
│                    Vue.js 3 + Vite Frontend                         │
│   ┌───────────┬──────────┬───────────┬───────────┬───────────────┐  │
│   │ Dashboard │ รายการ    │ ยืมหนังสือ │ คืนหนังสือ │ ประวัติยืม-คืน │  │
│   └───────────┴──────────┴───────────┴───────────┴───────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP (Webhook)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    n8n Workflow Engine (Docker)                      │
│                    http://localhost:5678                             │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  6 Active Workflows:                                         │  │
│   │  1. POST /borrow    → ยืมอุปกรณ์ (เช็คสต็อก+บันทึก+Email)    │  │
│   │  2. POST /return    → คืนอุปกรณ์ (อัปเดตสถานะ+เพิ่มสต็อก)    │  │
│   │  3. GET  /equipment → ดึงข้อมูลหนังสือ                        │  │
│   │  4. GET  /borrow-history → ดึงประวัติยืม-คืน                  │  │
│   │  5. CRON 08:00      → แจ้งเตือนเกินกำหนด (Email)             │  │
│   │  6. GET  /students  → ดึงข้อมูลนักศึกษา                      │  │
│   └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ Google Sheets API
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Google Sheets (Database)                          │
│   ┌──────────────┬──────────────┬──────────────┐                   │
│   │  Sheet: อุปกรณ์  │  Sheet: รายการยืม │  Sheet: ผู้ใช้    │                   │
│   │  (หนังสือ+สต็อก) │  (ประวัติยืม-คืน)  │ (นักศึกษา)  │                   │
│   └──────────────┴──────────────┴──────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Event-Driven Architecture

ทุก Action จาก Frontend จะ **Trigger Webhook** ใน n8n → n8n จัดการ Business Logic ทั้งหมด:

| Action | Frontend | n8n Workflow | Google Sheets |
|--------|----------|-------------|---------------|
| ยืมหนังสือ | POST `/webhook/borrow` | เช็คสต็อก → บันทึกรายการ → ลดจำนวน → ส่ง Email | อุปกรณ์ + รายการยืม |
| คืนหนังสือ | POST `/webhook/return` | ค้นหารหัสยืม → อัปเดตสถานะ → เพิ่มจำนวน → ส่ง Email | อุปกรณ์ + รายการยืม |
| ดูรายการ | GET `/webhook/equipment` | อ่านข้อมูลหนังสือ | อุปกรณ์ |
| ดูประวัติ | GET `/webhook/borrow-history` | อ่านประวัติยืม-คืน | รายการยืม |
| แจ้งเตือน | Cron ทุกวัน 08:00 | กรองรายการเกินกำหนด → ส่ง Email ผู้ยืม + สรุปให้ Admin | รายการยืม |

---

## ✨ Features

### 📊 Dashboard
- สถิติรวม (จำนวนหนังสือ, ถูกยืมอยู่, พร้อมใช้, เกินกำหนด)
- กราฟ Doughnut — สัดส่วนหมวดหมู่หนังสือ
- กราฟ Bar — หนังสือยืมบ่อยที่สุด
- กิจกรรมล่าสุด (5 รายการ)

### 📦 รายการหนังสือ
- ตารางหนังสือ + สต็อก (แถบสีเขียว/เหลือง/แดง)
- ค้นหาตามชื่อ/รหัส
- กรองตามหมวดหมู่

### 📝 ยืมหนังสือ
- Auto-lookup หนังสือ (พิมพ์รหัส → dropdown suggestions)
- Auto-lookup นักศึกษา (พิมพ์รหัส → ดึงข้อมูลอัตโนมัติ)
- Validation ครบถ้วน (รหัส 8 หลัก, Email format, วันคืนสูงสุด 14 วัน)
- Modal ยืนยัน + แสดงรหัสยืมหลังสำเร็จ

### 🔄 คืนหนังสือ
- Quick Search — กรอกรหัสยืม → แสดงข้อมูลทันที
- ตรวจจับอัตโนมัติ: ยืมอยู่ / เกินกำหนด / คืนแล้ว
- Quick Return จากรายการรอคืน (คลิกเดียว)
- สถิติสรุป: กำลังยืม, เกินกำหนด, คืนแล้ว

### 📋 ประวัติยืม-คืน
- ตารางประวัติ + Pagination
- ค้นหาด้วยรหัสยืม, รหัสนศ., ชื่อ
- กรองสถานะ (ทั้งหมด, ยืมอยู่, คืนแล้ว, เกินกำหนด)
- Export CSV

### 🔔 แจ้งเตือนอัตโนมัติ (n8n Cron)
- ทุกวัน 08:00 — สแกนรายการเกินกำหนด
- ส่ง Email แจ้งเตือนผู้ยืมทุกคน
- ส่ง Email สรุปให้ Admin

### 🔗 System Monitoring
- ตรวจสอบ n8n connection ทุก 30 วินาที (Sidebar indicator)
- Toast notification สำหรับ success/error
- Error states + retry ทุกหน้า
- API retry logic (max 2 retries)

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- Docker Desktop
- Google Account (สำหรับ Google Sheets & Gmail)

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd Workflow_n8n_Automation
npm install
```

### 2. Start n8n (Docker)

```bash
docker compose up -d
```

n8n จะรันที่ `http://localhost:5678`

### 3. Setup n8n Workflows

1. เข้า n8n editor: `http://localhost:5678`
2. Import workflow JSON ทั้ง 6 ไฟล์จากโฟลเดอร์ `n8n-JSON/`
3. เชื่อมต่อ Google Sheets credentials (OAuth2)
4. เชื่อมต่อ Gmail credentials (OAuth2)
5. ระบุ `documentId` ใน Google Sheets nodes (ทุก workflow)
6. **Activate** ทุก workflow

### 4. Environment Variables

```bash
cp .env.example .env
```

แก้ไข `.env`:
```env
VITE_N8N_BASE_URL=http://localhost:5678/webhook
```

### 5. Run Frontend

```bash
npm run dev
```

เว็บไซต์จะรันที่ `http://localhost:5173`

---

## 📁 Project Structure

```
Workflow_n8n_Automation/
├── src/
│   ├── views/
│   │   ├── DashboardView.vue      # หน้าแดชบอร์ด (กราฟ + สถิติ)
│   │   ├── EquipmentView.vue      # หน้ารายการหนังสือ
│   │   ├── BorrowView.vue         # หน้ายืมหนังสือ (Auto-lookup)
│   │   ├── ReturnView.vue         # หน้าคืนหนังสือ (Quick Search)
│   │   └── HistoryView.vue        # หน้าประวัติยืม-คืน (Export CSV)
│   ├── services/
│   │   └── api.js                 # API Layer (Axios + Retry Logic)
│   ├── router/
│   │   └── index.js               # Vue Router
│   ├── assets/
│   │   └── main.css               # Liquid Glass Design System
│   ├── App.vue                    # Main Layout (Sidebar + Toast)
│   └── main.js                    # Entry Point
├── n8n-JSON/                      # n8n Workflow Exports
│   ├── 1-borrow-equipment.json    # ยืมอุปกรณ์
│   ├── 2-return-equipment.json    # คืนอุปกรณ์
│   ├── 3-get-equipment.json       # ดึงข้อมูลอุปกรณ์
│   ├── 4-get-borrow-history.json  # ดึงประวัติยืม-คืน
│   ├── 5-overdue-alert.json       # แจ้งเตือนเกินกำหนด (Cron 08:00)
│   └── 6-get-students.json        # ดึงข้อมูลนักศึกษา
├── docker-compose.yml             # Docker config สำหรับ n8n
├── vite.config.js                 # Vite configuration (Proxy)
├── package.json
└── README.md
```

---

## 🔧 n8n Workflows Detail

### Workflow 1: ยืมอุปกรณ์ (Borrow)
```
Webhook POST /borrow
  → Edit Fields (รับข้อมูล)
  → Read Equipment Sheet
  → IF ตรวจสอบสต็อก
    ✅ → สร้างรหัสยืม (BR+timestamp)
       → Append to รายการยืม
       → Update จำนวนคงเหลือ (-1)
       → Send Email ยืนยัน
       → Respond 200 (success + borrowId)
    ❌ → Respond 400 (อุปกรณ์หมด)
```

### Workflow 2: คืนอุปกรณ์ (Return)
```
Webhook POST /return
  → Edit Fields (รับ borrowId)
  → Read รายการยืม Sheet
  → Filter หารหัสยืม + สถานะ 'ยืมอยู่'
  → IF พบรายการ
    ✅ → Update สถานะ → 'คืนแล้ว' + วันที่คืน
       → Read Equipment → Update จำนวนคงเหลือ (+1)
       → Send Email ยืนยันคืน
       → Respond 200 (success)
    ❌ → Respond 404 (ไม่พบ/คืนแล้ว)
```

### Workflow 5: แจ้งเตือนเกินกำหนด (Overdue Alert)
```
Schedule Trigger (ทุกวัน 08:00 น.)
  → Read รายการยืม Sheet
  → Filter (สถานะ='ยืมอยู่' AND กำหนดคืน < วันนี้)
  → IF มีรายการเกินกำหนด
    ✅ → Send Email แจ้งเตือนผู้ยืม (แต่ละคน)
       → Send Email สรุปให้ Admin
    ❌ → No Operation (ไม่มีรายการเกินกำหนด)
```

---

## ⚠️ Known Limitations & Design Decisions

### Google Sheets as Database
- Google Sheets **ไม่ใช่ Database จริง** — ไม่รองรับ Transactional Integrity
- มี Rate Limit จาก Google API (ถ้ามีคนกดรัวๆ พร้อมกันอาจเกิด Race Condition)
- เหมาะกับ use case ขนาดเล็ก-กลาง (< 1,000 records)
- **เหตุผลที่ใช้**: โจทย์กำหนดให้ใช้ Google Sheets เป็น Database

### Race Condition Awareness
- Borrow workflow มี stock check ก่อน update แต่ไม่มี locking mechanism
- สำหรับ production จริง ควรขยับไป Supabase / PostgreSQL + Row-level locking

### n8n as Backend
- n8n ทำหน้าที่เป็น **Middle-tier** จัดการ Business Logic ทั้งหมด
- ข้อดี: Low-code, ยืดหยุ่น, Visual workflow, Built-in Email integration
- ข้อเสีย: Latency สูงกว่า traditional backend, ไม่เหมาะกับ high-throughput

---

## 🎨 Design System

ใช้ **Apple Liquid Glass Design** (macOS 26 Tahoe / iOS 26) ประกอบด้วย:
- Frosted translucent glass surfaces (`backdrop-filter: blur`)
- Vibrant iOS color palette (Blue, Green, Amber, Red)
- Spring physics animations
- Inter font family
- Responsive layout (Desktop + Tablet + Mobile)

---

## 👥 Team

ระบบยืม-คืนหนังสืออัตโนมัติ — พัฒนาเป็นส่วนหนึ่งของรายวิชา Workflow Automation

**Tech Stack**: Vue.js 3 + Vite + n8n + Google Sheets + Docker

---

## 📜 License

MIT License — © 2026 Smart Library v1.0
