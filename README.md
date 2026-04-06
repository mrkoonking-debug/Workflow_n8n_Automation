# 📦 Smart Equipment Lending System
## ระบบยืม-คืนอุปกรณ์อัจฉริยะ

ระบบจัดการยืม-คืนอุปกรณ์สำหรับมหาวิทยาลัย / ห้อง Lab / สำนักงาน  
ใช้ **Vue.js 3** เป็น Frontend + **n8n** เป็น Workflow Automation + **Google Sheets** เป็น Database

---

## 🏗️ สถาปัตยกรรมระบบ (Architecture)

```
┌─────────────────┐     Webhook      ┌─────────────┐     Read/Write     ┌──────────────┐
│   🖥️ Vue.js 3   │ ──────────────→ │  ⚙️ n8n      │ ────────────────→ │ 📊 Google     │
│   (Vite)        │ ←────────────── │  Workflow    │ ←──────────────── │    Sheets     │
│   Port: 5173    │     Response    │  Port: 5678  │                   │  (3 Sheets)   │
└─────────────────┘                 └─────────────┘                   └──────────────┘
                                          │
                                          │ Email แจ้งเตือน
                                          ▼
                                    ┌─────────────┐
                                    │  📧 Gmail    │
                                    └─────────────┘
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 Dashboard | สรุปภาพรวม + กราฟหมวดหมู่ + อุปกรณ์ยอดนิยม |
| 📦 รายการอุปกรณ์ | ตารางอุปกรณ์ + ค้นหา + กรองหมวดหมู่ + Badge สถานะ |
| 📝 ยืมอุปกรณ์ | ฟอร์มยืม + Validation + แสดงรหัสยืม + Email ยืนยัน |
| 🔄 คืนอุปกรณ์ | ค้นหารหัสยืม + แสดงรายละเอียด + คืน + Email ยืนยัน |
| 📋 ประวัติ | ตารางประวัติ + กรองสถานะ + ค้นหา + Pagination |
| ⏰ แจ้งเตือน | Schedule ทุกวัน 8:00 + Email เตือนผู้ยืม + สรุปให้ Admin |

---

## 🗄️ Google Sheets — Database Design

### Sheet 1: `อุปกรณ์` (equipment)
| รหัสอุปกรณ์ | ชื่ออุปกรณ์ | หมวดหมู่ | จำนวนทั้งหมด | จำนวนคงเหลือ | สถานะ |
|---|---|---|---|---|---|
| EQ001 | โน้ตบุ๊ค Dell Latitude 5540 | คอมพิวเตอร์ | 10 | 7 | พร้อมใช้ |

### Sheet 2: `รายการยืม` (borrow_log)
| รหัสยืม | รหัสนศ. | ชื่อผู้ยืม | Email | อุปกรณ์ | วันที่ยืม | กำหนดคืน | สถานะ | วันที่คืน |
|---|---|---|---|---|---|---|---|---|
| BR001 | 67704800 | สมชาย ใจดี | xxx@mail.com | EQ001 | 2026-04-01 | 2026-04-08 | ยืมอยู่ | - |

### Sheet 3: `ผู้ใช้` (users)
| รหัสนศ. | ชื่อ-นามสกุล | Email | คณะ | จำนวนยืมรวม |
|---|---|---|---|---|
| 67704800 | สมชาย ใจดี | xxx@mail.com | วิศวกรรมศาสตร์ | 3 |

---

## ⚙️ n8n Workflows (5 ตัว)

| # | Workflow | Type | Endpoint |
|---|----------|------|----------|
| 1 | ยืมอุปกรณ์ (Borrow) | POST | `/webhook/borrow` |
| 2 | คืนอุปกรณ์ (Return) | POST | `/webhook/return` |
| 3 | ดึงข้อมูลอุปกรณ์ (Get Equipment) | GET | `/webhook/equipment` |
| 4 | ดึงประวัติยืม-คืน (Get History) | GET | `/webhook/borrow-history` |
| 5 | แจ้งเตือนเกินกำหนด (Overdue Alert) | Schedule | ทุกวัน 08:00 |

### วิธี Import Workflow
1. เปิด n8n → **Workflows** → **Import from File**
2. เลือกไฟล์จากโฟลเดอร์ `n8n-JSON/`
3. ตั้งค่า Google Sheets credentials
4. **Activate** workflow

---

## 📂 โครงสร้างไฟล์

```
Workflow_n8n_Automation/
├── src/
│   ├── assets/
│   │   └── main.css               ← Design System (Premium Dark Theme)
│   ├── views/
│   │   ├── DashboardView.vue       ← หน้า Dashboard
│   │   ├── EquipmentView.vue       ← หน้ารายการอุปกรณ์
│   │   ├── BorrowView.vue          ← หน้ายืมอุปกรณ์ (ฟอร์ม)
│   │   ├── ReturnView.vue          ← หน้าคืนอุปกรณ์
│   │   └── HistoryView.vue         ← หน้าประวัติยืม-คืน
│   ├── services/
│   │   └── api.js                  ← API Service + Mock Data
│   ├── router/
│   │   └── index.js                ← Vue Router (5 routes)
│   ├── App.vue                     ← Layout + Sidebar Navigation
│   └── main.js                     ← Entry Point
├── n8n-JSON/
│   ├── 1-borrow-equipment.json     ← Workflow: ยืมอุปกรณ์
│   ├── 2-return-equipment.json     ← Workflow: คืนอุปกรณ์
│   ├── 3-get-equipment.json        ← Workflow: ดึงข้อมูลอุปกรณ์
│   ├── 4-get-borrow-history.json   ← Workflow: ดึงประวัติ
│   └── 5-overdue-alert.json        ← Workflow: แจ้งเตือนเกินกำหนด
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 🚀 วิธีติดตั้งและรัน

### Prerequisites
- Node.js 20+ 
- n8n (Docker หรือ Desktop)
- Google Sheets + OAuth2 Credentials

### 1. Clone & Install
```bash
git clone https://github.com/mrkoonking-debug/Workflow_n8n_Automation.git
cd Workflow_n8n_Automation
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
เปิด browser ไปที่ `http://localhost:5173`

### 3. ตั้งค่า n8n
1. รัน n8n (port 5678)
2. Import workflow JSON 5 ไฟล์
3. ตั้งค่า Google Sheets credentials
4. ตั้งค่า Gmail credentials
5. Activate ทุก workflow

---

## 🛠️ Tech Stack

| Technology | Usage |
|-----------|-------|
| Vue.js 3 | Frontend (Composition API) |
| Vite | Build Tool |
| Vue Router 4 | Client-side Routing |
| Chart.js + vue-chartjs | Dashboard Charts |
| Axios | HTTP Client |
| n8n | Workflow Automation |
| Google Sheets API | Database |
| Gmail API | Email Notifications |

---

## 👥 ผู้พัฒนา

| Name | GitHub | Email |
|------|--------|-------|
| mrkoonking-debug | [@mrkoonking-debug](https://github.com/mrkoonking-debug) | mrkoonking@gmail.com |

---

## 📝 License

This project is created for educational purposes.

© 2026 Smart Equipment Lending System
