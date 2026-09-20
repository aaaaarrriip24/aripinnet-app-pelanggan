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

/**
 * Pulihkan diri saat chunk lama sudah tidak ada di server.
 *
 * Halaman dimuat sebagai potongan-potongan terpisah yang namanya memuat
 * hash isi. Begitu ada build baru, nama-nama itu berubah. Pengguna yang
 * sudah membuka aplikasi sebelum build masih memegang daftar nama lama,
 * dan permintaan ke chunk lama akan gagal.
 *
 * Yang membuatnya sulit dilacak: server statis dengan fallback SPA
 * membalas file yang tidak ada dengan index.html berstatus 200, bukan
 * 404. Browser menolak menjalankan HTML sebagai modul, navigasi
 * dibatalkan diam-diam, dan pengguna terlihat "tombolnya tidak berfungsi"
 * tanpa satu pun pesan error.
 *
 * Muat ulang sekali menyelesaikannya — index.html baru membawa daftar
 * nama chunk yang benar. Penanda di sessionStorage mencegah reload
 * berulang kalau penyebabnya ternyata bukan ini.
 */
router.onError((err) => {
  const gagalMuatModul = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
    .test(err?.message || '');

  if (!gagalMuatModul) return;

  try {
    if (sessionStorage.getItem('reload-chunk')) return;
    sessionStorage.setItem('reload-chunk', '1');
  } catch (_) { /* mode privat — biarkan reload sekali */ }

  window.location.reload();
});

// Navigasi yang berhasil berarti chunk-nya termuat. Penanda dibuang supaya
// kejadian berikutnya tetap tertangani.
router.afterEach(() => {
  try { sessionStorage.removeItem('reload-chunk'); } catch (_) { /* abaikan */ }
});

export default router;
