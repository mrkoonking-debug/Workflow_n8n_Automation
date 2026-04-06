<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentRoute = computed(() => route.path)

const navItems = [
  { path: '/dashboard', label: 'แดชบอร์ด', icon: 'dashboard' },
  { path: '/equipment', label: 'รายการอุปกรณ์', icon: 'equipment' },
  { path: '/borrow', label: 'ยืมอุปกรณ์', icon: 'borrow' },
  { path: '/return', label: 'คืนอุปกรณ์', icon: 'return' },
  { path: '/history', label: 'ประวัติยืม-คืน', icon: 'history' },
]
</script>

<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">📦</div>
        <div class="sidebar-brand-text">
          <h1>Smart Lending</h1>
          <p>Equipment Management</p>
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

      <div class="sidebar-footer">
        <p class="sidebar-footer-text">
          Powered by n8n + Google Sheets<br>
          © 2026 Smart Lending v1.0
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
  </div>
</template>

<style scoped>
.page-enter-active {
  animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.page-leave-active {
  animation: fadeOut 0.15s ease-out;
}

@keyframes fadeOut {
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}
</style>
