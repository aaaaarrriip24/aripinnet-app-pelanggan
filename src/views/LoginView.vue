<script setup>
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const step = ref('phone');   // 'phone' | 'otp'
const phone = ref('');
const code = ref('');
const error = ref('');
const info = ref('');
const cooldown = ref(0);
const otpInput = ref(null);

let cooldownTimer = null;

function startCooldown(seconds = 60) {
  cooldown.value = seconds;
  clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    cooldown.value--;
    if (cooldown.value <= 0) clearInterval(cooldownTimer);
  }, 1000);
}

async function kirimKode() {
  error.value = '';
  const p = phone.value.replace(/[^0-9]/g, '');

  if (p.length < 10) {
    error.value = 'Nomor HP belum lengkap';
    return;
  }

  try {
    await auth.requestOtp(phone.value);
    step.value = 'otp';
    info.value = 'Kode dikirim lewat WhatsApp. Cek pesan masuk Anda.';
    startCooldown();
    await nextTick();
    otpInput.value?.focus();
  } catch (e) {
    error.value = e.message;
  }
}

async function verifikasi() {
  error.value = '';
  if (code.value.length !== 6) {
    error.value = 'Kode terdiri dari 6 angka';
    return;
  }

  try {
    await auth.verifyOtp(phone.value, code.value);
    router.replace({ name: 'home' });
  } catch (e) {
    error.value = e.message;
    code.value = '';
  }
}

function ubahNomor() {
  step.value = 'phone';
  code.value = '';
  error.value = '';
  info.value = '';
}

/** Verifikasi otomatis begitu 6 angka terisi — hemat satu ketukan. */
function onCodeInput(e) {
  code.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
  if (code.value.length === 6) verifikasi();
}
</script>

<template>
  <div class="screen-plain login">
    <div class="brand">
      <h1>Billing Internet</h1>
      <p class="muted small">Cek dan bayar tagihan internet Anda</p>
    </div>

    <div class="card">
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div v-else-if="info" class="alert alert-ok">{{ info }}</div>

      <!-- Langkah 1: nomor HP -->
      <form v-if="step === 'phone'" @submit.prevent="kirimKode">
        <div class="field">
          <label for="phone">Nomor HP</label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            inputmode="numeric"
            autocomplete="tel"
            placeholder="08123456789"
            required
          >
          <p class="muted small" style="margin: 6px 0 0">
            Gunakan nomor yang terdaftar di data pelanggan. Kode masuk
            dikirim lewat WhatsApp.
          </p>
        </div>

        <button type="submit" class="block" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner"></span>
          {{ auth.loading ? 'Mengirim...' : 'Kirim kode' }}
        </button>
      </form>

      <!-- Langkah 2: OTP -->
      <form v-else @submit.prevent="verifikasi">
        <div class="field">
          <label for="code">Kode dari WhatsApp</label>
          <input
            id="code"
            ref="otpInput"
            :value="code"
            @input="onCodeInput"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="000000"
            class="otp-input"
            required
          >
          <p class="muted small" style="margin: 6px 0 0">
            Dikirim ke {{ phone }}. Berlaku 5 menit.
          </p>
        </div>

        <button type="submit" class="block" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner"></span>
          {{ auth.loading ? 'Memeriksa...' : 'Masuk' }}
        </button>

        <div class="center" style="margin-top: 12px">
          <button
            type="button"
            class="link"
            :disabled="cooldown > 0 || auth.loading"
            @click="kirimKode"
          >{{ cooldown > 0 ? `Kirim ulang dalam ${cooldown}s` : 'Kirim ulang kode' }}</button>
          <br>
          <button type="button" class="link" @click="ubahNomor">Ganti nomor HP</button>
        </div>
      </form>
    </div>

    <p class="muted small center" style="margin-top: 20px">
      Jangan berikan kode masuk ke siapa pun, termasuk yang mengaku admin.
    </p>
  </div>
</template>

<style scoped>
.login { display: flex; flex-direction: column; justify-content: center; }
.brand { text-align: center; margin-bottom: 24px; }
</style>
