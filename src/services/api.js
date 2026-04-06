import axios from 'axios'

const N8N_BASE = 'http://localhost:5678/webhook'

// ==========================================
// Mock Data (ใช้เมื่อ n8n ยังไม่พร้อม)
// ==========================================
const mockEquipment = [
  { รหัสอุปกรณ์: 'EQ001', ชื่ออุปกรณ์: 'โน้ตบุ๊ค Dell Latitude 5540', หมวดหมู่: 'คอมพิวเตอร์', จำนวนทั้งหมด: 10, จำนวนคงเหลือ: 7, สถานะ: 'พร้อมใช้' },
  { รหัสอุปกรณ์: 'EQ002', ชื่ออุปกรณ์: 'โปรเจคเตอร์ Epson EB-X51', หมวดหมู่: 'อุปกรณ์นำเสนอ', จำนวนทั้งหมด: 5, จำนวนคงเหลือ: 3, สถานะ: 'พร้อมใช้' },
  { รหัสอุปกรณ์: 'EQ003', ชื่ออุปกรณ์: 'กล้อง Canon EOS R50', หมวดหมู่: 'ถ่ายภาพ', จำนวนทั้งหมด: 3, จำนวนคงเหลือ: 0, สถานะ: 'หมด' },
  { รหัสอุปกรณ์: 'EQ004', ชื่ออุปกรณ์: 'ไมโครโฟน Blue Yeti', หมวดหมู่: 'อุปกรณ์เสียง', จำนวนทั้งหมด: 8, จำนวนคงเหลือ: 5, สถานะ: 'พร้อมใช้' },
  { รหัสอุปกรณ์: 'EQ005', ชื่ออุปกรณ์: 'iPad Pro 12.9"', หมวดหมู่: 'แท็บเล็ต', จำนวนทั้งหมด: 6, จำนวนคงเหลือ: 2, สถานะ: 'พร้อมใช้' },
  { รหัสอุปกรณ์: 'EQ006', ชื่ออุปกรณ์: 'หูฟัง Sony WH-1000XM5', หมวดหมู่: 'อุปกรณ์เสียง', จำนวนทั้งหมด: 12, จำนวนคงเหลือ: 8, สถานะ: 'พร้อมใช้' },
  { รหัสอุปกรณ์: 'EQ007', ชื่ออุปกรณ์: 'ขาตั้งกล้อง Manfrotto', หมวดหมู่: 'ถ่ายภาพ', จำนวนทั้งหมด: 4, จำนวนคงเหลือ: 4, สถานะ: 'พร้อมใช้' },
  { รหัสอุปกรณ์: 'EQ008', ชื่ออุปกรณ์: 'Arduino Starter Kit', หมวดหมู่: 'อิเล็กทรอนิกส์', จำนวนทั้งหมด: 15, จำนวนคงเหลือ: 10, สถานะ: 'พร้อมใช้' },
  { รหัสอุปกรณ์: 'EQ009', ชื่ออุปกรณ์: 'Raspberry Pi 5', หมวดหมู่: 'อิเล็กทรอนิกส์', จำนวนทั้งหมด: 10, จำนวนคงเหลือ: 6, สถานะ: 'พร้อมใช้' },
  { รหัสอุปกรณ์: 'EQ010', ชื่ออุปกรณ์: 'จอ Monitor LG 27"', หมวดหมู่: 'คอมพิวเตอร์', จำนวนทั้งหมด: 7, จำนวนคงเหลือ: 0, สถานะ: 'หมด' },
]

const mockBorrowHistory = [
  { รหัสยืม: 'BR001', 'รหัสนศ.': '67704800', ชื่อผู้ยืม: 'สมชาย ใจดี', Email: 'somchai@mail.com', อุปกรณ์: 'EQ001', วันที่ยืม: '2026-04-01', กำหนดคืน: '2026-04-08', สถานะ: 'ยืมอยู่', วันที่คืน: '-' },
  { รหัสยืม: 'BR002', 'รหัสนศ.': '67701234', ชื่อผู้ยืม: 'สมหญิง รักเรียน', Email: 'somying@mail.com', อุปกรณ์: 'EQ002', วันที่ยืม: '2026-04-02', กำหนดคืน: '2026-04-09', สถานะ: 'คืนแล้ว', วันที่คืน: '2026-04-07' },
  { รหัสยืม: 'BR003', 'รหัสนศ.': '67705678', ชื่อผู้ยืม: 'วิชัย เก่งกาจ', Email: 'wichai@mail.com', อุปกรณ์: 'EQ004', วันที่ยืม: '2026-03-25', กำหนดคืน: '2026-04-01', สถานะ: 'ยืมอยู่', วันที่คืน: '-' },
  { รหัสยืม: 'BR004', 'รหัสนศ.': '67709012', ชื่อผู้ยืม: 'พิมพ์ใจ สวยงาม', Email: 'pimjai@mail.com', อุปกรณ์: 'EQ005', วันที่ยืม: '2026-04-03', กำหนดคืน: '2026-04-10', สถานะ: 'ยืมอยู่', วันที่คืน: '-' },
  { รหัสยืม: 'BR005', 'รหัสนศ.': '67703456', ชื่อผู้ยืม: 'ธนกร รุ่งโรจน์', Email: 'thanakorn@mail.com', อุปกรณ์: 'EQ001', วันที่ยืม: '2026-04-04', กำหนดคืน: '2026-04-11', สถานะ: 'ยืมอยู่', วันที่คืน: '-' },
  { รหัสยืม: 'BR006', 'รหัสนศ.': '67707890', ชื่อผู้ยืม: 'นภา แสงจันทร์', Email: 'napa@mail.com', อุปกรณ์: 'EQ006', วันที่ยืม: '2026-03-28', กำหนดคืน: '2026-04-04', สถานะ: 'คืนแล้ว', วันที่คืน: '2026-04-03' },
  { รหัสยืม: 'BR007', 'รหัสนศ.': '67704800', ชื่อผู้ยืม: 'สมชาย ใจดี', Email: 'somchai@mail.com', อุปกรณ์: 'EQ008', วันที่ยืม: '2026-04-05', กำหนดคืน: '2026-04-12', สถานะ: 'ยืมอยู่', วันที่คืน: '-' },
  { รหัสยืม: 'BR008', 'รหัสนศ.': '67702345', ชื่อผู้ยืม: 'กมลชนก ศรีสุข', Email: 'kamolchanok@mail.com', อุปกรณ์: 'EQ009', วันที่ยืม: '2026-03-20', กำหนดคืน: '2026-03-27', สถานะ: 'ยืมอยู่', วันที่คืน: '-' },
]

