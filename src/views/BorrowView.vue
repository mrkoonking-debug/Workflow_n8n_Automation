<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api.js'

const equipment = ref([])
const loading = ref(true)
const submitting = ref(false)
const showSuccess = ref(false)
const resultBorrowId = ref('')
const errors = ref({})
const loadError = ref('')

const form = ref({
  equipmentId: '',
  studentId: '',
  name: '',
  email: '',
  faculty: '',
  returnDate: '',
})

onMounted(async () => {
  try {
    equipment.value = await api.getEquipment()
  } catch (error) {
    loadError.value = error.message
  } finally {
    loading.value = false
  }
  // Set min return date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  minReturnDate.value = tomorrow.toISOString().split('T')[0]
})

const minReturnDate = ref('')

const availableEquipment = computed(() => {
  return equipment.value.filter(e => Number(e.จำนวนคงเหลือ) > 0)
})

const selectedEquipmentInfo = computed(() => {
  return equipment.value.find(e => e.รหัสอุปกรณ์ === form.value.equipmentId) || null
})

function validate() {
  errors.value = {}
  if (!form.value.equipmentId) errors.value.equipmentId = 'กรุณาเลือกอุปกรณ์'
  if (!form.value.studentId) errors.value.studentId = 'กรุณากรอกรหัสนศ.'
  else if (!/^\d{8}$/.test(form.value.studentId)) errors.value.studentId = 'รหัสนศ. ต้องเป็นตัวเลข 8 หลัก'
  if (!form.value.name) errors.value.name = 'กรุณากรอกชื่อ-นามสกุล'
  if (!form.value.email) errors.value.email = 'กรุณากรอก Email'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) errors.value.email = 'Email ไม่ถูกต้อง'
  if (!form.value.faculty) errors.value.faculty = 'กรุณากรอกคณะ'
  if (!form.value.returnDate) errors.value.returnDate = 'กรุณาเลือกวันกำหนดคืน'
  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  try {
    const result = await api.borrowEquipment(form.value)
    if (result.success) {
      resultBorrowId.value = result.borrowId
      showSuccess.value = true
      // Refresh equipment list
      equipment.value = await api.getEquipment()
      // Reset form
      form.value = { equipmentId: '', studentId: '', name: '', email: '', faculty: '', returnDate: '' }
    } else {
      errors.value.submit = result.message
    }
  } catch (err) {
    errors.value.submit = err.message || 'เกิดข้อผิดพลาด กรุณาตรวจสอบการเชื่อมต่อ n8n'
  }
  submitting.value = false
}

function closeModal() {
  showSuccess.value = false
  resultBorrowId.value = ''
}
</script>

