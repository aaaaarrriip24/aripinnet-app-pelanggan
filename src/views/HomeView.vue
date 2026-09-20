<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { api, rupiah, tanggal, periode, relatif } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const data = ref(null);
const loading = ref(true);
const error = ref('');

async function load() {
  error.value = '';
  try {
    data.value = await api.get('/customer/summary');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function terlambat(d) {
  return new Date(d) < new Date();
}

// Muat ulang saat app kembali dari background — pembayaran bisa saja
// sudah masuk lewat jalur lain sementara app tidak aktif.
function onVisible() {
  if (!document.hidden) load();
}

onMounted(() => {
  load();
  document.addEventListener('visibilitychange', onVisible);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisible);
});
</script>

<template>
  <div class="screen">
    <div class="row" style="margin-bottom: 16px">
      <div>
        <h1>Halo, {{ data?.customer?.name || auth.customer?.name || '' }}</h1>
        <p class="muted small">{{ data?.customer?.code || auth.customer?.code }}</p>
      </div>
      <button class="ghost" style="min-height: 38px; padding: 6px 12px; font-size: 13px" @click="load">
        Muat ulang
      </button>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="loading && !data" class="empty"><span class="spinner"></span> Memuat...</div>

    <template v-else-if="data">
      <!-- Peringatan isolir paling atas — ini alasan utama pelanggan
           membuka aplikasi ini -->
      <div v-if="data.terisolir" class="alert alert-warning">
        <strong>Layanan sedang dinonaktifkan.</strong>
        Internet akan aktif kembali otomatis beberapa menit setelah
        pembayaran Anda masuk.
      </div>

      <!-- Total tagihan -->
      <div class="card total-card">
        <div class="muted small">Total tagihan</div>
        <div class="total-amount" :class="{ owing: data.total_tagihan > 0 }">
          {{ rupiah(data.total_tagihan) }}
        </div>
        <div v-if="!data.tagihan.length" class="badge badge-ok" style="margin-top: 6px">
          Semua tagihan lunas
        </div>
      </div>

      <!-- Daftar tagihan -->
      <template v-if="data.tagihan.length">
        <h2 style="margin-top: 18px">Belum dibayar</h2>

        <RouterLink
          v-for="t in data.tagihan"
          :key="t.id"
          :to="{ name: 'pay', params: { invoiceId: t.id } }"
          class="card bill"
        >
          <div class="row">
            <div>
              <strong>{{ periode(t.period) }}</strong>
              <div class="muted small">{{ t.number }}</div>
              <div
                class="small"
                :style="terlambat(t.due_date) ? 'color: var(--danger)' : 'color: var(--text-muted)'"
              >
                {{ tanggal(t.due_date) }} &middot; {{ relatif(t.due_date) }}
              </div>
            </div>
            <div style="text-align: right">
              <div style="font-weight: 600; white-space: nowrap">{{ rupiah(t.total) }}</div>
              <div class="badge badge-danger" style="margin-top: 4px">Bayar</div>
            </div>
          </div>
        </RouterLink>
      </template>

      <!-- Layanan -->
      <h2 style="margin-top: 18px">Layanan Anda</h2>
      <div v-for="s in data.services" :key="s.id" class="card">
        <div class="row">
          <div>
            <strong>{{ s.plan?.name || s.username }}</strong>
            <div class="muted small">
              {{ s.plan?.rate_limit }}
              <template v-if="s.username"> &middot; {{ s.username }}</template>
            </div>
            <div class="muted small">
              Tagihan berikutnya {{ tanggal(s.next_due_date) }}
            </div>
          </div>
          <span class="badge" :class="s.status === 'active' ? 'badge-ok' : 'badge-warning'">
            {{ s.status === 'active' ? 'Aktif' : 'Nonaktif' }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.total-card { text-align: center; padding: 22px 16px; }
.total-amount { font-size: 30px; font-weight: 600; line-height: 1.25; margin-top: 2px; }
.total-amount.owing { color: var(--danger); }

.bill { display: block; color: inherit; }
.bill:active { background: var(--surface-2); }
</style>
