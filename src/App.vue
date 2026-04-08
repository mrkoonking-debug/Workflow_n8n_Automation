<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from './services/api.js'

const route = useRoute()
const currentRoute = computed(() => route.path)

const navItems = [
  { path: '/dashboard', label: 'แดชบอร์ด', icon: 'dashboard' },
  { path: '/equipment', label: 'รายการหนังสือ', icon: 'equipment' },
  { path: '/borrow', label: 'ยืมหนังสือ', icon: 'borrow' },
  { path: '/return', label: 'คืนหนังสือ', icon: 'return' },
  { path: '/history', label: 'ประวัติยืม-คืน', icon: 'history' },
]

// ==========================================
// Connection Status — Auto-check ทุก 30 วินาที
// ==========================================
const isConnected = ref(false)
const isChecking = ref(false)
let connectionInterval = null

async function checkConnection() {
  isChecking.value = true
  isConnected.value = await api.checkN8nConnection()
  isChecking.value = false
}

onMounted(() => {
  checkConnection()
  connectionInterval = setInterval(checkConnection, 30000) // ตรวจทุก 30 วินาที
})

onUnmounted(() => {
  if (connectionInterval) clearInterval(connectionInterval)
})

// ==========================================
// Toast Notification System
// ==========================================
const toasts = ref([])
let toastId = 0

function addToast(message, type = 'info', duration = 4000) {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

// Expose toast globally via provide/inject or window
if (typeof window !== 'undefined') {
  window.__toast = addToast
}
</script>

<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">📦</div>
        <div class="sidebar-brand-text">
          <h1>Smart Lending</h1>
          <p>Library Management</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: currentRoute === item.path }"
        >
          <!-- Dashboard Icon -->
          <svg v-if="item.icon === 'dashboard'" class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
          </svg>
          <!-- Equipment Icon -->
          <svg v-if="item.icon === 'equipment'" class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <!-- Borrow Icon -->
          <svg v-if="item.icon === 'borrow'" class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          <!-- Return Icon -->
          <svg v-if="item.icon === 'return'" class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <!-- History Icon -->
          <svg v-if="item.icon === 'history'" class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- Connection Status -->
      <div class="sidebar-connection" @click="checkConnection">
        <div class="connection-indicator" :class="{ connected: isConnected, checking: isChecking }">
          <span class="connection-dot"></span>
          <span class="connection-text">
            {{ isChecking ? 'กำลังตรวจสอบ...' : isConnected ? 'n8n เชื่อมต่อแล้ว' : 'n8n ไม่เชื่อมต่อ' }}
          </span>
        </div>
      </div>

      <div class="sidebar-footer">
        <p class="sidebar-footer-text">
          Powered by n8n + Google Sheets<br>
          © 2026 Smart Library v1.0
        </p>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <transition-group name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="'toast-' + toast.type"
        >
          <span v-if="toast.type === 'success'">✅</span>
          <span v-else-if="toast.type === 'error'">❌</span>
          <span v-else>ℹ️</span>
          {{ toast.message }}
        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.page-enter-active {
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.page-leave-active {
  animation: fadeOut 0.18s ease-out;
}

@keyframes fadeOut {
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.99);
  }
}

/* Connection Status — iOS Pill Style */
.sidebar-connection {
  padding: 10px 14px;
  cursor: pointer;
  transition: all 150ms ease;
}

.sidebar-connection:hover {
  transform: scale(0.98);
}

.connection-indicator {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 14px;
  border-radius: 12px;
  background: rgba(255, 59, 48, 0.06);
  border: 0.5px solid rgba(255, 59, 48, 0.1);
  transition: all 250ms cubic-bezier(0.25, 0.1, 0.25, 1);
}

.connection-indicator.connected {
  background: rgba(52, 199, 89, 0.06);
  border-color: rgba(52, 199, 89, 0.12);
}

.connection-indicator.checking {
  background: rgba(255, 159, 10, 0.06);
  border-color: rgba(255, 159, 10, 0.1);
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff3b30;
  flex-shrink: 0;
  animation: pulse-glow 2s ease-in-out infinite;
  box-shadow: 0 0 6px rgba(255, 59, 48, 0.4);
}

.connection-indicator.connected .connection-dot {
  background: #34c759;
  box-shadow: 0 0 6px rgba(52, 199, 89, 0.4);
}

.connection-indicator.checking .connection-dot {
  background: #ff9f0a;
  box-shadow: 0 0 6px rgba(255, 159, 10, 0.4);
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.75); }
}

.connection-text {
  font-size: 11.5px;
  font-weight: 600;
  color: #ff3b30;
  letter-spacing: -0.01em;
}

.connection-indicator.connected .connection-text {
  color: #248a3d;
}

.connection-indicator.checking .connection-text {
  color: #c27800;
}

/* Toast Container */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-enter-active {
  animation: toastIn 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.toast-leave-active {
  animation: toastOut 0.25s ease-out forwards;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(48px) scale(0.92); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}

@keyframes toastOut {
  to { opacity: 0; transform: translateX(48px) scale(0.92); }
}
</style>
