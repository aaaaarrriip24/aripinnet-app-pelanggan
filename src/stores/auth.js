import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, getToken, setToken, setUnauthorizedHandler } from '@/lib/api';
import router from '@/router';

export const useAuthStore = defineStore('auth', () => {
  const customer = ref(null);
  const token    = ref('');
  const ready    = ref(false);   // sudah selesai membaca token tersimpan
  const loading  = ref(false);

  const isLoggedIn = computed(() => !!token.value);

  /**
   * Dipanggil sekali saat app start, sebelum router aktif.
   *
   * Token pelanggan berlaku 30 hari — app mobile yang memaksa login tiap
   * beberapa jam akan ditinggalkan penggunanya.
   */
  async function init() {
    token.value = await getToken();

    if (token.value) {
      try {
        const data = await api.get('/auth/customer/me');
        customer.value = data.customer;
      } catch (e) {
        // Kalau gagal karena jaringan (status 0), JANGAN logout — pengguna
        // mungkin sedang di area tanpa sinyal. Biarkan masuk dan tampilkan
        // error di layar utama.
        if (e.status === 401) {
          token.value = '';
          await setToken('');
        }
      }
    }

    ready.value = true;
  }

  async function requestOtp(phone) {
    loading.value = true;
    try {
      return await api.postPublic('/auth/customer/request-otp', { phone });
    } finally {
      loading.value = false;
    }
  }

  async function verifyOtp(phone, code) {
    loading.value = true;
    try {
      const data = await api.postPublic('/auth/customer/verify-otp', { phone, code });
      token.value = data.token;
      customer.value = data.customer;
      await setToken(data.token);
      return data.customer;
    } finally {
      loading.value = false;
    }
  }

  async function logout(redirect = true) {
    token.value = '';
    customer.value = null;
    await setToken('');
    if (redirect) router.replace({ name: 'login' });
  }

  setUnauthorizedHandler(() => logout());

  return { customer, token, ready, loading, isLoggedIn, init, requestOtp, verifyOtp, logout };
});
