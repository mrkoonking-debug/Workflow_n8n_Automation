<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../services/api.js'

const equipment = ref([])
const loading = ref(true)
const submitting = ref(false)
const showSuccess = ref(false)
const showConfirm = ref(false)
const resultBorrowId = ref('')
const errors = ref({})
const loadError = ref('')

// === Book Lookup ===
const bookCodeInput = ref('')
const bookLookupDone = ref(false)
const bookNotFound = ref(false)
const foundBook = ref(null)

// === Form Data ===
const form = ref({
  equipmentId: '',
  studentId: '',
  name: '',
  email: '',
  faculty: '',
  returnDate: '',
})

const minReturnDate = ref('')
const maxReturnDate = ref('')

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
  // Set default return date to 7 days
  const defaultReturn = new Date()
  defaultReturn.setDate(defaultReturn.getDate() + 7)
  form.value.returnDate = defaultReturn.toISOString().split('T')[0]
  // Set max return date to 14 days from today
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 14)
  maxReturnDate.value = maxDate.toISOString().split('T')[0]
})

// === Book Lookup Function ===
function lookupBook() {
  const code = bookCodeInput.value.trim().toUpperCase()
  if (!code) {
    errors.value.bookCode = 'กรุณากรอกรหัสหนังสือ'
    return
  }
  errors.value.bookCode = ''
  bookNotFound.value = false

  const found = equipment.value.find(e => e.รหัสอุปกรณ์.toUpperCase() === code)
  if (found) {
    foundBook.value = found
    form.value.equipmentId = found.รหัสอุปกรณ์
    bookLookupDone.value = true
    bookNotFound.value = false
  } else {
    foundBook.value = null
    form.value.equipmentId = ''
    bookLookupDone.value = true
    bookNotFound.value = true
  }
}

function clearBookLookup() {
  bookCodeInput.value = ''
  foundBook.value = null
  form.value.equipmentId = ''
  bookLookupDone.value = false
  bookNotFound.value = false
  errors.value.bookCode = ''
}

// === Computed: stock info ===
const bookHasStock = computed(() => {
  return foundBook.value && Number(foundBook.value.จำนวนคงเหลือ) > 0
})

const stockPercent = computed(() => {
  if (!foundBook.value) return 0
  return (Number(foundBook.value.จำนวนคงเหลือ) / Number(foundBook.value.จำนวนทั้งหมด)) * 100
})

// === Validation ===
function validate() {
  errors.value = {}
  if (!form.value.equipmentId) errors.value.bookCode = 'กรุณาค้นหาและเลือกหนังสือก่อน'
  if (!bookHasStock.value && foundBook.value) errors.value.bookCode = 'หนังสือเล่มนี้ถูกยืมหมดแล้ว'
  if (!form.value.studentId) errors.value.studentId = 'กรุณากรอกรหัสนศ.'
  else if (!/^\d{8}$/.test(form.value.studentId)) errors.value.studentId = 'รหัสนศ. ต้องเป็นตัวเลข 8 หลัก'
  if (!form.value.name) errors.value.name = 'กรุณากรอกชื่อ-นามสกุล'
  else if (form.value.name.trim().length < 4) errors.value.name = 'ชื่อ-นามสกุลต้องมีอย่างน้อย 4 ตัวอักษร'
  if (!form.value.email) errors.value.email = 'กรุณากรอก Email'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) errors.value.email = 'Email ไม่ถูกต้อง'
  if (!form.value.faculty) errors.value.faculty = 'กรุณาเลือกคณะ'
  if (!form.value.returnDate) errors.value.returnDate = 'กรุณาเลือกวันกำหนดคืน'
  else {
    const selected = new Date(form.value.returnDate)
    const max = new Date(maxReturnDate.value)
    const min = new Date(minReturnDate.value)
    if (selected < min) errors.value.returnDate = 'วันกำหนดคืนต้องเป็นอย่างน้อยวันพรุ่งนี้'
    else if (selected > max) errors.value.returnDate = 'วันกำหนดคืนห้ามเกิน 14 วัน'
  }
  return Object.keys(errors.value).length === 0
}

function requestConfirm() {
  if (!validate()) return
  showConfirm.value = true
}

