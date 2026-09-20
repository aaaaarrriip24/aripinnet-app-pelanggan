<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const auth = useAuthStore();

// Tabbar disembunyikan di layar login dan layar bayar — saat membayar,
// pengguna harus fokus ke satu hal saja.
const showTabs = computed(() =>
  auth.isLoggedIn && !route.meta.public && route.name !== 'pay'
);

const tabs = [
  { name: 'home',    label: 'Tagihan' },
  { name: 'history', label: 'Riwayat' },
  { name: 'account', label: 'Akun' },
];
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" />
  </RouterView>

  <nav v-if="showTabs" class="tabbar">
    <RouterLink
      v-for="t in tabs"
      :key="t.name"
      :to="{ name: t.name }"
      class="tab"
      active-class="active"
    >
      <span class="tab-dot"></span>
      {{ t.label }}
    </RouterLink>
  </nav>
</template>
