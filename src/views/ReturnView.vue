<script setup>
import { ref, computed } from 'vue'
import api from '../services/api.js'

const searchId = ref('')
const searching = ref(false)
const returning = ref(false)
const showResult = ref(false)
const resultSuccess = ref(false)
const resultMessage = ref('')
const borrowRecord = ref(null)
const equipment = ref([])
const searchError = ref('')
const returnConfirm = ref(false)

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
    // Load equipment for name lookup
    if (equipment.value.length === 0) {
      equipment.value = await api.getEquipment()
    }

    const record = await api.findBorrowRecord(trimmedId)
    if (record) {
      borrowRecord.value = record
    } else {
      searchError.value = 'ไม่พบรหัสยืมนี้ในระบบ'
    }
  } catch (error) {
    searchError.value = error.message || 'ไม่สามารถค้นหาได้ กรุณาตรวจสอบการเชื่อมต่อ n8n'
    console.error('❌ ค้นหารหัสยืมล้มเหลว:', error.message)
  } finally {
    searching.value = false
  }
}

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
  if (returning.value) return // double-submit guard
  returning.value = true
  try {
    const result = await api.returnEquipment(borrowRecord.value.รหัสยืม)
    resultSuccess.value = result.success
    resultMessage.value = result.message
    showResult.value = true
    if (result.success) {
      borrowRecord.value.สถานะ = 'คืนแล้ว'
      borrowRecord.value.วันที่คืน = new Date().toISOString().split('T')[0]
    }
  } catch (err) {
    resultSuccess.value = false
    resultMessage.value = err.message || 'ไม่สามารถเชื่อมต่อ n8n ได้ กรุณาตรวจสอบ'
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
</script>

<template>
  <div class="fade-in">
    <div class="page-header">
      <h2>🔄 คืนหนังสือ</h2>
      <p>กรอกรหัสยืมเพื่อทำรายการคืนหนังสือ/ทรัพยากร</p>
    </div>

    <div style="max-width: 700px;">
      <!-- Search Form -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <h3>🔍 ค้นหารหัสยืม</h3>
        </div>
        <div class="card-body">
          <form @submit.prevent="searchBorrow" style="display: flex; gap: 12px;">
            <div style="flex: 1;">
              <input
                v-model="searchId"
                class="form-input"
                :class="{ error: searchError }"
                placeholder="กรอกรหัสยืม เช่น BR001"
                id="search-borrow-id"
                style="text-transform: uppercase;"
                :disabled="searching"
              />
              <div v-if="searchError" class="form-error">{{ searchError }}</div>
            </div>
            <button type="submit" class="btn btn-primary" :disabled="searching" style="height: 46px;">
              <span v-if="searching" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
              <span v-else>ค้นหา</span>
            </button>
          </form>
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
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">รหัสยืม</div>
              <div style="font-weight: 700; font-size: 18px; color: var(--accent-primary);">{{ borrowRecord.รหัสยืม }}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">ผู้ยืม</div>
              <div style="font-weight: 500;">{{ borrowRecord.ชื่อผู้ยืม }}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">รหัสนักศึกษา</div>
              <div>{{ borrowRecord['รหัสนศ.'] }}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">Email</div>
              <div>{{ borrowRecord.Email }}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">หนังสือ</div>
              <div style="font-weight: 500;">{{ getEquipmentName(borrowRecord.อุปกรณ์) }}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">รหัสอุปกรณ์</div>
              <div style="color: var(--accent-cyan);">{{ borrowRecord.อุปกรณ์ }}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">วันที่ยืม</div>
              <div>{{ borrowRecord.วันที่ยืม }}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">กำหนดคืน</div>
              <div :style="{ color: isOverdue ? 'var(--accent-rose)' : 'var(--text-primary)', fontWeight: isOverdue ? '700' : '400' }">
                {{ borrowRecord.กำหนดคืน }}
                <span v-if="isOverdue" style="font-size: 12px;"> (เกิน {{ overdueDays }} วัน)</span>
              </div>
            </div>
          </div>

          <!-- Overdue Warning -->
          <div v-if="isOverdue" style="margin-top: 20px; padding: 14px 18px; background: rgba(255,59,48,0.06); border: 1px solid rgba(255,59,48,0.15); border-radius: 10px; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">⚠️</span>
            <div>
              <div style="font-weight: 600; color: var(--accent-rose); font-size: 14px;">รายการนี้เกินกำหนดคืน {{ overdueDays }} วัน</div>
              <div style="font-size: 12px; color: var(--text-tertiary);">กรุณาคืนโดยเร็ว</div>
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
          <div v-if="borrowRecord.สถานะ === 'คืนแล้ว'" style="margin-top: 20px; padding: 14px 18px; background: rgba(0,122,255,0.05); border: 1px solid rgba(0,122,255,0.12); border-radius: 10px; text-align: center;">
            <div style="font-weight: 600; color: var(--accent-primary);">รายการนี้ถูกคืนแล้ว</div>
            <div style="font-size: 13px; color: var(--text-tertiary); margin-top: 4px;">คืนเมื่อ {{ borrowRecord.วันที่คืน }}</div>
          </div>
        </div>
      </div>

      <!-- Return Again Button -->
      <div v-if="borrowRecord" style="margin-top: 16px; text-align: center;">
        <button class="btn btn-secondary" @click="reset">🔄 ค้นหารายการอื่น</button>
      </div>
    </div>

    <!-- Confirm Return Modal -->
    <div v-if="returnConfirm" class="modal-overlay" @click.self="cancelReturn">
      <div class="modal-content">
        <div style="font-size: 48px; text-align: center; margin-bottom: 12px;">🔄</div>
        <h3 style="text-align: center;">ยืนยันการคืนหนังสือ?</h3>
        <div style="margin: 16px 0; padding: 14px; background: var(--bg-input); border-radius: 10px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-tertiary);">รหัสยืม</span>
            <span style="font-weight: 600; color: var(--accent-primary);">{{ borrowRecord?.รหัสยืม }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-tertiary);">หนังสือ</span>
            <span style="font-weight: 500;">{{ getEquipmentName(borrowRecord?.อุปกรณ์) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-tertiary);">ผู้ยืม</span>
            <span>{{ borrowRecord?.ชื่อผู้ยืม }}</span>
          </div>
        </div>
        <p style="font-size: 12px; color: var(--text-tertiary); text-align: center;">
          ⚠️ เมื่อยืนยันแล้วจะไม่สามารถย้อนกลับได้<br>
          ระบบจะอัปเดตสถานะและส่ง Email ยืนยันทันที
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
        <h3 :style="{ color: resultSuccess ? 'var(--accent-emerald-dark)' : 'var(--accent-rose)' }">
          {{ resultSuccess ? 'คืนหนังสือสำเร็จ!' : 'ไม่สำเร็จ' }}
        </h3>
        <p style="margin-top: 8px;">{{ resultMessage }}</p>
        <p v-if="resultSuccess" style="font-size: 13px; color: var(--text-tertiary); margin-top: 8px;">
          Email ยืนยันการคืนจะถูกส่งทันที
        </p>
        <div class="modal-actions" style="justify-content: center; margin-top: 24px;">
          <button class="btn btn-primary" @click="showResult = false">ตกลง</button>
        </div>
      </div>
    </div>
  </div>
</template>