<template>
  <div class="fade-in">
    <div class="page-header">
      <h2>📝 ยืมอุปกรณ์</h2>
      <p>กรอกข้อมูลเพื่อทำรายการยืมอุปกรณ์</p>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>กำลังโหลดข้อมูลจาก n8n + Google Sheets...</span>
    </div>

    <div v-else-if="loadError" class="card slide-up" style="text-align: center;">
      <div class="card-body" style="padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <h3 style="color: var(--accent-rose); margin-bottom: 8px;">ไม่สามารถโหลดข้อมูลอุปกรณ์ได้</h3>
        <p style="color: var(--text-secondary); font-size: 13px;">{{ loadError }}</p>
        <button class="btn btn-primary" style="margin-top: 16px;" @click="location.reload()">🔄 ลองใหม่</button>
      </div>
    </div>

    <div v-else class="grid-2">
      <!-- Borrow Form -->
      <div class="card">
        <div class="card-header">
          <h3>📋 แบบฟอร์มยืมอุปกรณ์</h3>
        </div>
        <div class="card-body">
          <form @submit.prevent="handleSubmit">
            <!-- Equipment Select -->
            <div class="form-group">
              <label class="form-label" for="equipment-select">เลือกอุปกรณ์ *</label>
              <select
                v-model="form.equipmentId"
                class="form-select"
                :class="{ error: errors.equipmentId }"
                id="equipment-select"
              >
                <option value="">-- เลือกอุปกรณ์ --</option>
                <option
                  v-for="eq in availableEquipment"
                  :key="eq.รหัสอุปกรณ์"
                  :value="eq.รหัสอุปกรณ์"
                >
                  {{ eq.ชื่ออุปกรณ์ }} (เหลือ {{ eq.จำนวนคงเหลือ }})
                </option>
              </select>
              <div v-if="errors.equipmentId" class="form-error">{{ errors.equipmentId }}</div>
            </div>

            <!-- Student ID -->
            <div class="form-group">
              <label class="form-label" for="student-id">รหัสนักศึกษา *</label>
              <input
                v-model="form.studentId"
                class="form-input"
                :class="{ error: errors.studentId }"
                placeholder="เช่น 67704800"
                maxlength="8"
                id="student-id"
              />
              <div v-if="errors.studentId" class="form-error">{{ errors.studentId }}</div>
            </div>

            <!-- Name -->
            <div class="form-group">
              <label class="form-label" for="borrower-name">ชื่อ-นามสกุล *</label>
              <input
                v-model="form.name"
                class="form-input"
                :class="{ error: errors.name }"
                placeholder="เช่น สมชาย ใจดี"
                id="borrower-name"
              />
              <div v-if="errors.name" class="form-error">{{ errors.name }}</div>
            </div>

            <!-- Email -->
            <div class="form-group">
              <label class="form-label" for="borrower-email">Email *</label>
              <input
                v-model="form.email"
                class="form-input"
                :class="{ error: errors.email }"
                type="email"
                placeholder="example@mail.com"
                id="borrower-email"
              />
              <div v-if="errors.email" class="form-error">{{ errors.email }}</div>
            </div>

            <!-- Faculty -->
            <div class="form-group">
              <label class="form-label" for="borrower-faculty">คณะ *</label>
              <select
                v-model="form.faculty"
                class="form-select"
                :class="{ error: errors.faculty }"
                id="borrower-faculty"
              >
                <option value="">-- เลือกคณะ --</option>
                <option value="วิศวกรรมศาสตร์">วิศวกรรมศาสตร์</option>
                <option value="วิทยาศาสตร์">วิทยาศาสตร์</option>
                <option value="เทคโนโลยีสารสนเทศ">เทคโนโลยีสารสนเทศ</option>
                <option value="บริหารธุรกิจ">บริหารธุรกิจ</option>
                <option value="ศิลปศาสตร์">ศิลปศาสตร์</option>
                <option value="สถาปัตยกรรมศาสตร์">สถาปัตยกรรมศาสตร์</option>
                <option value="เกษตรศาสตร์">เกษตรศาสตร์</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
              <div v-if="errors.faculty" class="form-error">{{ errors.faculty }}</div>
            </div>

            <!-- Return Date -->
            <div class="form-group">
              <label class="form-label" for="return-date">วันกำหนดคืน *</label>
              <input
                v-model="form.returnDate"
                class="form-input"
                :class="{ error: errors.returnDate }"
                type="date"
                :min="minReturnDate"
                id="return-date"
              />
              <div v-if="errors.returnDate" class="form-error">{{ errors.returnDate }}</div>
            </div>

            <!-- Submit Error -->
            <div v-if="errors.submit" style="margin-bottom: 16px;">
              <div class="badge badge-overdue" style="padding: 10px 16px; font-size: 13px;">
                ❌ {{ errors.submit }}
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="btn btn-primary btn-lg"
              style="width: 100%;"
              :disabled="submitting"
            >
              <span v-if="submitting" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
              <span v-else>📝 ยืนยันการยืม</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Info Panel -->
      <div>
        <!-- Selected Equipment Info -->
        <div v-if="selectedEquipmentInfo" class="card" style="margin-bottom: 20px;">
          <div class="card-header">
            <h3>📦 ข้อมูลอุปกรณ์</h3>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">ชื่ออุปกรณ์</div>
                <div style="font-weight: 600; font-size: 16px;">{{ selectedEquipmentInfo.ชื่ออุปกรณ์ }}</div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">หมวดหมู่</div>
                  <div>{{ selectedEquipmentInfo.หมวดหมู่ }}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 4px;">รหัส</div>
                  <div style="color: var(--accent-primary); font-weight: 600;">{{ selectedEquipmentInfo.รหัสอุปกรณ์ }}</div>
                </div>
              </div>
              <div>
                <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px;">จำนวนคงเหลือ</div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="font-size: 28px; font-weight: 800; color: var(--accent-emerald-light);">
                    {{ selectedEquipmentInfo.จำนวนคงเหลือ }}
                  </div>
                  <div style="font-size: 14px; color: var(--text-tertiary);">/{{ selectedEquipmentInfo.จำนวนทั้งหมด }}</div>
                </div>
                <div class="progress-bar" style="margin-top: 8px;">
                  <div
                    class="progress-fill green"
                    :style="{ width: (Number(selectedEquipmentInfo.จำนวนคงเหลือ) / Number(selectedEquipmentInfo.จำนวนทั้งหมด) * 100) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Instructions -->
        <div class="card">
          <div class="card-header">
            <h3>ℹ️ ข้อแนะนำ</h3>
          </div>
          <div class="card-body">
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px; font-size: 13px; color: var(--text-secondary);">
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="color: var(--accent-primary);">1.</span>
                เลือกอุปกรณ์ที่ต้องการยืม
              </li>
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="color: var(--accent-primary);">2.</span>
                กรอกข้อมูลผู้ยืมให้ครบถ้วน
              </li>
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="color: var(--accent-primary);">3.</span>
                เลือกวันกำหนดคืน (สูงสุด 14 วัน)
              </li>
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="color: var(--accent-primary);">4.</span>
                กดยืนยัน → จดรหัสยืมไว้ใช้คืน
              </li>
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="color: var(--accent-emerald-light);">✉️</span>
                ระบบจะส่ง Email ยืนยันอัตโนมัติ
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccess" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content" style="text-align: center;">
        <div style="font-size: 56px; margin-bottom: 16px;">✅</div>
        <h3 style="color: var(--accent-emerald-dark);">ยืมอุปกรณ์สำเร็จ!</h3>
        <p style="margin-top: 8px;">รหัสยืมของคุณคือ</p>
        <div style="margin: 20px 0; padding: 16px; background: rgba(0,122,255,0.06); border-radius: 12px; border: 1px solid rgba(0,122,255,0.12);">
          <div style="font-size: 28px; font-weight: 800; color: var(--accent-primary); letter-spacing: 0.05em;">
            {{ resultBorrowId }}
          </div>
        </div>
        <p style="font-size: 13px; color: var(--text-tertiary);">กรุณาจดรหัสนี้ไว้ใช้ตอนคืนอุปกรณ์<br>Email ยืนยันจะถูกส่งทันที</p>
        <div class="modal-actions" style="justify-content: center;">
          <button class="btn btn-primary" @click="closeModal">เข้าใจแล้ว</button>
        </div>
      </div>
    </div>
  </div>
</template>