// ==========================================
// API Functions
// ==========================================
const api = {
  /**
   * ดึงข้อมูลอุปกรณ์ทั้งหมด
   */
  async getEquipment() {
    try {
      const response = await axios.get(`${N8N_BASE}/equipment`, { timeout: 5000 })
      return response.data
    } catch (error) {
      console.warn('⚠️ n8n ไม่ตอบ — ใช้ Mock Data:', error.message)
      return mockEquipment
    }
  },

  /**
   * ยืมอุปกรณ์
   */
  async borrowEquipment(data) {
    try {
      const response = await axios.post(`${N8N_BASE}/borrow`, data, { timeout: 10000 })
      return response.data
    } catch (error) {
      console.warn('⚠️ n8n ไม่ตอบ — จำลองการยืม:', error.message)
      // Mock response
      const borrowId = 'BR' + Date.now().toString().slice(-6)
      const eq = mockEquipment.find(e => e.รหัสอุปกรณ์ === data.equipmentId)
      if (eq && eq.จำนวนคงเหลือ > 0) {
        eq.จำนวนคงเหลือ--
        if (eq.จำนวนคงเหลือ === 0) eq.สถานะ = 'หมด'
        mockBorrowHistory.unshift({
          รหัสยืม: borrowId,
          'รหัสนศ.': data.studentId,
          ชื่อผู้ยืม: data.name,
          Email: data.email,
          อุปกรณ์: data.equipmentId,
          วันที่ยืม: new Date().toISOString().split('T')[0],
          กำหนดคืน: data.returnDate,
          สถานะ: 'ยืมอยู่',
          วันที่คืน: '-',
        })
        return { success: true, borrowId, message: `ยืมสำเร็จ! รหัสยืม: ${borrowId}` }
      }
      return { success: false, message: 'อุปกรณ์หมด ไม่สามารถยืมได้' }
    }
  },

  /**
   * คืนอุปกรณ์
   */
  async returnEquipment(borrowId) {
    try {
      const response = await axios.post(`${N8N_BASE}/return`, { borrowId }, { timeout: 10000 })
      return response.data
    } catch (error) {
      console.warn('⚠️ n8n ไม่ตอบ — จำลองการคืน:', error.message)
      const record = mockBorrowHistory.find(r => r.รหัสยืม === borrowId && r.สถานะ === 'ยืมอยู่')
      if (record) {
        record.สถานะ = 'คืนแล้ว'
        record.วันที่คืน = new Date().toISOString().split('T')[0]
        const eq = mockEquipment.find(e => e.รหัสอุปกรณ์ === record.อุปกรณ์)
        if (eq) {
          eq.จำนวนคงเหลือ++
          eq.สถานะ = 'พร้อมใช้'
        }
        return { success: true, message: 'คืนอุปกรณ์สำเร็จ!', record }
      }
      return { success: false, message: 'ไม่พบรหัสยืมนี้ หรืออุปกรณ์ถูกคืนแล้ว' }
    }
  },

  /**
   * ดึงประวัติยืม-คืน
   */
  async getBorrowHistory() {
    try {
      const response = await axios.get(`${N8N_BASE}/borrow-history`, { timeout: 5000 })
      return response.data
    } catch (error) {
      console.warn('⚠️ n8n ไม่ตอบ — ใช้ Mock Data:', error.message)
      return mockBorrowHistory
    }
  },

  /**
   * ค้นหาข้อมูลยืมจากรหัสยืม
   */
  async findBorrowRecord(borrowId) {
    try {
      const history = await this.getBorrowHistory()
      return history.find(r => r.รหัสยืม === borrowId) || null
    } catch {
      return mockBorrowHistory.find(r => r.รหัสยืม === borrowId) || null
    }
  },

  /**
   * ดึงชื่ออุปกรณ์จากรหัส
   */
  getEquipmentName(equipmentId, equipmentList) {
    const eq = equipmentList.find(e => e.รหัสอุปกรณ์ === equipmentId)
    return eq ? eq.ชื่ออุปกรณ์ : equipmentId
  }
}

export default api
