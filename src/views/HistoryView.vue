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
    // Search filter
    const matchSearch = searchQuery.value === '' ||
      r.ชื่อผู้ยืม.includes(searchQuery.value) ||
      r['รหัสนศ.'].includes(searchQuery.value) ||
      r.รหัสยืม.toUpperCase().includes(searchQuery.value.toUpperCase())

    // Status filter
    const isOverdue = r.สถานะ === 'ยืมอยู่' && r.กำหนดคืน < today
    let matchStatus = true
    if (selectedStatus.value === 'ยืมอยู่') matchStatus = r.สถานะ === 'ยืมอยู่' && !isOverdue
    else if (selectedStatus.value === 'คืนแล้ว') matchStatus = r.สถานะ === 'คืนแล้ว'
    else if (selectedStatus.value === 'เกินกำหนด') matchStatus = isOverdue

    return matchSearch && matchStatus
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

  // BOM for Thai characters
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
        <p>รายการยืม-คืนหนังสือ/ทรัพยากรทั้งหมด</p>
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
      <span>กำลังโหลดข้อมูลจาก n8n + Google Sheets...</span>
    </div>

    <!-- Error -->
    <div v-else-if="errorMessage" class="card slide-up" style="text-align: center;">
      <div class="card-body" style="padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <h3 style="color: var(--accent-rose); margin-bottom: 8px;">ไม่สามารถโหลดประวัติยืม-คืนได้</h3>
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
  </div>
</template>
