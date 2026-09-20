# App Pelanggan — Billing RT/RW Net

Aplikasi Android/iOS untuk pelanggan: lihat tagihan, bayar QRIS atau
Virtual Account, dan cek status layanan. Vue 3 dibungkus Capacitor.

## Kebutuhan

- Backend sudah berjalan dan bisa diakses dari internet
- Android Studio (untuk build Android)
- Xcode (untuk build iOS, hanya di macOS)

## Menjalankan di browser

```bash
npm install
npm run dev
```

Berjalan di `http://localhost:5174` dengan proxy `/api` ke
`localhost:3000`. Cukup untuk mengembangkan tampilan, tapi **selalu uji
di perangkat sungguhan sebelum rilis** — ada perbedaan perilaku WebView
yang tidak muncul di browser.

## Build aplikasi

```bash
cp .env.example .env     # WAJIB isi VITE_API_BASE dengan URL absolut
npm install

npx cap add android      # sekali saja
npm run android          # build + sync + buka Android Studio
```

Untuk iOS: `npx cap add ios` lalu `npm run ios`.

Setelah mengubah kode, jalankan `npm run sync` agar hasil build masuk ke
folder platform.

## Tiga hal yang bikin layar putih di HP padahal normal di browser

Ketiganya sudah diatur di repo ini. Jangan diubah tanpa alasan.

**1. `base: './'` di `vite.config.js`.** Di WebView, halaman dimuat dari
`https://localhost` (Android) atau `capacitor://localhost` (iOS). Path
absolut `/assets/...` akan gagal dan aplikasi tampil layar putih.

**2. `createWebHashHistory`, bukan history mode.** Tidak ada server yang
melayani fallback `index.html` di dalam WebView. History mode jalan saat
pertama dibuka, lalu layar putih begitu aplikasi di-restore dari
background.

**3. `VITE_API_BASE` harus URL absolut.** `/api` akan menunjuk ke WebView
itu sendiri, bukan ke server. Ini penyebab paling umum "jalan di browser
tapi error di HP".

Backend juga harus mengizinkan origin WebView di `CORS_ORIGINS`:

```
CORS_ORIGINS=https://billing.namaisp.net,https://localhost,capacitor://localhost
```

## Login

Pelanggan masuk dengan nomor HP dan kode OTP yang dikirim lewat
WhatsApp. Tidak ada password.

Alasannya: pelanggan RT/RW net tidak akan mengingat password, dan reset
lewat email tidak realistis karena banyak yang tidak punya email aktif.
Nomor HP sudah ada di data pelanggan dan sudah terhubung WhatsApp untuk
notifikasi.

Konsekuensi yang perlu diketahui: kalau nomor WhatsApp sistem kena
blokir, **pelanggan tidak bisa login sama sekali**. Panel admin punya
halaman Sistem untuk memantau ini.

## Catatan tentang QRIS

Pengguna tidak bisa scan QR yang tampil di layar HP-nya sendiri. Karena
itu ada tombol "Simpan gambar QR" — QR dibuka di browser sistem, pengguna
menyimpannya ke galeri, lalu membukanya dari galeri di aplikasi e-wallet.

Virtual Account sering lebih praktis bagi pengguna yang membayar dari HP
yang sama.

## Penyimpanan token

Token disimpan di Capacitor Preferences (SharedPreferences di Android,
UserDefaults di iOS), bukan `localStorage`. `localStorage` di WebView
bisa dihapus sistem saat penyimpanan menipis, dan pengguna akan
ter-logout tanpa sebab yang jelas.

Masa berlaku token 30 hari. Aplikasi yang memaksa login ulang tiap
beberapa jam akan ditinggalkan penggunanya.

## Struktur

```
capacitor.config.json   appId, appName, konfigurasi native
src/
  lib/api.js            Klien API, timeout, penyimpanan token
  stores/auth.js        Alur OTP, sesi
  router/index.js       Rute hash-mode + guard
  style.css             Gaya, safe-area, target sentuh
  main.js               Init native: status bar, tombol Back Android
  App.vue               Tab bawah
  views/
    LoginView.vue       Nomor HP → OTP
    HomeView.vue        Tagihan dan status layanan
    PayView.vue         QRIS / VA + polling status
    HistoryView.vue     Riwayat tagihan
    AccountView.vue     Profil, riwayat aktif/nonaktif, bantuan
```

## Sebelum rilis ke Play Store

- Ganti `appId` di `capacitor.config.json` menjadi domain Anda sendiri
- Siapkan ikon dan splash screen (`@capacitor/assets`)
- Set `MIDTRANS_IS_PRODUCTION=true` di backend
- Uji alur pembayaran penuh dengan uang sungguhan, nominal kecil
- Uji tombol Back Android di setiap layar
- Uji dalam kondisi sinyal buruk — matikan Wi-Fi, pakai data seluler
  satu bar

## Lisensi

MIT
