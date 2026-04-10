<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.js'

const searchId = ref('')
const searching = ref(false)
const returning = ref(false)
const showResult = ref(false)
const resultSuccess = ref(false)
const resultMessage = ref('')
const borrowRecord = ref(null)
const equipment = ref([])
const borrowHistory = ref([])
const searchError = ref('')
const returnConfirm = ref(false)
const loading = ref(true)
const loadError = ref('')

// โหลดข้อมูลเริ่มต้น
onMounted(async () => {
  try {
    const [eq, history] = await Promise.allSettled([
      api.getEquipment(),
      api.getBorrowHistory(),
    ])
    if (eq.status === 'fulfilled') equipment.value = eq.value
    if (history.status === 'fulfilled') borrowHistory.value = history.value
    loadError.value = ''
  } catch (error) {
    loadError.value = error.message
  } finally {
    loading.value = false
  }
})

// === ค้นหารหัสยืม ===
async function searchBorrow() {
  const trimmedId = searchId.value.trim().toUpperCase()
  if (!trimmedId) {
    searchError.value = 'กรุณากรอกรหัสยืม'
    return
  }
  searchError.value = ''
  searching.value = true
  borrowRecord.value = null

  try {
    if (equipment.value.length === 0) {
      equipment.value = await api.getEquipment()
    }

    const record = await api.findBorrowRecord(trimmedId)
    if (record) {
      borrowRecord.value = record
    } else {
      searchError.value = `ไม่พบรหัสยืม "${trimmedId}" ในระบบ — กรุณาตรวจสอบรหัสอีกครั้ง`
    }
  } catch (error) {
    searchError.value = error.message || 'ไม่สามารถค้นหาได้ กรุณาลองใหม่อีกครั้ง'
  } finally {
    searching.value = false
  }
}

// === Computed: สถานะ ===
const isOverdue = computed(() => {
  if (!borrowRecord.value || borrowRecord.value.สถานะ !== 'ยืมอยู่') return false
  return borrowRecord.value.กำหนดคืน < new Date().toISOString().split('T')[0]
})

const overdueDays = computed(() => {
  if (!isOverdue.value) return 0
  const due = new Date(borrowRecord.value.กำหนดคืน)
  const today = new Date()
  return Math.floor((today - due) / (1000 * 60 * 60 * 24))
})

const borrowDays = computed(() => {
  if (!borrowRecord.value) return 0
  const borrow = new Date(borrowRecord.value.วันที่ยืม)
  const today = new Date()
  return Math.floor((today - borrow) / (1000 * 60 * 60 * 24))
})

// === สถิติการคืน ===
const returnStats = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const returned = borrowHistory.value.filter(r => r.สถานะ === 'คืนแล้ว')
  const active = borrowHistory.value.filter(r => r.สถานะ === 'ยืมอยู่')
  const overdue = active.filter(r => r.กำหนดคืน < today)
  return {
    totalReturned: returned.length,
    activeBorrows: active.length,
    overdueCount: overdue.length,
  }
})

// === รายการที่รอคืน (ยืมอยู่) ===
const pendingReturns = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return borrowHistory.value
    .filter(r => r.สถานะ === 'ยืมอยู่')
    .sort((a, b) => {
      // เกินกำหนดก่อน
      const aOverdue = a.กำหนดคืน < today ? 0 : 1
      const bOverdue = b.กำหนดคืน < today ? 0 : 1
      if (aOverdue !== bOverdue) return aOverdue - bOverdue
      return a.กำหนดคืน.localeCompare(b.กำหนดคืน)
    })
    .slice(0, 8)
})

function getEquipmentName(id) {
  const eq = equipment.value.find(e => e.รหัสอุปกรณ์ === id)
  return eq ? eq.ชื่ออุปกรณ์ : id
}

function confirmReturn() {
  returnConfirm.value = true
}

function cancelReturn() {
  returnConfirm.value = false
}

