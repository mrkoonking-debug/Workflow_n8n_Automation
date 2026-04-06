<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.js'

const borrowHistory = ref([])
const equipment = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedStatus = ref('ทั้งหมด')

onMounted(async () => {
  const [history, eq] = await Promise.all([
    api.getBorrowHistory(),
    api.getEquipment(),
  ])
  borrowHistory.value = history
  equipment.value = eq
  loading.value = false
})

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
</script>

<template>
  <div class="fade-in">
    <div class="page-header">
      <h2>📋 ประวัติยืม-คืน</h2>
      <p>รายการยืม-คืนอุปกรณ์ทั้งหมด</p>
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
                <th>อุปกรณ์</th>
                <th>วันที่ยืม</th>
                <th>กำหนดคืน</th>
                <th>วันที่คืน</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in paginatedHistory" :key="record.รหัสยืม">
                <td style="font-weight: 600; color: var(--accent-primary-light);">{{ record.รหัสยืม }}</td>
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
