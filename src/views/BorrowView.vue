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
const bookSuggestions = ref([])
const showBookSuggestions = ref(false)
const bookLocked = ref(false)

// === Student Lookup ===
const students = ref([])
const studentSuggestions = ref([])
const showSuggestions = ref(false)
const foundStudent = ref(null)
const studentLocked = ref(false)
const studentSearching = ref(false)
const studentNotFound = ref(false)

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
    const [equipmentData, studentData] = await Promise.allSettled([
      api.getEquipment(),
      api.getStudents(),
    ])
    if (equipmentData.status === 'fulfilled') {
      equipment.value = equipmentData.value
    } else {
      loadError.value = equipmentData.reason?.message || 'ไม่สามารถโหลดข้อมูลหนังสือได้'
    }
    if (studentData.status === 'fulfilled') {
      students.value = studentData.value
      console.log('✅ โหลดข้อมูลนักศึกษา:', studentData.value.length, 'คน')
    } else {
      console.warn('⚠️ ไม่สามารถโหลดข้อมูลนักศึกษาได้ — ผู้ใช้ต้องกรอกเอง')
    }
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

// === Student Auto-Lookup ===
watch(() => form.value.studentId, (val) => {
  if (studentLocked.value) return
  const id = val.trim()
  studentNotFound.value = false
  foundStudent.value = null

  if (id.length >= 3 && students.value.length > 0) {
    // Filter suggestions that start with the typed value
    const key = 'รหัสนศ.' in students.value[0] ? 'รหัสนศ.' : 'รหัสนักศึกษา'
    studentSuggestions.value = students.value.filter(s => {
      const sid = String(s[key] || '')
      return sid.startsWith(id)
    }).slice(0, 8)
    showSuggestions.value = studentSuggestions.value.length > 0

    // Exact match — auto-fill
    if (id.length >= 8) {
      const exact = students.value.find(s => String(s[key] || '') === id)
      if (exact) {
        selectStudent(exact)
      } else {
        showSuggestions.value = false
        studentNotFound.value = true
      }
    }
  } else {
    studentSuggestions.value = []
    showSuggestions.value = false
  }
})

function selectStudent(student) {
  const key = 'รหัสนศ.' in student ? 'รหัสนศ.' : 'รหัสนักศึกษา'
  const nameKey = 'ชื่อ-นามสกุล' in student ? 'ชื่อ-นามสกุล' : 'ชื่อนามสกุล'
  foundStudent.value = student
  form.value.studentId = String(student[key] || '')
  form.value.name = student[nameKey] || student['ชื่อ'] || ''
  form.value.email = student['Email'] || student['email'] || ''
  form.value.faculty = student['คณะ'] || ''
  studentLocked.value = true
  showSuggestions.value = false
  studentNotFound.value = false
  errors.value.studentId = ''
  errors.value.name = ''
  errors.value.email = ''
  errors.value.faculty = ''
}

function clearStudentLookup() {
  foundStudent.value = null
  studentLocked.value = false
  studentNotFound.value = false
  form.value.studentId = ''
  form.value.name = ''
  form.value.email = ''
  form.value.faculty = ''
  showSuggestions.value = false
}

function getStudentField(student, field) {
  if (field === 'id') return student['รหัสนศ.'] || student['รหัสนักศึกษา'] || ''
  if (field === 'name') return student['ชื่อ-นามสกุล'] || student['ชื่อนามสกุล'] || student['ชื่อ'] || ''
  if (field === 'email') return student['Email'] || student['email'] || ''
  if (field === 'faculty') return student['คณะ'] || ''
  return ''
}

// === Book Auto-Lookup ===
watch(() => bookCodeInput.value, (val) => {
  if (bookLocked.value) return
  const code = val.trim().toUpperCase()
  bookNotFound.value = false
  foundBook.value = null
  form.value.equipmentId = ''
  bookLookupDone.value = false

  if (code.length >= 1 && equipment.value.length > 0) {
    bookSuggestions.value = equipment.value.filter(e => {
      const eid = (e.รหัสอุปกรณ์ || '').toUpperCase()
      const ename = (e.ชื่ออุปกรณ์ || '').toLowerCase()
      return eid.includes(code) || ename.includes(code.toLowerCase())
    }).slice(0, 10)
    showBookSuggestions.value = bookSuggestions.value.length > 0

    // Exact match on code
    const exact = equipment.value.find(e => (e.รหัสอุปกรณ์ || '').toUpperCase() === code)
    if (exact) {
      selectBook(exact)
    }
  } else {
    bookSuggestions.value = []
    showBookSuggestions.value = false
  }
})

