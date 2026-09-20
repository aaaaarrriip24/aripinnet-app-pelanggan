import { createRouter, createWebHashHistory } from 'vue-router';

/**
 * PENTING: createWebHashHistory, bukan createWebHistory.
 *
 * Di WebView Capacitor tidak ada server yang bisa melayani fallback
 * index.html untuk path sembarang. History mode akan jalan saat pertama
 * dibuka, lalu layar putih begitu pengguna reload atau app di-restore
 * dari background. Hash mode tidak punya masalah itu.
 */
const routes = [
  { path: '/login',   name: 'login',    component: () => import('@/views/LoginView.vue'),   meta: { public: true } },
  { path: '/',        name: 'home',     component: () => import('@/views/HomeView.vue') },
  { path: '/bayar/:invoiceId', name: 'pay', component: () => import('@/views/PayView.vue') },
  { path: '/riwayat', name: 'history',  component: () => import('@/views/HistoryView.vue') },
  { path: '/akun',    name: 'account',  component: () => import('@/views/AccountView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  const { useAuthStore } = await import('@/stores/auth');
  const auth = useAuthStore();

  // Tunggu pembacaan token dari Preferences selesai — kalau tidak,
  // navigasi pertama akan melempar ke login padahal tokennya ada.
  if (!auth.ready) await auth.init();

  if (to.meta.public) return auth.isLoggedIn ? { name: 'home' } : true;
  if (!auth.isLoggedIn) return { name: 'login' };
  return true;
});

export default router;