async function handleSubmit() {
  showConfirm.value = false
  if (submitting.value) return
  submitting.value = true
  errors.value = {}
  try {
    const result = await api.borrowEquipment(form.value)
    if (result.success) {
      resultBorrowId.value = result.borrowId
      showSuccess.value = true
      equipment.value = await api.getEquipment()
      form.value = { equipmentId: '', studentId: '', name: '', email: '', faculty: '', returnDate: '' }
      clearBookLookup()
      // Re-set default return date
      const defaultReturn = new Date()
      defaultReturn.setDate(defaultReturn.getDate() + 7)
      form.value.returnDate = defaultReturn.toISOString().split('T')[0]
    } else {
      errors.value.submit = result.message || 'ไม่สามารถยืมหนังสือได้'
    }
  } catch (err) {
    errors.value.submit = err.message || 'เกิดข้อผิดพลาด กรุณาตรวจสอบการเชื่อมต่อ n8n'
  } finally {
    submitting.value = false
  }
}

function closeModal() {
  showSuccess.value = false
  resultBorrowId.value = ''
}
</script>

<template>
  <div class="fade-in">
    <div class="page-header">
      <h2>📝 ยืมหนังสือ</h2>
      <p>พิมพ์รหัสหนังสือและรหัสนักศึกษาเพื่อทำรายการยืม</p>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <span>กำลังโหลดข้อมูลจาก n8n + Google Sheets...</span>
    </div>

    <div v-else-if="loadError" class="card slide-up" style="text-align: center;">
      <div class="card-body" style="padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <h3 style="color: var(--accent-rose); margin-bottom: 8px;">ไม่สามารถโหลดข้อมูลหนังสือได้</h3>
        <p style="color: var(--text-secondary); font-size: 13px;">{{ loadError }}</p>
        <button class="btn btn-primary" style="margin-top: 16px;" @click="location.reload()">🔄 ลองใหม่</button>
      </div>
    </div>

    <div v-else class="grid-2">
      <!-- Borrow Form -->
      <div class="card">
        <div class="card-header">
          <h3>📋 แบบฟอร์มยืมหนังสือ</h3>
        </div>
        <div class="card-body">
          <form @submit.prevent="requestConfirm">

            <!-- ===== STEP 1: Book Lookup ===== -->
            <div style="margin-bottom: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-primary);">
              ขั้นตอนที่ 1 — ระบุหนังสือ
            </div>
            <div class="form-group">
              <label class="form-label" for="book-code">รหัสหนังสือ *</label>
              <div style="display: flex; gap: 8px;">
                <input
                  v-model="bookCodeInput"
                  class="form-input"
                  :class="{ error: errors.bookCode }"
                  placeholder="พิมพ์รหัส เช่น BK003"
                  id="book-code"
                  style="flex: 1; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"
                  :disabled="submitting"
                  @keyup.enter="lookupBook"
                />
                <button
                  type="button"
                  class="btn btn-primary"
                  @click="lookupBook"
                  :disabled="submitting || !bookCodeInput.trim()"
                  style="height: 46px; padding: 0 20px; white-space: nowrap;"
                >
                  🔍 ค้นหา
                </button>
              </div>
              <div v-if="errors.bookCode" class="form-error">{{ errors.bookCode }}</div>

              <!-- Book Found -->
              <div v-if="foundBook" style="margin-top: 12px; padding: 16px; border-radius: 12px; border: 1.5px solid; transition: all 200ms ease;"
                :style="{
                  background: bookHasStock ? 'rgba(52, 199, 89, 0.04)' : 'rgba(255, 59, 48, 0.04)',
                  borderColor: bookHasStock ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 59, 48, 0.2)'
                }"
              >
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <div style="font-weight: 700; font-size: 15px;">{{ foundBook.ชื่ออุปกรณ์ }}</div>
                  <button type="button" @click="clearBookLookup" style="background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.5; padding: 4px;" title="ล้าง">✕</button>
                </div>
                <div style="display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary);">
                  <span>📂 {{ foundBook.หมวดหมู่ }}</span>
                  <span>🏷️ {{ foundBook.รหัสอุปกรณ์ }}</span>
                </div>
                <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">
                  <div class="progress-bar" style="flex: 1;">
                    <div
                      class="progress-fill"
                      :class="bookHasStock ? 'green' : 'red'"
                      :style="{ width: stockPercent + '%' }"
                    ></div>
                  </div>
                  <span style="font-weight: 700; font-size: 14px;"
                    :style="{ color: bookHasStock ? 'var(--accent-emerald-dark)' : 'var(--accent-rose)' }"
                  >
                    {{ foundBook.จำนวนคงเหลือ }}/{{ foundBook.จำนวนทั้งหมด }}
                  </span>
                </div>
                <div v-if="!bookHasStock" style="margin-top: 8px; font-size: 12px; font-weight: 600; color: var(--accent-rose);">
                  ❌ หนังสือเล่มนี้ถูกยืมหมดแล้ว
                </div>
              </div>

              <!-- Book Not Found -->
              <div v-if="bookNotFound && bookLookupDone" style="margin-top: 12px; padding: 14px; border-radius: 12px; background: rgba(255, 59, 48, 0.04); border: 1px solid rgba(255, 59, 48, 0.15); font-size: 13px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">❌</span>
                <div>
                  <div style="font-weight: 600; color: var(--accent-rose);">ไม่พบรหัส "{{ bookCodeInput.toUpperCase() }}" ในระบบ</div>
                  <div style="color: var(--text-tertiary); margin-top: 2px;">ตรวจสอบรหัสให้ถูกต้อง (เช่น BK001 - BK010)</div>
                </div>
              </div>
            </div>

            <!-- ===== STEP 2: Student Info ===== -->
            <div style="margin-top: 24px; margin-bottom: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-primary);">
              ขั้นตอนที่ 2 — ข้อมูลผู้ยืม
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
                :disabled="submitting"
                style="font-weight: 600; letter-spacing: 0.08em;"
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
                :disabled="submitting"
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
                :disabled="submitting"
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
                :disabled="submitting"
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

            <!-- ===== STEP 3: Return Date ===== -->
            <div style="margin-top: 24px; margin-bottom: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-primary);">
              ขั้นตอนที่ 3 — กำหนดวันคืน
            </div>

            <div class="form-group">
              <label class="form-label" for="return-date">วันกำหนดคืน * <span style="font-weight: 400; color: var(--text-tertiary); font-size: 12px;">(ค่าเริ่มต้น 7 วัน, สูงสุด 14 วัน)</span></label>
              <input
                v-model="form.returnDate"
                class="form-input"
                :class="{ error: errors.returnDate }"
                type="date"
                :min="minReturnDate"
                :max="maxReturnDate"
                id="return-date"
                :disabled="submitting"
              />
              <div v-if="errors.returnDate" class="form-error">{{ errors.returnDate }}</div>
            </div>

            <!-- Submit Error -->
            <div v-if="errors.submit" style="margin-bottom: 16px;">
              <div class="badge badge-overdue" style="padding: 10px 16px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                ❌ {{ errors.submit }}
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="btn btn-primary btn-lg"
              style="width: 100%; margin-top: 8px;"
              :disabled="submitting || !foundBook || !bookHasStock"
            >
              <span v-if="submitting" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
              <span v-else>📝 ยืนยันการยืม</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Info Panel -->
      <div>
        <!-- Instructions -->
        <div class="card">
          <div class="card-header">
            <h3>ℹ️ วิธีใช้งาน</h3>
          </div>
          <div class="card-body">
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 14px; font-size: 13px; color: var(--text-secondary);">
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: var(--accent-primary); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">1</span>
                <div>
                  <strong>พิมพ์รหัสหนังสือ</strong> (เช่น BK003) แล้วกดปุ่ม "ค้นหา" หรือกด Enter
                  <div style="color: var(--text-tertiary); font-size: 12px; margin-top: 2px;">เหมือนการสแกนบาร์โค้ดที่ห้องสมุด</div>
                </div>
              </li>
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: var(--accent-primary); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">2</span>
                <div>
                  <strong>กรอกข้อมูลผู้ยืม</strong> — รหัสนักศึกษา, ชื่อ, Email, คณะ
                </div>
              </li>
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: var(--accent-primary); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">3</span>
                <div>
                  <strong>ตรวจสอบวันกำหนดคืน</strong> (ค่าเริ่มต้น 7 วัน, ปรับได้สูงสุด 14 วัน)
                </div>
              </li>
              <li style="display: flex; gap: 10px; align-items: flex-start;">
                <span style="background: var(--accent-emerald-light); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">✓</span>
                <div>
                  <strong>กดยืนยัน</strong> → ระบบบันทึก + ส่ง Email ยืนยันอัตโนมัติ
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Quick Reference -->
        <div class="card" style="margin-top: 20px;">
          <div class="card-header">
            <h3>📚 รหัสหนังสือที่มีในระบบ</h3>
          </div>
          <div class="card-body" style="padding: 12px 16px;">
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
              <div v-for="eq in equipment" :key="eq.รหัสอุปกรณ์"
                style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; cursor: pointer; transition: background 150ms ease;"
                :style="{ background: Number(eq.จำนวนคงเหลือ) > 0 ? 'transparent' : 'rgba(255,59,48,0.03)' }"
                @click="bookCodeInput = eq.รหัสอุปกรณ์; lookupBook()"
              >
                <code style="font-weight: 700; color: var(--accent-primary); font-size: 11px; min-width: 50px;">{{ eq.รหัสอุปกรณ์ }}</code>
                <span style="flex: 1; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ eq.ชื่ออุปกรณ์ }}</span>
                <span style="font-weight: 600; font-size: 11px;"
                  :style="{ color: Number(eq.จำนวนคงเหลือ) > 0 ? 'var(--accent-emerald-dark)' : 'var(--accent-rose)' }"
                >
                  {{ eq.จำนวนคงเหลือ }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
      <div class="modal-content">
        <div style="font-size: 48px; text-align: center; margin-bottom: 12px;">📝</div>
        <h3 style="text-align: center;">ยืนยันการยืมหนังสือ?</h3>
        <div style="margin: 16px 0; padding: 14px; background: var(--bg-input); border-radius: 10px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-tertiary);">หนังสือ</span>
            <span style="font-weight: 500;">{{ foundBook?.ชื่ออุปกรณ์ }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-tertiary);">รหัส</span>
            <span style="font-weight: 600; color: var(--accent-primary);">{{ foundBook?.รหัสอุปกรณ์ }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-tertiary);">ผู้ยืม</span>
            <span>{{ form.name }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-tertiary);">รหัสนศ.</span>
            <span>{{ form.studentId }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-tertiary);">Email</span>
            <span>{{ form.email }}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-tertiary);">กำหนดคืน</span>
            <span style="font-weight: 600; color: var(--accent-primary);">{{ form.returnDate }}</span>
          </div>
        </div>
        <p style="font-size: 12px; color: var(--text-tertiary); text-align: center;">
          กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยัน<br>
          ระบบจะส่ง Email ยืนยันหลังทำรายการสำเร็จ
        </p>
        <div class="modal-actions" style="justify-content: center; gap: 12px; margin-top: 20px;">
          <button class="btn btn-secondary" @click="showConfirm = false">แก้ไข</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="submitting">
            <span v-if="submitting" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
            <span v-else>📝 ยืนยันยืม</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccess" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content" style="text-align: center;">
        <div style="font-size: 56px; margin-bottom: 16px;">✅</div>
        <h3 style="color: var(--accent-emerald-dark);">ยืมหนังสือสำเร็จ!</h3>
        <p style="margin-top: 8px;">รหัสยืมของคุณคือ</p>
        <div style="margin: 20px 0; padding: 16px; background: rgba(0,122,255,0.06); border-radius: 12px; border: 1px solid rgba(0,122,255,0.12);">
          <div style="font-size: 28px; font-weight: 800; color: var(--accent-primary); letter-spacing: 0.05em;">
            {{ resultBorrowId }}
          </div>
        </div>
        <p style="font-size: 13px; color: var(--text-tertiary);">กรุณาจดรหัสนี้ไว้ใช้ตอนคืนหนังสือ<br>Email ยืนยันจะถูกส่งทันที</p>
        <div class="modal-actions" style="justify-content: center;">
          <button class="btn btn-primary" @click="closeModal">เข้าใจแล้ว</button>
        </div>
      </div>
    </div>
  </div>
</template>