function selectBook(book) {
  foundBook.value = book
  form.value.equipmentId = book.รหัสอุปกรณ์
  bookCodeInput.value = book.รหัสอุปกรณ์
  bookLookupDone.value = true
  bookNotFound.value = false
  bookLocked.value = true
  showBookSuggestions.value = false
  errors.value.bookCode = ''
}

function clearBookLookup() {
  bookCodeInput.value = ''
  foundBook.value = null
  form.value.equipmentId = ''
  bookLookupDone.value = false
  bookNotFound.value = false
  bookLocked.value = false
  showBookSuggestions.value = false
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
      clearStudentLookup()
      // Re-set default return date
      const defaultReturn = new Date()
      defaultReturn.setDate(defaultReturn.getDate() + 7)
      form.value.returnDate = defaultReturn.toISOString().split('T')[0]
    } else {
      errors.value.submit = result.message || 'ไม่สามารถยืมหนังสือได้'
    }
  } catch (err) {
    errors.value.submit = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
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
      <span>กำลังโหลดข้อมูล...</span>
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
              <span style="font-weight: 500; color: var(--text-tertiary); text-transform: none; letter-spacing: 0;">
                (พิมพ์รหัสหรือชื่อเพื่อค้นหาอัตโนมัติ)
              </span>
            </div>
            <div class="form-group" style="position: relative;">
              <label class="form-label" for="book-code">รหัสหนังสือ *</label>
              <div style="display: flex; gap: 8px;">
                <input
                  v-model="bookCodeInput"
                  class="form-input"
                  :class="{ error: errors.bookCode, 'input-locked': bookLocked }"
                  placeholder="พิมพ์รหัส เช่น BK หรือ ชื่อหนังสือ"
                  id="book-code"
                  style="flex: 1; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;"
                  :disabled="submitting || bookLocked"
                  autocomplete="off"
                  @focus="bookCodeInput.length >= 1 && bookSuggestions.length > 0 && !bookLocked ? showBookSuggestions = true : null"
                  @blur="setTimeout(() => showBookSuggestions = false, 200)"
                />
                <button
                  v-if="bookLocked"
                  type="button"
                  @click="clearBookLookup"
                  style="height: 46px; padding: 0 16px; background: none; border: 1.5px solid rgba(255,59,48,0.2); border-radius: 10px; cursor: pointer; font-size: 14px; color: var(--accent-rose); transition: all 150ms ease;"
                  title="ล้างหนังสือที่เลือก"
                >
                  ✕ ล้าง
                </button>
              </div>
              <div v-if="errors.bookCode" class="form-error">{{ errors.bookCode }}</div>

              <!-- Book Suggestions Dropdown -->
              <div
                v-if="showBookSuggestions && bookSuggestions.length > 0"
                class="student-suggestions-dropdown"
              >
                <div class="suggestions-header">
                  📚 ผลค้นหาหนังสือ ({{ bookSuggestions.length }} เล่ม)
                </div>
                <div
                  v-for="eq in bookSuggestions"
                  :key="eq.รหัสอุปกรณ์"
                  class="suggestion-item"
                  @mousedown.prevent="selectBook(eq)"
                >
                  <code class="suggestion-id">{{ eq.รหัสอุปกรณ์ }}</code>
                  <span class="suggestion-name">{{ eq.ชื่ออุปกรณ์ }}</span>
                  <span class="suggestion-faculty"
                    :style="{ color: Number(eq.จำนวนคงเหลือ) > 0 ? '#248a3d' : '#ff3b30', background: Number(eq.จำนวนคงเหลือ) > 0 ? '#e8f8ee' : '#fff0ef' }"
                  >
                    คงเหลือ {{ eq.จำนวนคงเหลือ }}/{{ eq.จำนวนทั้งหมด }}
                  </span>
                </div>
              </div>

              <!-- Book Found -->
              <div v-if="foundBook" style="margin-top: 12px; padding: 16px; border-radius: 12px; border: 1.5px solid; transition: all 200ms ease; animation: fadeSlideUp 0.3s ease;"
                :style="{
                  background: bookHasStock ? 'rgba(52, 199, 89, 0.06)' : 'rgba(255, 59, 48, 0.06)',
                  borderColor: bookHasStock ? 'rgba(52, 199, 89, 0.25)' : 'rgba(255, 59, 48, 0.25)'
                }"
              >
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 16px;">✅</span>
                  <span style="font-weight: 700; font-size: 14px; color: var(--accent-emerald-dark);">พบหนังสือในระบบ</span>
                </div>
                <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px;">{{ foundBook.ชื่ออุปกรณ์ }}</div>
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
            </div>

            <!-- ===== STEP 2: Student Info ===== -->
            <div style="margin-top: 24px; margin-bottom: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-primary);">
              ขั้นตอนที่ 2 — ข้อมูลผู้ยืม
              <span v-if="students.length > 0" style="font-weight: 500; color: var(--text-tertiary); text-transform: none; letter-spacing: 0;">
                (พิมพ์รหัสนศ. เพื่อค้นหาอัตโนมัติ)
              </span>
            </div>

            <!-- Student ID with Auto-Lookup -->
            <div class="form-group" style="position: relative;">
              <label class="form-label" for="student-id">รหัสนักศึกษา *</label>
              <div style="display: flex; gap: 8px;">
                <input
                  v-model="form.studentId"
                  class="form-input"
                  :class="{ error: errors.studentId, 'input-locked': studentLocked }"
                  placeholder="เช่น 67010001"
                  maxlength="8"
                  id="student-id"
                  :disabled="submitting || studentLocked"
                  style="flex: 1; font-weight: 600; letter-spacing: 0.08em;"
                  autocomplete="off"
                  @focus="form.studentId.length >= 3 && studentSuggestions.length > 0 ? showSuggestions = true : null"
                  @blur="setTimeout(() => showSuggestions = false, 200)"
                />
                <button
                  v-if="studentLocked"
                  type="button"
                  @click="clearStudentLookup"
                  style="height: 46px; padding: 0 16px; background: none; border: 1.5px solid rgba(255,59,48,0.2); border-radius: 10px; cursor: pointer; font-size: 14px; color: var(--accent-rose); transition: all 150ms ease;"
                  title="ล้างข้อมูลนักศึกษา"
                >
                  ✕ ล้าง
                </button>
              </div>
              <div v-if="errors.studentId" class="form-error">{{ errors.studentId }}</div>

              <!-- Suggestions Dropdown -->
              <div
                v-if="showSuggestions && studentSuggestions.length > 0"
                class="student-suggestions-dropdown"
              >
                <div class="suggestions-header">
                  🔍 ผลค้นหานักศึกษา ({{ studentSuggestions.length }} คน)
                </div>
                <div
                  v-for="s in studentSuggestions"
                  :key="getStudentField(s, 'id')"
                  class="suggestion-item"
                  @mousedown.prevent="selectStudent(s)"
                >
                  <code class="suggestion-id">{{ getStudentField(s, 'id') }}</code>
                  <span class="suggestion-name">{{ getStudentField(s, 'name') }}</span>
                  <span class="suggestion-faculty">{{ getStudentField(s, 'faculty') }}</span>
                </div>
              </div>

              <!-- Student Not Found -->
              <div v-if="studentNotFound && form.studentId.length >= 8" style="margin-top: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(255, 159, 10, 0.05); border: 1px solid rgba(255, 159, 10, 0.15); font-size: 12px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">⚠️</span>
                <div>
                  <div style="font-weight: 600; color: #c27800;">ไม่พบรหัส "{{ form.studentId }}" ในระบบนักศึกษา</div>
                  <div style="color: var(--text-tertiary); margin-top: 2px;">คุณสามารถกรอกข้อมูลด้านล่างเองได้</div>
                </div>
              </div>

              <!-- Student Found Confirmation -->
              <div v-if="foundStudent" style="margin-top: 8px; padding: 12px 16px; border-radius: 12px; background: rgba(52, 199, 89, 0.04); border: 1.5px solid rgba(52, 199, 89, 0.2); animation: fadeSlideUp 0.3s ease;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span style="font-size: 16px;">✅</span>
                  <span style="font-weight: 700; font-size: 14px; color: var(--accent-emerald-dark);">พบข้อมูลนักศึกษา</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--text-secondary);">
                  <span>👤 {{ getStudentField(foundStudent, 'name') }}</span>
                  <span>📧 {{ getStudentField(foundStudent, 'email') }}</span>
                  <span>🏛️ {{ getStudentField(foundStudent, 'faculty') }}</span>
                </div>
              </div>
            </div>

            <!-- Name -->
            <div class="form-group">
              <label class="form-label" for="borrower-name">
                ชื่อ-นามสกุล *
                <span v-if="studentLocked" style="font-size: 10px; color: var(--accent-emerald-dark); font-weight: 500;">🔒 ดึงจากระบบ</span>
              </label>
              <input
                v-model="form.name"
                class="form-input"
                :class="{ error: errors.name, 'input-locked': studentLocked }"
                placeholder="เช่น สมชาย ใจดี"
                id="borrower-name"
                :disabled="submitting || studentLocked"
              />
              <div v-if="errors.name" class="form-error">{{ errors.name }}</div>
            </div>

            <!-- Email -->
            <div class="form-group">
              <label class="form-label" for="borrower-email">
                Email *
                <span v-if="studentLocked" style="font-size: 10px; color: var(--accent-emerald-dark); font-weight: 500;">🔒 ดึงจากระบบ</span>
              </label>
              <input
                v-model="form.email"
                class="form-input"
                :class="{ error: errors.email, 'input-locked': studentLocked }"
                type="email"
                placeholder="example@mail.com"
                id="borrower-email"
                :disabled="submitting || studentLocked"
              />
              <div v-if="errors.email" class="form-error">{{ errors.email }}</div>
            </div>

            <!-- Faculty -->
            <div class="form-group">
              <label class="form-label" for="borrower-faculty">
                คณะ *
                <span v-if="studentLocked" style="font-size: 10px; color: var(--accent-emerald-dark); font-weight: 500;">🔒 ดึงจากระบบ</span>
              </label>
              <select
                v-model="form.faculty"
                class="form-select"
                :class="{ error: errors.faculty, 'input-locked': studentLocked }"
                id="borrower-faculty"
                :disabled="submitting || studentLocked"
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
                @click="selectBook(eq)"
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

