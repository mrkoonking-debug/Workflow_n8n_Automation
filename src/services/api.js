import axios from 'axios'

// ==========================================
// n8n Webhook Base URL
// เปลี่ยน URL นี้ตาม n8n ที่เปิดใช้งาน
// ==========================================
const N8N_BASE = 'http://localhost:5678/webhook'

// Axios instance สำหรับ n8n
const n8nClient = axios.create({
  baseURL: N8N_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ==========================================
// สถานะการเชื่อมต่อ n8n
// ==========================================
const connectionState = {
  connected: false,
  lastCheck: null,
  error: null,
}

/**
 * ตรวจสอบการเชื่อมต่อ n8n
 */
async function checkConnection() {
  try {
    await n8nClient.get('/equipment', { timeout: 5000 })
    connectionState.connected = true
    connectionState.error = null
    connectionState.lastCheck = new Date()
    return true
  } catch (error) {
    connectionState.connected = false
    connectionState.error = error.message
    connectionState.lastCheck = new Date()
    return false
  }
}

// ==========================================
// API Functions — ข้อมูลจาก n8n → Google Sheets เท่านั้น
// ==========================================
const api = {

  /**
   * ดึงสถานะการเชื่อมต่อ
   */
  getConnectionState() {
    return connectionState
  },

  /**
   * ตรวจสอบ n8n พร้อมใช้งาน
   */
  async checkN8nConnection() {
    return await checkConnection()
  },

  /**
   * ดึงข้อมูลอุปกรณ์ทั้งหมดจาก Google Sheets ผ่าน n8n
   * Workflow: GET /webhook/equipment → Read Google Sheets "อุปกรณ์" → Respond
   */
  async getEquipment() {
    try {
      const response = await n8nClient.get('/equipment')
      connectionState.connected = true
      connectionState.error = null

      // n8n อาจตอบกลับเป็น array โดยตรง หรือ wrapped ใน data
      const data = Array.isArray(response.data) ? response.data : response.data.data || []
      console.log('✅ ดึงข้อมูลอุปกรณ์จาก n8n + Google Sheets สำเร็จ:', data.length, 'รายการ')
      return data
    } catch (error) {
      connectionState.connected = false
      connectionState.error = error.message
      console.error('❌ ไม่สามารถดึงข้อมูลอุปกรณ์จาก n8n ได้:', error.message)
      console.error('📋 ตรวจสอบ: 1) n8n กำลังทำงาน? 2) Workflow "Get Equipment" active? 3) Google Sheets เชื่อมต่อแล้ว?')
      throw new Error('ไม่สามารถเชื่อมต่อ n8n ได้ — กรุณาตรวจสอบว่า n8n กำลังทำงานและ Workflow ถูกเปิดใช้งาน')
    }
  },

  /**
   * ยืมอุปกรณ์ — ส่งข้อมูลไป n8n → เขียน Google Sheets + อัปเดตสต็อก + ส่ง Email
   * Workflow: POST /webhook/borrow → ตรวจสต็อก → เขียนรายการยืม → ลดจำนวน → ส่ง Email → Respond
   */
  async borrowEquipment(data) {
    try {
      const response = await n8nClient.post('/borrow', data)
      connectionState.connected = true
      console.log('✅ ยืมอุปกรณ์ผ่าน n8n + Google Sheets สำเร็จ:', response.data)
      return response.data
    } catch (error) {
      connectionState.connected = false

      // ถ้า n8n ตอบกลับ error (เช่น อุปกรณ์หมด)
      if (error.response && error.response.data) {
        console.warn('⚠️ n8n ตอบกลับ error:', error.response.data.message)
        return error.response.data
      }

      console.error('❌ ไม่สามารถยืมอุปกรณ์ผ่าน n8n ได้:', error.message)
      throw new Error('ไม่สามารถเชื่อมต่อ n8n ได้ — กรุณาตรวจสอบว่า n8n กำลังทำงาน')
    }
  },

  /**
   * คืนอุปกรณ์ — ส่งรหัสยืมไป n8n → อัปเดต Google Sheets + เพิ่มสต็อก + ส่ง Email
   * Workflow: POST /webhook/return → ค้นหารหัสยืม → อัปเดตสถานะ → เพิ่มจำนวน → ส่ง Email → Respond
   */
  async returnEquipment(borrowId) {
    try {
      const response = await n8nClient.post('/return', { borrowId })
      connectionState.connected = true
      console.log('✅ คืนอุปกรณ์ผ่าน n8n + Google Sheets สำเร็จ:', response.data)
      return response.data
    } catch (error) {
      connectionState.connected = false

      // ถ้า n8n ตอบกลับ error (เช่น ไม่พบรหัสยืม)
      if (error.response && error.response.data) {
        console.warn('⚠️ n8n ตอบกลับ error:', error.response.data.message)
        return error.response.data
      }

      console.error('❌ ไม่สามารถคืนอุปกรณ์ผ่าน n8n ได้:', error.message)
      throw new Error('ไม่สามารถเชื่อมต่อ n8n ได้ — กรุณาตรวจสอบว่า n8n กำลังทำงาน')
    }
  },

  /**
   * ดึงประวัติยืม-คืนทั้งหมดจาก Google Sheets ผ่าน n8n
   * Workflow: GET /webhook/borrow-history → Read Google Sheets "รายการยืม" → Respond
   */
  async getBorrowHistory() {
    try {
      const response = await n8nClient.get('/borrow-history')
      connectionState.connected = true

      const data = Array.isArray(response.data) ? response.data : response.data.data || []
      console.log('✅ ดึงประวัติยืม-คืนจาก n8n + Google Sheets สำเร็จ:', data.length, 'รายการ')
      return data
    } catch (error) {
      connectionState.connected = false
      connectionState.error = error.message
      console.error('❌ ไม่สามารถดึงประวัติยืม-คืนจาก n8n ได้:', error.message)
      throw new Error('ไม่สามารถเชื่อมต่อ n8n ได้ — กรุณาตรวจสอบว่า n8n กำลังทำงานและ Workflow ถูกเปิดใช้งาน')
    }
  },

  /**
   * ค้นหาข้อมูลยืมจากรหัสยืม (ผ่าน n8n → Google Sheets)
   */
  async findBorrowRecord(borrowId) {
    const history = await this.getBorrowHistory()
    return history.find(r => r.รหัสยืม === borrowId) || null
  },

  /**
   * ดึงชื่ออุปกรณ์จากรหัส
   */
  getEquipmentName(equipmentId, equipmentList) {
    const eq = equipmentList.find(e => e.รหัสอุปกรณ์ === equipmentId)
    return eq ? eq.ชื่ออุปกรณ์ : equipmentId
  },
}

export default api
