<script setup>
import { ref, onMounted } from 'vue';
import { api, rupiah, tanggal, periode } from '@/lib/api';

const items = ref([]);
const total = ref(0);
const page = ref(1);
const limit = 12;
const loading = ref(false);
const error = ref('');

async function load(reset = false) {
  if (reset) {
    page.value = 1;
    items.value = [];
  }

  loading.value = true;
  error.value = '';
  try {
    const data = await api.get('/customer/invoices', { page: page.value, limit });
    // Append, bukan replace — pola "muat lebih banyak" lebih pas di HP
    // daripada pagination bernomor.
    items.value = page.value === 1 ? data.items : items.value.concat(data.items);
    total.value = data.total;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function muatLagi() {
  page.value++;
  load();
}

function badge(s) {
  return { paid: 'badge-ok', unpaid: 'badge-danger', void: 'badge-muted' }[s] || 'badge-muted';
}

function label(s) {
  return { paid: 'Lunas', unpaid: 'Belum bayar', void: 'Dibatalkan' }[s] || s;
}

onMounted(() => load(true));
</script>

<template>
  <div class="screen">
    <h1>Riwayat tagihan</h1>
    <p class="muted small" style="margin-bottom: 16px">{{ total }} tagihan</p>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <component
      v-for="i in items"
      :key="i.id"
      :is="i.status === 'unpaid' ? 'RouterLink' : 'div'"
      :to="i.status === 'unpaid' ? { name: 'pay', params: { invoiceId: i.id } } : undefined"
      class="card item"
    >
      <div class="row">
        <div>
          <strong>{{ periode(i.period) }}</strong>
          <div class="muted small">{{ i.number }}</div>
          <div class="muted small">
            <template v-if="i.status === 'paid'">Dibayar {{ tanggal(i.paid_at) }}</template>
            <template v-else>Jatuh tempo {{ tanggal(i.due_date) }}</template>
          </div>
        </div>
        <div style="text-align: right">
          <div style="font-weight: 600; white-space: nowrap">{{ rupiah(i.total) }}</div>
          <span class="badge" :class="badge(i.status)" style="margin-top: 4px">
            {{ label(i.status) }}
          </span>
        </div>
      </div>
    </component>

    <div v-if="loading" class="empty"><span class="spinner"></span> Memuat...</div>

    <div v-else-if="!items.length" class="empty">Belum ada tagihan</div>

    <button
      v-else-if="items.length < total"
      class="ghost block"
      @click="muatLagi"
    >Muat lebih banyak</button>
  </div>
</template>

<style scoped>
.item { display: block; color: inherit; }
</style>
