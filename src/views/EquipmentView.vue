<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.js'

const equipment = ref([])
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const searchQuery = ref('')
const selectedCategory = ref('ทั้งหมด')
const lastUpdated = ref(null)

async function fetchData(isRefresh = false) {
  if (isRefresh) {
    refreshing.value = true
    errorMessage.value = ''
  }
  try {
    equipment.value = await api.getEquipment()
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

const categories = computed(() => {
  const cats = new Set(equipment.value.map(e => e.หมวดหมู่))
  return ['ทั้งหมด', ...cats]
})

const filteredEquipment = computed(() => {
  return equipment.value.filter(e => {
    const matchSearch = searchQuery.value === '' ||
      e.ชื่ออุปกรณ์.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      e.รหัสอุปกรณ์.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchCategory = selectedCategory.value === 'ทั้งหมด' || e.หมวดหมู่ === selectedCategory.value
    return matchSearch && matchCategory
  })
})

const lastUpdatedText = computed(() => {
  if (!lastUpdated.value) return ''
  return lastUpdated.value.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

function getStockPercent(item) {
  return (Number(item.จำนวนคงเหลือ) / Number(item.จำนวนทั้งหมด)) * 100
}

function getStockColor(item) {
  const pct = getStockPercent(item)
  if (pct === 0) return 'red'
  if (pct <= 30) return 'amber'
  return 'green'
}
</script>

<template>
  <div class="fade-in">
    <div class="page-header" style="display: flex; align-items: flex-start; justify-content: space-between;">
      <div>
        <h2>📦 รายการหนังสือ</h2>
        <p>หนังสือ/ทรัพยากรทั้งหมดที่มีในระบบ</p>
      </div>
      <div v-if="!loading && !errorMessage" style="display: flex; align-items: center; gap: 10px;">
        <span v-if="lastUpdatedText" style="font-size: 11px; color: var(--text-muted);">
          อัปเดตเมื่อ {{ lastUpdatedText }}
        </span>
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
          placeholder="ค้นหาหนังสือ... (ชื่อ, รหัส)"
          id="search-equipment"
        />
      </div>
      <div class="filter-tabs">
        <button
          v-for="cat in categories"
          :key="cat"
          class="filter-tab"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
        >
          {{ cat }}
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
        <h3 style="color: var(--accent-rose); margin-bottom: 8px;">ไม่สามารถโหลดข้อมูลหนังสือได้</h3>
        <p style="color: var(--text-secondary); font-size: 13px;">{{ errorMessage }}</p>
        <button class="btn btn-primary" style="margin-top: 16px;" @click="fetchData(true)">
          <span v-if="refreshing" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
          <span v-else>🔄 ลองใหม่</span>
        </button>
      </div>
    </div>

    <!-- Equipment Table -->
    <div v-else class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อหนังสือ/ทรัพยากร</th>
                <th>หมวดหมู่</th>
                <th>จำนวนทั้งหมด</th>
                <th>คงเหลือ</th>
                <th>สถานะ</th>
                <th style="width: 140px;">สต็อก</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredEquipment" :key="item.รหัสอุปกรณ์">
                <td style="font-weight: 600; color: var(--accent-primary);">{{ item.รหัสอุปกรณ์ }}</td>
                <td style="font-weight: 500;">{{ item.ชื่ออุปกรณ์ }}</td>
                <td>
                  <span style="padding: 4px 10px; border-radius: 6px; background: var(--bg-input); font-size: 12px; color: var(--text-secondary);">
                    {{ item.หมวดหมู่ }}
                  </span>
                </td>
                <td style="text-align: center;">{{ item.จำนวนทั้งหมด }}</td>
                <td style="text-align: center; font-weight: 700;" :style="{ color: Number(item.จำนวนคงเหลือ) > 0 ? 'var(--accent-emerald-dark)' : 'var(--accent-rose)' }">
                  {{ item.จำนวนคงเหลือ }}
                </td>
                <td>
                  <span class="badge" :class="item.สถานะ === 'พร้อมใช้' ? 'badge-available' : 'badge-out'">
                    <span class="badge-dot"></span>
                    {{ item.สถานะ }}
                  </span>
                </td>
                <td>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :class="getStockColor(item)"
                      :style="{ width: getStockPercent(item) + '%' }"
                    ></div>
                  </div>
                  <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">
                    {{ item.จำนวนคงเหลือ }}/{{ item.จำนวนทั้งหมด }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="filteredEquipment.length === 0" class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>ไม่พบหนังสือ</h3>
          <p>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
        </div>
      </div>
      <!-- Summary Bar -->
      <div v-if="filteredEquipment.length > 0" style="padding: 12px 20px; border-top: 1px solid var(--border-primary); display: flex; justify-content: space-between; font-size: 12px; color: var(--text-tertiary);">
        <span>แสดง {{ filteredEquipment.length }} จาก {{ equipment.length }} รายการ</span>
        <span>รวมคงเหลือ: <strong style="color: var(--accent-emerald-dark);">{{ filteredEquipment.reduce((s, e) => s + Number(e.จำนวนคงเหลือ), 0) }}</strong> ชิ้น</span>
      </div>
    </div>
  </div>
</template>
