<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.js'

const borrowHistory = ref([])
const equipment = ref([])
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const searchQuery = ref('')
const selectedStatus = ref('ทั้งหมด')
const lastUpdated = ref(null)

// === Return Logic ===
const returningId = ref(null)
const returnConfirm = ref(null)
const showResult = ref(false)
const resultSuccess = ref(false)
const resultMessage = ref('')

async function fetchData(isRefresh = false) {
  if (isRefresh) {
    refreshing.value = true
    errorMessage.value = ''
  }
  try {
    const [history, eq] = await Promise.all([
      api.getBorrowHistory(),
      api.getEquipment(),
    ])
    borrowHistory.value = history
    equipment.value = eq
    lastUpdated.value = new Date()
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(() => fetchData())

const statusTabs = ['ทั้งหมด', 'ยืมอยู่', 'คืนแล้ว', 'เกินกำหนด']

const filteredHistory = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return borrowHistory.value.filter(r => {
    const matchSearch = searchQuery.value === '' ||
      r.ชื่อผู้ยืม.includes(searchQuery.value) ||
      r['รหัสนศ.'].includes(searchQuery.value) ||
      r.รหัสยืม.toUpperCase().includes(searchQuery.value.toUpperCase())

    const isOverdue = r.สถานะ === 'ยืมอยู่' && r.กำหนดคืน < today
    let matchStatus = true
    if (selectedStatus.value === 'ยืมอยู่') matchStatus = r.สถานะ === 'ยืมอยู่' && !isOverdue
    else if (selectedStatus.value === 'คืนแล้ว') matchStatus = r.สถานะ === 'คืนแล้ว'
    else if (selectedStatus.value === 'เกินกำหนด') matchStatus = isOverdue

    return matchSearch && matchStatus
  }).sort((a, b) => {
    // เรียงจากล่าสุด → เก่าสุด
    const dateA = a.วันที่ยืม || ''
    const dateB = b.วันที่ยืม || ''
    return dateB.localeCompare(dateA) || b.รหัสยืม.localeCompare(a.รหัสยืม)
  })
})

const statusCounts = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const counts = { ทั้งหมด: borrowHistory.value.length, ยืมอยู่: 0, คืนแล้ว: 0, เกินกำหนด: 0 }
  borrowHistory.value.forEach(r => {
    if (r.สถานะ === 'คืนแล้ว') counts['คืนแล้ว']++
    else if (r.สถานะ === 'ยืมอยู่' && r.กำหนดคืน < today) counts['เกินกำหนด']++
    else if (r.สถานะ === 'ยืมอยู่') counts['ยืมอยู่']++
  })
  return counts
})

