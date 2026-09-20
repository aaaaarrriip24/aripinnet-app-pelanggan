/**
 * Klien API app pelanggan.
 *
 * Perbedaan penting dari versi panel admin:
 *
 * 1. BASE URL harus absolut. Di dalam WebView Capacitor, halaman dimuat
 *    dari https://localhost (Android) atau capacitor://localhost (iOS),
 *    jadi path relatif '/api' akan menunjuk ke WebView itu sendiri,
 *    bukan ke server. Ini penyebab paling umum "app jalan di browser tapi
 *    error di HP".
 *
 * 2. Token disimpan di Capacitor Preferences, bukan localStorage.
 *    localStorage di WebView bisa dihapus sistem saat storage menipis;
 *    Preferences memakai SharedPreferences/UserDefaults yang persisten.
 *
 * 3. Timeout eksplisit. Jaringan seluler sering menggantung tanpa
 *    memutus koneksi — tanpa timeout, spinner berputar selamanya.
 */

import { Preferences } from '@capacitor/preferences';

const BASE = import.meta.env.VITE_API_BASE || 'https://billing.namaisp.net/api';
const TIMEOUT_MS = 20_000;
const TOKEN_KEY = 'customer_token';

let cachedToken = null;
let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export async function getToken() {
  if (cachedToken !== null) return cachedToken;
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  cachedToken = value || '';
  return cachedToken;
}

export async function setToken(token) {
  cachedToken = token || '';
  if (token) {
    await Preferences.set({ key: TOKEN_KEY, value: token });
  } else {
    await Preferences.remove({ key: TOKEN_KEY });
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, params, auth = true } = {}) {
  let url = BASE + path;

  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    if (qs) url += '?' + qs;
  }

  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    const t = await getToken();
    if (t) headers.Authorization = 'Bearer ' + t;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    // Bedakan timeout dari jaringan mati — pesan ke pengguna berbeda
    throw new ApiError(
      e.name === 'AbortError'
        ? 'Koneksi lambat, coba lagi'
        : 'Tidak ada koneksi internet',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && auth) {
    await setToken('');
    onUnauthorized?.();
    throw new ApiError('Sesi berakhir, masuk lagi', 401);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || 'Terjadi kesalahan', res.status);

  return data;
}

export const api = {
  get:  (path, params)       => request(path, { params }),
  post: (path, body, opts)   => request(path, { method: 'POST', body, ...opts }),
  // Endpoint auth dipanggil tanpa token
  postPublic: (path, body)   => request(path, { method: 'POST', body, auth: false }),
};

/* ------------------------------------------------------------------ */
/* Format                                                              */
/* ------------------------------------------------------------------ */

export function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}

export function tanggal(d, withTime = false) {
  if (!d) return '-';
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return new Date(d).toLocaleString('id-ID', opts);
}

export function periode(p) {
  if (!p) return '-';
  const [y, m] = p.split('-');
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  return `${bulan[Number(m) - 1]} ${y}`;
}

export function relatif(d) {
  if (!d) return '';
  const diff = Math.round((new Date(d) - new Date()) / 86400000);
  if (diff === 0) return 'jatuh tempo hari ini';
  if (diff > 0)   return `${diff} hari lagi`;
  return `terlambat ${Math.abs(diff)} hari`;
}
