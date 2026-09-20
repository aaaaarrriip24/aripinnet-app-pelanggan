<script setup>
/**
 * Layar pembayaran.
 *
 * Dua metode: QRIS (satu QR untuk semua e-wallet) dan Virtual Account.
 *
 * Catatan penting soal QRIS di app:
 * Pengguna tidak bisa scan QR yang tampil di layar HP-nya sendiri. Karena
 * itu tombol "Simpan gambar QR" disediakan — pengguna menyimpan QR lalu
 * membukanya dari galeri di dalam app e-wallet.
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, rupiah, periode, tanggal } from '@/lib/api';

const route = useRoute();
const router = useRouter();
const invoiceId = route.params.invoiceId;

const step = ref('pilih');   // 'pilih' | 'qris' | 'va' | 'sukses'
const invoice = ref(null);
const charge = ref(null);
const bank = ref('bca');
const loading = ref(false);
const error = ref('');
const copied = ref(false);

let pollTimer = null;
let pollCount = 0;

async function loadInvoice() {
  try {
    const data = await api.get('/customer/invoices', { limit: 50 });
    invoice.value = data.items.find((i) => String(i.id) === String(invoiceId));
    if (!invoice.value) error.value = 'Tagihan tidak ditemukan';
    else if (invoice.value.status === 'paid') step.value = 'sukses';
  } catch (e) {
    error.value = e.message;
  }
}

async function bayar(method) {
  loading.value = true;
  error.value = '';
  try {
    const data = await api.post(`/customer/invoices/${invoiceId}/pay`, {
      method,
      bank: method === 'va' ? bank.value : undefined,
    });
    charge.value = data;
    step.value = method === 'va' ? 'va' : 'qris';
    startPolling();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

/**
 * Polling status. Ini bukan sekadar UX — ini juga jaring pengaman kalau
 * webhook Midtrans tidak sampai ke server. Endpointnya memanggil API
 * status Midtrans dan menerapkan hasilnya.
 */
function startPolling() {
  stopPolling();
  pollCount = 0;

  pollTimer = setInterval(async () => {
    pollCount++;

    // Berhenti setelah ~20 menit
    if (pollCount > 240) return stopPolling();

    try {
      const d = await api.get(`/customer/payments/${encodeURIComponent(charge.value.order_id)}/status`);
      if (d.status === 'settled') {
        stopPolling();
        step.value = 'sukses';
      } else if (d.status === 'expired' || d.status === 'failed') {
        stopPolling();
        error.value = 'Transaksi kedaluwarsa. Silakan buat pembayaran baru.';
        step.value = 'pilih';
      }
    } catch {
      // Sinyal putus-putus itu normal — jangan hentikan polling
    }
  }, 5000);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

async function salin(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback untuk WebView lama yang belum mendukung Clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

/** Buka gambar QR di browser sistem supaya bisa disimpan ke galeri. */
async function simpanQr() {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: charge.value.qr_url });
  } catch {
    window.open(charge.value.qr_url, '_blank');
  }
}

onMounted(loadInvoice);
onUnmounted(stopPolling);
</script>