const lastUpdatedText = computed(() => {
  if (!lastUpdated.value) return ''
  return lastUpdated.value.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

function getEquipmentName(id) {
  const eq = equipment.value.find(e => e.รหัสอุปกรณ์ === id)
  return eq ? eq.ชื่ออุปกรณ์ : id
}

function getStatusBadgeClass(record) {
  const today = new Date().toISOString().split('T')[0]
  if (record.สถานะ === 'คืนแล้ว') return 'badge-returned'
  if (record.สถานะ === 'ยืมอยู่' && record.กำหนดคืน < today) return 'badge-overdue'
  return 'badge-borrowed'
}

function getStatusLabel(record) {
  const today = new Date().toISOString().split('T')[0]
  if (record.สถานะ === 'ยืมอยู่' && record.กำหนดคืน < today) return 'เกินกำหนด'
  return record.สถานะ
}

// === Return Functions ===
function confirmReturn(record) {
  returnConfirm.value = record
}

async function handleReturn() {
  const record = returnConfirm.value
  if (!record || returningId.value) return
  returningId.value = record.รหัสยืม
  returnConfirm.value = null
  try {
    const result = await api.returnEquipment(record.รหัสยืม)
    resultSuccess.value = result.success
    resultMessage.value = result.message || (result.success ? 'คืนหนังสือสำเร็จ!' : 'ไม่สำเร็จ')
    showResult.value = true
    if (result.success) {
      // อัปเดต local data ทันที
      record.สถานะ = 'คืนแล้ว'
      record.วันที่คืน = new Date().toISOString().split('T')[0]
    }
  } catch (err) {
    resultSuccess.value = false
    resultMessage.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    showResult.value = true
  } finally {
    returningId.value = null
  }
}

// Pagination
const currentPage = ref(1)
const itemsPerPage = 10

const totalPages = computed(() => Math.ceil(filteredHistory.value.length / itemsPerPage))
const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredHistory.value.slice(start, start + itemsPerPage)
})

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Export CSV
function exportCSV() {
  const today = new Date().toISOString().split('T')[0]
  const headers = ['รหัสยืม', 'รหัสนศ.', 'ชื่อผู้ยืม', 'Email', 'รหัสหนังสือ', 'ชื่อหนังสือ', 'วันที่ยืม', 'กำหนดคืน', 'วันที่คืน', 'สถานะ']

  const BOM = '\uFEFF'
  const csvRows = [headers.join(',')]

  filteredHistory.value.forEach(r => {
    const status = r.สถานะ === 'ยืมอยู่' && r.กำหนดคืน < today ? 'เกินกำหนด' : r.สถานะ
    const row = [
      r.รหัสยืม,
      r['รหัสนศ.'],
      `"${r.ชื่อผู้ยืม}"`,
      r.Email,
      r.อุปกรณ์,
      `"${getEquipmentName(r.อุปกรณ์)}"`,
      r.วันที่ยืม,
      r.กำหนดคืน,
      r.วันที่คืน,
      status,
    ]
    csvRows.push(row.join(','))
  })

  const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `borrow-history-${today}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="fade-in">
    <div class="page-header" style="display: flex; align-items: flex-start; justify-content: space-between;">
      <div>
        <h2>📋 ประวัติยืม-คืน</h2>
        <p>รายการยืม-คืนหนังสือ/ทรัพยากรทั้งหมด — ดูสถานะ, Export CSV, หรือคืนหนังสือ</p>
      </div>
      <div v-if="!loading && !errorMessage" style="display: flex; align-items: center; gap: 8px;">
        <span v-if="lastUpdatedText" style="font-size: 11px; color: var(--text-muted);">
          อัปเดตเมื่อ {{ lastUpdatedText }}
        </span>
        <button
          class="btn btn-secondary btn-sm"
          @click="exportCSV"
          :disabled="filteredHistory.length === 0"
          style="display: flex; align-items: center; gap: 5px;"
        >
          📥 Export CSV
        </button>
        <button
          class="btn btn-secondary btn-sm"
          @click="fetchData(true)"
          :disabled="refreshing"
          style="display: flex; align-items: center; gap: 5px;"
        >
          <span v-if="refreshing" class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span>
          <span v-else>🔄</span>
          รีเฟรช
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="search-input-wrapper">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          class="form-input"
          placeholder="ค้นหาด้วยรหัสยืม, รหัสนศ. หรือชื่อ..."
          id="search-history"
          @input="currentPage = 1"
        />
      </div>
      <div class="filter-tabs">
        <button
          v-for="status in statusTabs"
          :key="status"
          class="filter-tab"
          :class="{ active: selectedStatus === status }"
          @click="selectedStatus = status; currentPage = 1"
        >
          {{ status }}
          <span style="margin-left: 4px; opacity: 0.6; font-size: 11px;">({{ statusCounts[status] }})</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>กำลังโหลดข้อมูล...</span>
    </div>

    <!-- Error -->
    <div v-else-if="errorMessage" class="card slide-up" style="text-align: center;">
      <div class="card-body" style="padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <h3 style="color: var(--accent-rose); margin-bottom: 8px;">ไม่สามารถโหลดข้อมูลได้</h3>
        <p style="color: var(--text-secondary); font-size: 13px;">{{ errorMessage }}</p>
        <button class="btn btn-primary" style="margin-top: 16px;" @click="fetchData(true)">
          <span v-if="refreshing" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
          <span v-else>🔄 ลองใหม่</span>
        </button>
      </div>
    </div>

    <!-- History Table -->
    <div v-else class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>รหัสยืม</th>
                <th>รหัสนศ.</th>
                <th>ผู้ยืม</th>
                <th>หนังสือ</th>
                <th>วันที่ยืม</th>
                <th>กำหนดคืน</th>
                <th>วันที่คืน</th>
                <th>สถานะ</th>
                <th style="text-align: center;">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in paginatedHistory" :key="record.รหัสยืม">
                <td style="font-weight: 600; color: var(--accent-primary);">{{ record.รหัสยืม }}</td>
                <td>{{ record['รหัสนศ.'] }}</td>
                <td style="font-weight: 500;">{{ record.ชื่อผู้ยืม }}</td>
                <td>{{ getEquipmentName(record.อุปกรณ์) }}</td>
                <td>{{ record.วันที่ยืม }}</td>
                <td>{{ record.กำหนดคืน }}</td>
                <td>{{ record.วันที่คืน === '-' ? '—' : record.วันที่คืน }}</td>
                <td>
                  <span class="badge" :class="getStatusBadgeClass(record)">
                    <span class="badge-dot"></span>
                    {{ getStatusLabel(record) }}
                  </span>
                </td>
                <td style="text-align: center;">
                  <button
                    v-if="record.สถานะ === 'ยืมอยู่'"
                    class="btn-return"
                    @click="confirmReturn(record)"
                    :disabled="returningId === record.รหัสยืม"
                  >
                    <span v-if="returningId === record.รหัสยืม" class="spinner" style="width: 12px; height: 12px; border-width: 2px;"></span>
                    <span v-else>↩ คืนหนังสือ</span>
                  </button>
                  <span v-else style="font-size: 11px; color: var(--text-muted);">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="filteredHistory.length === 0" class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>ไม่พบรายการ</h3>
          <p>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; border-top: 1px solid var(--border-primary);">
          <button class="btn btn-sm btn-secondary" @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">
            ←
          </button>
          <template v-for="page in totalPages" :key="page">
            <button
              class="btn btn-sm"
              :class="page === currentPage ? 'btn-primary' : 'btn-secondary'"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
          </template>
          <button class="btn btn-sm btn-secondary" @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">
            →
          </button>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div style="margin-top: 16px; display: flex; gap: 8px; font-size: 12px; color: var(--text-tertiary);">
      <span>แสดง {{ paginatedHistory.length }} จาก {{ filteredHistory.length }} รายการ</span>
    </div>

    <!-- Confirm Return Modal -->
    <div v-if="returnConfirm" class="modal-overlay" @click.self="returnConfirm = null">
      <div class="modal-content">
        <div style="font-size: 48px; text-align: center; margin-bottom: 12px;">🔄</div>
        <h3 style="text-align: center;">ยืนยันการคืนหนังสือ?</h3>
        <div style="margin: 16px 0; padding: 14px; background: var(--bg-input); border-radius: 10px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-tertiary);">รหัสยืม</span>
            <span style="font-weight: 600; color: var(--accent-primary);">{{ returnConfirm?.รหัสยืม }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-tertiary);">หนังสือ</span>
            <span style="font-weight: 500;">{{ getEquipmentName(returnConfirm?.อุปกรณ์) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-tertiary);">ผู้ยืม</span>
            <span>{{ returnConfirm?.ชื่อผู้ยืม }}</span>
          </div>
        </div>
        <p style="font-size: 12px; color: var(--text-tertiary); text-align: center;">
          ⚠️ เมื่อยืนยันแล้วจะไม่สามารถย้อนกลับได้<br>
          ระบบจะอัปเดตสถานะและส่ง Email ยืนยันทันที
        </p>
        <div class="modal-actions" style="justify-content: center; gap: 12px; margin-top: 20px;">
          <button class="btn btn-secondary" @click="returnConfirm = null">ยกเลิก</button>
          <button class="btn btn-success" @click="handleReturn" :disabled="returningId">
            <span v-if="returningId" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
            <span v-else>✅ ยืนยันคืน</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Result Modal -->
    <div v-if="showResult" class="modal-overlay" @click.self="showResult = false">
      <div class="modal-content" style="text-align: center;">
        <div style="font-size: 56px; margin-bottom: 16px;">{{ resultSuccess ? '✅' : '❌' }}</div>
        <h3 :style="{ color: resultSuccess ? 'var(--accent-emerald-dark)' : 'var(--accent-rose)' }">
          {{ resultSuccess ? 'คืนหนังสือสำเร็จ!' : 'ไม่สำเร็จ' }}
        </h3>
        <p style="margin-top: 8px;">{{ resultMessage }}</p>
        <div class="modal-actions" style="justify-content: center; margin-top: 24px;">
          <button class="btn btn-primary" @click="showResult = false">ตกลง</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-return {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #34c759 0%, #30d158 100%);
  color: white;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
}

.btn-return:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3);
}

.btn-return:active {
  transform: scale(0.97);
}

.btn-return:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
