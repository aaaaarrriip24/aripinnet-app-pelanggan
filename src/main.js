import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

/**
 * Inisialisasi khusus native. Dibungkus try/catch dan import dinamis
 * supaya app tetap jalan saat dibuka di browser (npm run dev), di mana
 * plugin-plugin ini tidak tersedia.
 */
(async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    // Status bar mengikuti tema sistem
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? '#1d1d21' : '#ffffff' });

    // Tombol Back Android: mundur di riwayat, atau keluar kalau sudah
    // di layar utama. Tanpa ini, Back tidak melakukan apa-apa dan
    // pengguna merasa aplikasinya macet.
    const { App: CapApp } = await import('@capacitor/app');
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && router.currentRoute.value.name !== 'home') {
        router.back();
      } else {
        CapApp.exitApp();
      }
    });
  } catch (err) {
    console.warn('[app] init native dilewati:', err.message);
  }
})();