<template>
  <div class="screen-plain">
    <button class="link" style="margin-bottom: 8px; padding-left: 0" @click="router.back()">
      &larr; Kembali
    </button>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Ringkasan tagihan -->
    <div v-if="invoice && step !== 'sukses'" class="card">
      <div class="muted small">{{ periode(invoice.period) }}</div>
      <div style="font-size: 26px; font-weight: 600; margin: 2px 0">{{ rupiah(invoice.total) }}</div>
      <div class="muted small">{{ invoice.number }}</div>
      <div v-if="invoice.unique_code" class="muted small" style="margin-top: 6px">
        Termasuk kode unik {{ invoice.unique_code }} — bayar tepat sejumlah ini.
      </div>
    </div>

    <!-- Pilih metode -->
    <template v-if="step === 'pilih'">
      <h2>Pilih cara bayar</h2>

      <button class="block" style="margin-bottom: 10px" :disabled="loading" @click="bayar('qris')">
        <span v-if="loading" class="spinner"></span>
        QRIS — semua e-wallet & m-banking
      </button>

      <div class="card">
        <label for="bank">Virtual Account</label>
        <select id="bank" v-model="bank" style="margin-bottom: 10px">
          <option value="bca">BCA</option>
          <option value="bni">BNI</option>
          <option value="bri">BRI</option>
          <option value="permata">Permata</option>
        </select>
        <button class="ghost block" :disabled="loading" @click="bayar('va')">
          Buat nomor Virtual Account
        </button>
      </div>

      <p class="muted small">
        QRIS bisa dibayar dari Gopay, OVO, Dana, ShopeePay, dan aplikasi
        bank apa pun yang punya fitur scan QR.
      </p>
    </template>

    <!-- QRIS -->
    <template v-else-if="step === 'qris'">
      <div class="card center">
        <img v-if="charge?.qr_url" :src="charge.qr_url" alt="Kode QRIS" class="qr">
        <div style="font-size: 22px; font-weight: 600; margin-top: 10px">
          {{ rupiah(charge?.amount) }}
        </div>
        <p class="muted small" style="margin: 8px 0 0">
          Scan dengan aplikasi e-wallet atau m-banking Anda.
        </p>
      </div>

      <div class="alert alert-warning small">
        Membayar dari HP ini juga? Simpan gambar QR dulu, lalu buka dari
        galeri di aplikasi pembayaran Anda.
      </div>

      <button class="ghost block" style="margin-bottom: 10px" @click="simpanQr">
        Simpan gambar QR
      </button>

      <div class="card center">
        <span class="spinner"></span>
        <span class="muted small" style="margin-left: 6px">Menunggu pembayaran...</span>
        <p class="muted small" style="margin: 8px 0 0">
          Halaman ini otomatis berubah setelah pembayaran masuk. Jangan ditutup.
        </p>
      </div>
    </template>

    <!-- Virtual Account -->
    <template v-else-if="step === 'va'">
      <div class="card center">
        <div class="muted small">{{ charge?.va?.bank?.toUpperCase() }} Virtual Account</div>
        <div class="va-number selectable">{{ charge?.va?.va_number }}</div>
        <button class="ghost" style="margin-top: 10px" @click="salin(charge.va.va_number)">
          {{ copied ? 'Tersalin' : 'Salin nomor' }}
        </button>
        <div style="font-size: 20px; font-weight: 600; margin-top: 14px">
          {{ rupiah(charge?.amount) }}
        </div>
        <p v-if="charge?.expiry" class="muted small" style="margin: 6px 0 0">
          Berlaku sampai {{ tanggal(charge.expiry, true) }}
        </p>
      </div>

      <div class="card">
        <h2>Cara bayar</h2>
        <ol class="muted small" style="padding-left: 18px; margin: 0">
          <li>Buka aplikasi m-banking {{ charge?.va?.bank?.toUpperCase() }}.</li>
          <li>Pilih menu Transfer &rarr; Virtual Account.</li>
          <li>Masukkan nomor di atas.</li>
          <li>Pastikan nominalnya {{ rupiah(charge?.amount) }}, lalu konfirmasi.</li>
        </ol>
      </div>

      <div class="card center">
        <span class="spinner"></span>
        <span class="muted small" style="margin-left: 6px">Menunggu pembayaran...</span>
      </div>
    </template>

    <!-- Sukses -->
    <template v-else-if="step === 'sukses'">
      <div class="card center" style="padding: 32px 16px">
        <div class="badge badge-ok" style="font-size: 14px; padding: 6px 16px">Lunas</div>
        <h2 style="margin-top: 14px">Pembayaran diterima</h2>
        <p class="muted small">
          Terima kasih. Kalau layanan Anda sedang dinonaktifkan, internet
          akan aktif kembali dalam beberapa menit.
        </p>
        <p class="muted small">
          Belum menyala setelah 5 menit? Matikan router, tunggu 10 detik,
          lalu nyalakan lagi.
        </p>
      </div>

      <button class="block" @click="router.replace({ name: 'home' })">Kembali ke beranda</button>
    </template>
  </div>
</template>

<style scoped>
.qr {
  width: 100%;
  max-width: 250px;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}
.va-number {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
  word-break: break-all;
}
</style>