<style scoped>
/* Student Auto-Lookup Styles */
.input-locked {
  background: rgba(52, 199, 89, 0.06) !important;
  border-color: rgba(52, 199, 89, 0.3) !important;
  color: var(--text-primary) !important;
}

/* === Suggestions Dropdown — ต้องเห็นชัด === */
.student-suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 200;
  margin-top: 6px;
  background: #ffffff;
  border: 2px solid #007AFF;
  border-radius: 14px;
  box-shadow:
    0 4px 16px rgba(0, 122, 255, 0.15),
    0 12px 40px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  animation: dropIn 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.suggestions-header {
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 700;
  color: #007AFF;
  background: rgba(0, 122, 255, 0.06);
  border-bottom: 1.5px solid rgba(0, 122, 255, 0.12);
  letter-spacing: 0.02em;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 150ms ease;
  border-bottom: 1px solid #f0f0f5;
}

.suggestion-item:hover {
  background: #e8f2ff !important;
}

.suggestion-item:active {
  background: #d4e8ff !important;
}

.suggestion-item:last-child {
  border-bottom: none !important;
}

.suggestion-id {
  font-weight: 800;
  color: #007AFF;
  font-size: 13px;
  min-width: 80px;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  letter-spacing: 0.03em;
}

.suggestion-name {
  flex: 1;
  font-size: 14px;
  color: #1d1d1f;
  font-weight: 600;
}

.suggestion-faculty {
  font-size: 12px;
  color: #636366;
  white-space: nowrap;
  background: #f5f5f7;
  padding: 3px 10px;
  border-radius: 6px;
  font-weight: 500;
}

@keyframes dropIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