async function handleReturn() {
  returnConfirm.value = false
  if (returning.value) return
  returning.value = true
  try {
    const result = await api.returnEquipment(borrowRecord.value.รหัสยืม)
    resultSuccess.value = result.success
    resultMessage.value = result.message
    showResult.value = true
    if (result.success) {
      borrowRecord.value.สถานะ = 'คืนแล้ว'
      borrowRecord.value.วันที่คืน = new Date().toISOString().split('T')[0]
      // อัปเดต local data
      const idx = borrowHistory.value.findIndex(r => r.รหัสยืม === borrowRecord.value.รหัสยืม)
      if (idx !== -1) {
        borrowHistory.value[idx].สถานะ = 'คืนแล้ว'
        borrowHistory.value[idx].วันที่คืน = borrowRecord.value.วันที่คืน
      }
    }
  } catch (err) {
    resultSuccess.value = false
    resultMessage.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    showResult.value = true
  } finally {
    returning.value = false
  }
}

function reset() {
  searchId.value = ''
  borrowRecord.value = null
  showResult.value = false
  searchError.value = ''
  returnConfirm.value = false
}

function quickReturn(record) {
  searchId.value = record.รหัสยืม
  searchBorrow()
}
</script>

<template>
  <div class="fade-in">
    <div class="page-header">
      <h2>🔄 คืนหนังสือ</h2>
      <p>กรอกรหัสยืมเพื่อทำรายการคืนหนังสือ — จบได้ใน 3 วินาที</p>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>กำลังโหลดข้อมูล...</span>
    </div>

    <div v-else-if="loadError" class="card slide-up" style="text-align: center;">
      <div class="card-body" style="padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <h3 style="color: var(--accent-rose); margin-bottom: 8px;">ไม่สามารถโหลดข้อมูลได้</h3>
        <p style="color: var(--text-secondary); font-size: 13px;">{{ loadError }}</p>
        <button class="btn btn-primary" style="margin-top: 16px;" @click="location.reload()">🔄 ลองใหม่</button>
      </div>
    </div>

    <div v-else class="grid-2">
      <!-- ===== LEFT: Search & Return Form ===== -->
      <div>
        <!-- Search Card -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header">
            <h3>🔍 ค้นหารหัสยืม</h3>
          </div>
          <div class="card-body">
            <div style="margin-bottom: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--blue);">
              สแกนหรือพิมพ์รหัส — ระบบค้นหาอัตโนมัติ
            </div>
            <form @submit.prevent="searchBorrow" style="display: flex; gap: 10px;">
              <div style="flex: 1; position: relative;">
                <input
                  v-model="searchId"
                  class="form-input"
                  :class="{ error: searchError }"
                  placeholder="กรอกรหัสยืม เช่น BR20260409010519"
                  id="search-borrow-id"
                  style="text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em; font-size: 16px; padding: 14px 18px;"
                  :disabled="searching"
                  autocomplete="off"
                  autofocus
                />
              </div>
              <button type="submit" class="btn btn-primary" :disabled="searching" style="height: 50px; padding: 0 24px;">
                <span v-if="searching" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
                <span v-else>🔍 ค้นหา</span>
              </button>
            </form>
            <div v-if="searchError" class="form-error" style="margin-top: 8px;">{{ searchError }}</div>
          </div>
        </div>

        <!-- Borrow Record Details -->
        <div v-if="borrowRecord" class="card slide-up">
          <div class="card-header">
            <h3>📋 ข้อมูลการยืม</h3>
            <span
              class="badge"
              :class="{
                'badge-borrowed': borrowRecord.สถานะ === 'ยืมอยู่' && !isOverdue,
                'badge-overdue': isOverdue,
                'badge-returned': borrowRecord.สถานะ === 'คืนแล้ว',
              }"
            >
              <span class="badge-dot"></span>
              {{ isOverdue ? 'เกินกำหนด' : borrowRecord.สถานะ }}
            </span>
          </div>
          <div class="card-body">
            <!-- Book Info — Hero -->
            <div style="padding: 16px 20px; background: rgba(0, 122, 255, 0.04); border-radius: 14px; border: 1px solid rgba(0, 122, 255, 0.08); margin-bottom: 20px;">
              <div style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 6px;">หนังสือที่ยืม</div>
              <div style="font-size: 17px; font-weight: 700; color: var(--text-primary);">{{ getEquipmentName(borrowRecord.อุปกรณ์) }}</div>
              <div style="font-size: 13px; color: var(--blue); font-weight: 600; margin-top: 4px;">{{ borrowRecord.อุปกรณ์ }}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.04em;">รหัสยืม</div>
                <div style="font-weight: 700; font-size: 15px; color: var(--blue);">{{ borrowRecord.รหัสยืม }}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.04em;">ผู้ยืม</div>
                <div style="font-weight: 600; font-size: 15px;">{{ borrowRecord.ชื่อผู้ยืม }}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.04em;">รหัสนักศึกษา</div>
                <div style="font-weight: 500;">{{ borrowRecord['รหัสนศ.'] }}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.04em;">Email</div>
                <div style="font-weight: 500;">{{ borrowRecord.Email }}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.04em;">วันที่ยืม</div>
                <div>{{ borrowRecord.วันที่ยืม }} <span style="font-size: 12px; color: var(--text-muted);">({{ borrowDays }} วันที่แล้ว)</span></div>
              </div>
              <div>
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.04em;">กำหนดคืน</div>
                <div :style="{ color: isOverdue ? 'var(--red)' : 'var(--text-primary)', fontWeight: isOverdue ? '700' : '400' }">
                  {{ borrowRecord.กำหนดคืน }}
                  <span v-if="isOverdue" style="font-size: 12px; font-weight: 700; color: var(--red);"> (เกิน {{ overdueDays }} วัน!)</span>
                </div>
              </div>
            </div>

            <!-- Overdue Warning -->
            <div v-if="isOverdue" style="margin-top: 20px; padding: 14px 18px; background: rgba(255,59,48,0.06); border: 1.5px solid rgba(255,59,48,0.18); border-radius: 12px; display: flex; align-items: center; gap: 12px; animation: fadeSlideUp 0.3s ease;">
              <span style="font-size: 24px;">⚠️</span>
              <div>
                <div style="font-weight: 700; color: var(--red); font-size: 14px;">รายการนี้เกินกำหนดคืน {{ overdueDays }} วัน</div>
                <div style="font-size: 12px; color: var(--text-tertiary);">กรุณาคืนโดยเร็ว — ระบบจะส่ง Email แจ้งเตือนผู้ยืมอัตโนมัติ</div>
              </div>
            </div>

            <!-- Return Button -->
            <div v-if="borrowRecord.สถานะ === 'ยืมอยู่'" style="margin-top: 24px;">
              <button
                class="btn btn-success btn-lg"
                style="width: 100%;"
                @click="confirmReturn"
                :disabled="returning"
              >
                <span v-if="returning" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
                <span v-else>✅ ยืนยันคืนหนังสือ</span>
              </button>
            </div>

            <!-- Already Returned Info -->
            <div v-if="borrowRecord.สถานะ === 'คืนแล้ว'" style="margin-top: 20px; padding: 16px 20px; background: rgba(0,122,255,0.04); border: 1.5px solid rgba(0,122,255,0.12); border-radius: 12px; text-align: center;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 20px;">✅</span>
                <span style="font-weight: 700; color: var(--blue); font-size: 15px;">รายการนี้ถูกคืนแล้ว</span>
              </div>
              <div style="font-size: 13px; color: var(--text-tertiary); margin-top: 6px;">คืนเมื่อ {{ borrowRecord.วันที่คืน }}</div>
            </div>
          </div>
        </div>

        <!-- Return Again Button -->
        <div v-if="borrowRecord" style="margin-top: 16px; text-align: center;">
          <button class="btn btn-secondary" @click="reset">🔄 ค้นหารายการอื่น</button>
        </div>
      </div>

      <!-- ===== RIGHT: Info Panel ===== -->
      <div>
        <!-- Quick Stats -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header">
            <h3>📊 สถานะปัจจุบัน</h3>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
              <div style="text-align: center; padding: 14px 8px; border-radius: 12px; background: rgba(255, 159, 10, 0.06); border: 1px solid rgba(255, 159, 10, 0.1);">
                <div style="font-size: 24px; font-weight: 800; color: var(--amber);">{{ returnStats.activeBorrows }}</div>
                <div style="font-size: 11px; color: var(--text-tertiary); font-weight: 600; margin-top: 2px;">กำลังยืม</div>
              </div>
              <div style="text-align: center; padding: 14px 8px; border-radius: 12px; background: rgba(255, 59, 48, 0.06); border: 1px solid rgba(255, 59, 48, 0.1);">
                <div style="font-size: 24px; font-weight: 800; color: var(--red);">{{ returnStats.overdueCount }}</div>
                <div style="font-size: 11px; color: var(--text-tertiary); font-weight: 600; margin-top: 2px;">เกินกำหนด</div>
              </div>
              <div style="text-align: center; padding: 14px 8px; border-radius: 12px; background: rgba(52, 199, 89, 0.06); border: 1px solid rgba(52, 199, 89, 0.1);">
                <div style="font-size: 24px; font-weight: 800; color: var(--green-dark);">{{ returnStats.totalReturned }}</div>
                <div style="font-size: 11px; color: var(--text-tertiary); font-weight: 600; margin-top: 2px;">คืนแล้ว</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Instructions -->
        <div class="card" style="margin-bottom: 20px;">
          <div class="card-header">
            <h3>ℹ️ วิธีใช้งาน</h3>
          </div>
          <div class="card-body">
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 14px; font-size: 13px; color: var(--text-secondary);">
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: var(--blue); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">1</span>
                <div>
                  <strong>พิมพ์รหัสยืม</strong>
                  <div style="color: var(--text-tertiary); font-size: 12px; margin-top: 2px;">เช่น BR20260409010519 (ได้จาก Email ยืนยัน หรือหน้าประวัติยืม-คืน)</div>
                </div>
              </li>
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: var(--blue); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">2</span>
                <div>
                  <strong>ตรวจสอบข้อมูล</strong>
                  <div style="color: var(--text-tertiary); font-size: 12px; margin-top: 2px;">ระบบแสดงข้อมูลผู้ยืม, หนังสือ, สถานะ ให้ตรวจสอบ</div>
                </div>
              </li>
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: var(--green); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">✓</span>
                <div>
                  <strong>กดยืนยันคืน</strong>
                  <div style="color: var(--text-tertiary); font-size: 12px; margin-top: 2px;">ระบบอัปเดตสถานะ + เพิ่มสต็อก + ส่ง Email ยืนยันอัตโนมัติ</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Pending Returns — Quick List -->
        <div class="card">
          <div class="card-header">
            <h3>📋 รายการรอคืน</h3>
            <span style="font-size: 11px; color: var(--text-muted);">{{ pendingReturns.length }} รายการ</span>
          </div>
          <div class="card-body" style="padding: 6px 16px 16px;">
            <div v-if="pendingReturns.length === 0" style="text-align: center; padding: 24px; color: var(--text-tertiary); font-size: 13px;">
              🎉 ไม่มีรายการรอคืน
            </div>
            <div
              v-for="record in pendingReturns"
              :key="record.รหัสยืม"
              style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: all 150ms ease; border-bottom: 0.5px solid rgba(0,0,0,0.03);"
              :style="{ background: record.กำหนดคืน < new Date().toISOString().split('T')[0] ? 'rgba(255,59,48,0.03)' : 'transparent' }"
              @click="quickReturn(record)"
            >
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <code style="font-size: 11px; font-weight: 700; color: var(--blue); font-family: 'SF Mono', monospace;">{{ record.รหัสยืม.slice(-6) }}</code>
                  <span style="font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ record.ชื่อผู้ยืม }}</span>
                </div>
                <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ getEquipmentName(record.อุปกรณ์) }}
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div
                  style="font-size: 11px; font-weight: 600;"
                  :style="{ color: record.กำหนดคืน < new Date().toISOString().split('T')[0] ? 'var(--red)' : 'var(--text-tertiary)' }"
                >
                  {{ record.กำหนดคืน }}
                </div>
                <span
                  v-if="record.กำหนดคืน < new Date().toISOString().split('T')[0]"
                  style="font-size: 10px; font-weight: 700; color: var(--red);"
                >เกินกำหนด</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Return Modal -->
    <div v-if="returnConfirm" class="modal-overlay" @click.self="cancelReturn">
      <div class="modal-content">
        <div style="font-size: 48px; text-align: center; margin-bottom: 12px;">🔄</div>
        <h3 style="text-align: center;">ยืนยันการคืนหนังสือ?</h3>
        <div style="margin: 16px 0; padding: 14px; background: var(--glass-input); border-radius: 12px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-tertiary);">รหัสยืม</span>
            <span style="font-weight: 700; color: var(--blue);">{{ borrowRecord?.รหัสยืม }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-tertiary);">หนังสือ</span>
            <span style="font-weight: 600;">{{ getEquipmentName(borrowRecord?.อุปกรณ์) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-tertiary);">ผู้ยืม</span>
            <span>{{ borrowRecord?.ชื่อผู้ยืม }}</span>
          </div>
          <div v-if="isOverdue" style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-tertiary);">สถานะ</span>
            <span style="font-weight: 700; color: var(--red);">⚠️ เกินกำหนด {{ overdueDays }} วัน</span>
          </div>
        </div>
        <div style="padding: 12px 16px; background: rgba(52, 199, 89, 0.04); border: 1px solid rgba(52, 199, 89, 0.12); border-radius: 10px; margin-bottom: 8px;">
          <div style="font-size: 12px; color: var(--text-secondary); text-align: center;">
            📨 ระบบจะอัปเดตข้อมูลและส่ง Email ยืนยันให้ผู้ยืมอัตโนมัติ
          </div>
        </div>
        <p style="font-size: 12px; color: var(--text-tertiary); text-align: center;">
          ⚠️ เมื่อยืนยันแล้วจะไม่สามารถย้อนกลับได้
        </p>
        <div class="modal-actions" style="justify-content: center; gap: 12px; margin-top: 20px;">
          <button class="btn btn-secondary" @click="cancelReturn">ยกเลิก</button>
          <button class="btn btn-success" @click="handleReturn" :disabled="returning">
            <span v-if="returning" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
            <span v-else>✅ ยืนยันคืน</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Result Modal -->
    <div v-if="showResult" class="modal-overlay" @click.self="showResult = false">
      <div class="modal-content" style="text-align: center;">
        <div style="font-size: 56px; margin-bottom: 16px;">{{ resultSuccess ? '✅' : '❌' }}</div>
        <h3 :style="{ color: resultSuccess ? 'var(--green-dark)' : 'var(--red)' }">
          {{ resultSuccess ? 'คืนหนังสือสำเร็จ!' : 'ไม่สำเร็จ' }}
        </h3>
        <p style="margin-top: 8px;">{{ resultMessage }}</p>
        <div v-if="resultSuccess" style="margin-top: 16px; padding: 14px 18px; background: rgba(52, 199, 89, 0.04); border: 1px solid rgba(52, 199, 89, 0.12); border-radius: 12px; font-size: 13px; color: var(--text-secondary);">
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px;">
            <span>📨</span>
            <span style="font-weight: 600;">Email ยืนยันการคืนถูกส่งเรียบร้อยแล้ว</span>
          </div>
          <div style="font-size: 12px; color: var(--text-tertiary);">
            สต็อกหนังสือถูกอัปเดตเรียบร้อยแล้ว
          </div>
        </div>
        <div class="modal-actions" style="justify-content: center; margin-top: 24px; gap: 10px;">
          <button class="btn btn-secondary" @click="reset(); showResult = false">🔄 คืนรายการอื่น</button>
          <button class="btn btn-primary" @click="showResult = false">ตกลง</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
