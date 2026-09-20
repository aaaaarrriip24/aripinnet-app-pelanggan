<script setup>
import { ref, onMounted } from 'vue';
import { api, tanggal } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const profil = ref(null);
const services = ref([]);
const events = ref([]);
const eventsFor = ref(null);
const error = ref('');

const CS_PHONE = import.meta.env.VITE_CS_PHONE || '628123456789';

async function load() {
  try {
    const [me, summary] = await Promise.all([
      api.get('/auth/customer/me'),
      api.get('/customer/summary'),
    ]);
    profil.value = me.customer;
    services.value = summary.services;
  } catch (e) {
    error.value = e.message;
  }
}

/**
 * Riwayat aktif/nonaktif layanan.
 *
 * Ini menjawab pertanyaan "kenapa internet saya sempat mati kemarin?"
 * tanpa pelanggan harus menghubungi admin. Detail teknisnya (respons
 * router) sengaja tidak dikirim ke app.
 */
async function lihatRiwayat(s) {
  if (eventsFor.value === s.id) {
    eventsFor.value = null;
    return;
  }

  eventsFor.value = s.id;
  events.value = [];
  try {
    const data = await api.get(`/customer/services/${s.id}/events`);
    events.value = data.events;
  } catch (e) {
    error.value = e.message;
  }
}

async function hubungiAdmin() {
  const url = `https://wa.me/${CS_PHONE}`;
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } catch {
    window.open(url, '_blank');
  }
}

function keluar() {
  if (confirm('Keluar dari aplikasi? Anda perlu kode WhatsApp lagi untuk masuk.')) {
    auth.logout();
  }
}

onMounted(load);
</script>

<template>
  <div class="screen">
    <h1>Akun</h1>
    <p class="muted small" style="margin-bottom: 16px">Data dan pengaturan</p>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="profil" class="card">
      <div class="info-row"><span class="muted">Nama</span><span>{{ profil.name }}</span></div>
      <div class="info-row"><span class="muted">Kode pelanggan</span><span>{{ profil.code }}</span></div>
      <div class="info-row"><span class="muted">Nomor HP</span><span>{{ profil.phone }}</span></div>
      <div v-if="profil.address" class="info-row">
        <span class="muted">Alamat</span><span style="text-align: right">{{ profil.address }}</span>
      </div>
    </div>

    <h2 style="margin-top: 18px">Layanan</h2>
    <div v-for="s in services" :key="s.id" class="card">
      <div class="row">
        <div>
          <strong>{{ s.plan?.name || s.username }}</strong>
          <div class="muted small">{{ s.plan?.rate_limit }} &middot; {{ s.username }}</div>
        </div>
        <span class="badge" :class="s.status === 'active' ? 'badge-ok' : 'badge-warning'">
          {{ s.status === 'active' ? 'Aktif' : 'Nonaktif' }}
        </span>
      </div>

      <button
        class="ghost block"
        style="margin-top: 12px; min-height: 40px; font-size: 14px"
        @click="lihatRiwayat(s)"
      >{{ eventsFor === s.id ? 'Tutup riwayat' : 'Lihat riwayat aktif/nonaktif' }}</button>

      <div v-if="eventsFor === s.id" style="margin-top: 12px">
        <div v-if="!events.length" class="muted small">Belum ada riwayat.</div>
        <div
          v-for="(e, idx) in events"
          :key="idx"
          class="small"
          style="display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border)"
        >
          <span>{{ e.action }}</span>
          <span class="muted" style="white-space: nowrap">{{ tanggal(e.at, true) }}</span>
        </div>
      </div>
    </div>

    <h2 style="margin-top: 18px">Bantuan</h2>
    <div class="card">
      <p class="muted small" style="margin-top: 0">
        Internet bermasalah, atau sudah bayar tapi belum menyala?
        Hubungi admin lewat WhatsApp.
      </p>
      <button class="ghost block" @click="hubungiAdmin">Hubungi admin</button>
    </div>

    <button class="ghost block" style="margin-top: 18px; color: var(--danger)" @click="keluar">
      Keluar
    </button>
  </div>
</template>

<style scoped>
.info-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}
.info-row:last-child { border-bottom: 0; }
</style>
