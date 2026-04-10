<script setup>
import { ref, computed, onMounted } from 'vue'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import api from '../services/api.js'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const equipment = ref([])
const borrowHistory = ref([])
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const lastUpdated = ref(null)

async function fetchData(isRefresh = false) {
  if (isRefresh) {
    refreshing.value = true
    errorMessage.value = ''
  }
  try {
    const [eq, history] = await Promise.all([
      api.getEquipment(),
      api.getBorrowHistory(),
    ])
    equipment.value = eq
    borrowHistory.value = history
    lastUpdated.value = new Date()
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error.message
    console.error('❌ Dashboard:', error.message)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(() => fetchData())

// Stats
const totalEquipment = computed(() => equipment.value.reduce((sum, e) => sum + Number(e.จำนวนทั้งหมด), 0))
const totalBorrowed = computed(() => equipment.value.reduce((sum, e) => sum + (Number(e.จำนวนทั้งหมด) - Number(e.จำนวนคงเหลือ)), 0))
const totalAvailable = computed(() => equipment.value.reduce((sum, e) => sum + Number(e.จำนวนคงเหลือ), 0))
const overdueCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return borrowHistory.value.filter(r => r.สถานะ === 'ยืมอยู่' && r.กำหนดคืน < today).length
})

// Formatted last updated time
const lastUpdatedText = computed(() => {
  if (!lastUpdated.value) return ''
  return lastUpdated.value.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

// Category chart
const categoryData = computed(() => {
  const cats = {}
  equipment.value.forEach(e => {
    cats[e.หมวดหมู่] = (cats[e.หมวดหมู่] || 0) + Number(e.จำนวนทั้งหมด)
  })
  return {
    labels: Object.keys(cats),
    datasets: [{
      data: Object.values(cats),
      backgroundColor: [
        'rgba(0, 122, 255, 0.75)',
        'rgba(48, 209, 88, 0.75)',
        'rgba(255, 59, 48, 0.75)',
        'rgba(255, 149, 0, 0.75)',
        'rgba(90, 200, 250, 0.75)',
        'rgba(175, 82, 222, 0.75)',
        'rgba(255, 45, 85, 0.75)',
      ],
      borderColor: 'transparent',
      borderWidth: 0,
      hoverOffset: 8,
    }]
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#6e6e73',
        font: { family: 'Inter', size: 12 },
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 10,
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255,255,255,0.96)',
      titleColor: '#1d1d1f',
      bodyColor: '#6e6e73',
      borderColor: 'rgba(0,0,0,0.08)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: 'Inter', weight: '600' },
      bodyFont: { family: 'Inter' },
    }
  }
}

// Top borrowed equipment
const topBorrowedData = computed(() => {
  const counts = {}
  borrowHistory.value.forEach(r => {
    counts[r.อุปกรณ์] = (counts[r.อุปกรณ์] || 0) + 1
  })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  return {
    labels: sorted.map(([id]) => {
      const eq = equipment.value.find(e => e.รหัสอุปกรณ์ === id)
      return eq ? eq.ชื่ออุปกรณ์.substring(0, 20) : id
    }),
    datasets: [{
      label: 'จำนวนครั้งที่ถูกยืม',
      data: sorted.map(([, count]) => count),
      backgroundColor: 'rgba(0, 122, 255, 0.6)',
      borderColor: 'rgba(0, 122, 255, 1)',
      borderWidth: 1,
      borderRadius: 6,
      barThickness: 28,
    }]
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  scales: {
    x: {
      grid: { color: 'rgba(0,0,0,0.04)' },
      ticks: { color: '#86868b', font: { family: 'Inter', size: 11 }, stepSize: 1 },
    },
    y: {
      grid: { display: false },
      ticks: { color: '#6e6e73', font: { family: 'Inter', size: 11 } },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(255,255,255,0.96)',
      titleColor: '#1d1d1f',
      bodyColor: '#6e6e73',
      borderColor: 'rgba(0,0,0,0.08)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    }
  }
}

// Recent activity
const recentActivity = computed(() => {
  return [...borrowHistory.value].sort((a, b) => {
    const dateA = a.วันที่คืน !== '-' ? a.วันที่คืน : a.วันที่ยืม
    const dateB = b.วันที่คืน !== '-' ? b.วันที่คืน : b.วันที่ยืม
    return dateB.localeCompare(dateA)
  }).slice(0, 5)
})

function getEquipmentName(id) {
  const eq = equipment.value.find(e => e.รหัสอุปกรณ์ === id)
  return eq ? eq.ชื่ออุปกรณ์ : id
}
</script>

<template>
  <div class="fade-in">
    <div class="page-header" style="display: flex; align-items: flex-start; justify-content: space-between;">
      <div>
        <h2>📊 แดชบอร์ด</h2>
        <p>ภาพรวมระบบยืม-คืนหนังสือ/ทรัพยากร</p>
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

    <!-- Loading -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>กำลังโหลดข้อมูล...</span>
    </div>

    <!-- Error State — n8n ไม่เชื่อมต่อ -->
    <div v-else-if="errorMessage" class="card slide-up" style="max-width: 600px; margin: 60px auto; text-align: center;">
      <div class="card-body" style="padding: 40px;">
        <div style="font-size: 56px; margin-bottom: 16px;">⚠️</div>
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; color: var(--accent-rose);">ไม่สามารถเชื่อมต่อระบบได้</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">{{ errorMessage }}</p>
        <div style="text-align: left; background: var(--bg-input); padding: 16px; border-radius: 10px; font-size: 13px; color: var(--text-secondary); line-height: 2;">
          <strong style="color: var(--text-primary);">📋 สิ่งที่ควรตรวจสอบ:</strong><br>
          1. ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต<br>
          2. ลองรีเฟรชหน้าเว็บ<br>
          3. หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ
        </div>
        <button class="btn btn-primary" style="margin-top: 20px;" @click="fetchData(true)">
          <span v-if="refreshing" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
          <span v-else>🔄 ลองใหม่</span>
        </button>
      </div>
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-card-header">
            <span class="stat-card-label">หนังสือทั้งหมด</span>
            <div class="stat-card-icon">📦</div>
          </div>
          <div class="stat-card-value">{{ totalEquipment }}</div>
          <div class="stat-card-desc">{{ equipment.length }} รายการ</div>
        </div>

        <div class="stat-card amber">
          <div class="stat-card-header">
            <span class="stat-card-label">ถูกยืมอยู่</span>
            <div class="stat-card-icon">📋</div>
          </div>
          <div class="stat-card-value">{{ totalBorrowed }}</div>
          <div class="stat-card-desc">กำลังถูกใช้งาน</div>
        </div>

        <div class="stat-card emerald">
          <div class="stat-card-header">
            <span class="stat-card-label">พร้อมใช้</span>
            <div class="stat-card-icon">✅</div>
          </div>
          <div class="stat-card-value">{{ totalAvailable }}</div>
          <div class="stat-card-desc">พร้อมให้ยืม</div>
        </div>

        <div class="stat-card rose">
          <div class="stat-card-header">
            <span class="stat-card-label">เกินกำหนดคืน</span>
            <div class="stat-card-icon">⚠️</div>
          </div>
          <div class="stat-card-value">{{ overdueCount }}</div>
          <div class="stat-card-desc">ต้องติดตาม</div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid-2" style="margin-bottom: 24px;">
        <div class="card">
          <div class="card-header">
            <h3>📊 สัดส่วนหมวดหมู่หนังสือ</h3>
          </div>
          <div class="card-body">
            <div class="chart-container" style="height: 280px;">
              <Doughnut :data="categoryData" :options="doughnutOptions" />
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>🏆 หนังสือยืมบ่อยที่สุด</h3>
          </div>
          <div class="card-body">
            <div class="chart-container" style="height: 280px;">
              <Bar :data="topBorrowedData" :options="barOptions" />
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header">
          <h3>🕐 กิจกรรมล่าสุด</h3>
        </div>
        <div class="card-body">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>รหัสยืม</th>
                  <th>ผู้ยืม</th>
                  <th>หนังสือ</th>
                  <th>วันที่ยืม</th>
                  <th>กำหนดคืน</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in recentActivity" :key="item.รหัสยืม">
                  <td style="font-weight: 600; color: var(--accent-primary);">{{ item.รหัสยืม }}</td>
                  <td>{{ item.ชื่อผู้ยืม }}</td>
                  <td>{{ getEquipmentName(item.อุปกรณ์) }}</td>
                  <td>{{ item.วันที่ยืม }}</td>
                  <td>{{ item.กำหนดคืน }}</td>
                  <td>
                    <span
                      class="badge"
                      :class="{
                        'badge-borrowed': item.สถานะ === 'ยืมอยู่' && item.กำหนดคืน >= new Date().toISOString().split('T')[0],
                        'badge-returned': item.สถานะ === 'คืนแล้ว',
                        'badge-overdue': item.สถานะ === 'เกินกำหนด' || (item.สถานะ === 'ยืมอยู่' && item.กำหนดคืน < new Date().toISOString().split('T')[0]),
                      }"
                    >
                      <span class="badge-dot"></span>
                      {{ item.สถานะ === 'เกินกำหนด' || (item.สถานะ === 'ยืมอยู่' && item.กำหนดคืน < new Date().toISOString().split('T')[0]) ? 'เกินกำหนด' : item.สถานะ }}
                    </span>
                  </td>
                </tr>
                <tr v-if="recentActivity.length === 0">
                  <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-tertiary);">
                    ยังไม่มีกิจกรรม
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
