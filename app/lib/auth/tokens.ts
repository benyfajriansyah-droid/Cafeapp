/**
 * Token acak untuk sesi, undangan, dan reset kata sandi.
 *
 * Aturannya sama untuk ketiganya: tokennya cuma ada satu kali di tangan penerima, dan yang
 * disimpan di database hanya SHA-256-nya. Salinan database yang bocor tidak bisa dipakai
 * untuk masuk, menerima undangan, atau mengambil alih kata sandi orang.
 */

const SESSION_TOKEN_BYTES = 32;
const LINK_TOKEN_BYTES = 32;

/**
 * Sengaja tidak diimpor dari `password.ts`.
 *
 * Modul ini dipakai langsung oleh test yang berjalan di Node tanpa bundler, dan di sana impor
 * relatif wajib menyebutkan ekstensi berkas. Menyalin sepuluh baris ini jauh lebih murah
 * daripada mengubah aturan impor seluruh proyek.
 */
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newSessionToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(SESSION_TOKEN_BYTES)));
}

export function newLinkToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(LINK_TOKEN_BYTES)));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toBase64Url(new Uint8Array(digest));
}

export function isoIn(milliseconds: number): string {
  return new Date(Date.now() + milliseconds).toISOString();
}

export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const RESET_LIFETIME_MS = 60 * 60 * 1000;
export const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/** Sesi diperpanjang kalau sisa umurnya kurang dari ini, supaya tidak menulis di setiap request. */
export const SESSION_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
