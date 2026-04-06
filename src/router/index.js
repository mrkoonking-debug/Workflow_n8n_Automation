import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import EquipmentView from '../views/EquipmentView.vue'
import BorrowView from '../views/BorrowView.vue'
import ReturnView from '../views/ReturnView.vue'
import HistoryView from '../views/HistoryView.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'Dashboard', component: DashboardView, meta: { title: 'แดชบอร์ด', icon: 'dashboard' } },
  { path: '/equipment', name: 'Equipment', component: EquipmentView, meta: { title: 'รายการอุปกรณ์', icon: 'equipment' } },
  { path: '/borrow', name: 'Borrow', component: BorrowView, meta: { title: 'ยืมอุปกรณ์', icon: 'borrow' } },
  { path: '/return', name: 'Return', component: ReturnView, meta: { title: 'คืนอุปกรณ์', icon: 'return' } },
  { path: '/history', name: 'History', component: HistoryView, meta: { title: 'ประวัติยืม-คืน', icon: 'history' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || 'หน้าหลัก'} | Smart Equipment Lending`
})

export default router
