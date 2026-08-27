/**
 * Penyimpanan kata sandi.
 *
 * PBKDF2-SHA256 lewat WebCrypto, tersedia di semua runtime tanpa dependensi tambahan.
 * Jumlah iterasi ikut ditulis di dalam string hash, jadi bisa dinaikkan kapan pun: kata sandi
 * lama tetap bisa diverifikasi dengan iterasi lamanya, lalu ditulis ulang memakai yang baru
 * saat pemiliknya berhasil masuk.
 *
 * 210.000 iterasi ≈ 32 ms CPU per permintaan masuk atau daftar — angka yang disarankan OWASP
 * untuk PBKDF2-SHA256, dan tidak terasa di antara jalan-pergi ke database.
 */

const ALGORITHM = "pbkdf2";
const HASH = "sha256";
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

/** Kata sandi terpendek yang diterima. Panjang jauh lebih menentukan daripada campuran simbol. */
export const MIN_PASSWORD_LENGTH = 10;

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (password.length > 200) {
    return "Kata sandi maksimal 200 karakter.";
  }
  if (!password.trim()) {
    return "Kata sandi tidak boleh hanya spasi.";
  }
  return null;
}

export async function hashPassword(password: string, iterations = ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const bits = await derive(password, salt, iterations);
  return `${ALGORITHM}$${HASH}$${iterations}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

export type VerifyResult = { valid: boolean; needsRehash: boolean };

export async function verifyPassword(password: string, stored: string): Promise<VerifyResult> {
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== ALGORITHM || parts[1] !== HASH) {
    return { valid: false, needsRehash: false };
  }

  const iterations = Number(parts[2]);
  if (!Number.isInteger(iterations) || iterations < 1_000 || iterations > 5_000_000) {
    return { valid: false, needsRehash: false };
  }

  const salt = fromBase64Url(parts[3]);
  const expected = fromBase64Url(parts[4]);
  if (!salt || !expected) return { valid: false, needsRehash: false };

  const actual = new Uint8Array(await derive(password, salt, iterations));
  const valid = timingSafeEqual(actual, expected);
  return { valid, needsRehash: valid && iterations < ITERATIONS };
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
}

/**
 * Perbandingan yang waktunya tidak bergantung pada isi.
 *
 * Perbandingan biasa berhenti di byte pertama yang beda, dan selisih waktunya cukup untuk
 * menebak hash byte demi byte.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}
