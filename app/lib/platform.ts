import { env } from "cloudflare:workers";

/**
 * Siapa yang boleh memverifikasi pembayaran dan mengaktifkan paket pelanggan.
 *
 * Daftarnya dibaca dari environment variable `PLATFORM_ADMIN_EMAILS` (dipisah koma),
 * bukan ditulis di dalam kode — supaya repositori ini bisa diserahkan atau dijual tanpa
 * ikut membawa identitas admin, dan supaya penggantinya tidak butuh deploy ulang.
 *
 * Kalau variabelnya belum diisi, tidak ada seorang pun yang jadi admin. Itu default yang
 * aman: lebih baik panel penjualan tidak bisa dibuka daripada bisa dibuka siapa saja.
 */
export function platformAdminEmails(): string[] {
  const raw = env.PLATFORM_ADMIN_EMAILS;
  if (typeof raw !== "string") return [];
  return raw.split(",").map((entry) => entry.trim().toLowerCase()).filter((entry) => entry.includes("@"));
}

export function isPlatformAdmin(email: string): boolean {
  return platformAdminEmails().includes(email.trim().toLowerCase());
}

/**
 * Pesan error yang aman dikirim ke browser.
 *
 * Detail exception ditulis ke log server saja. Mengirimkannya ke klien bisa membocorkan
 * nama tabel, kolom, dan bentuk query kepada siapa pun yang sengaja memancing error.
 */
export function safeErrorMessage(error: unknown, context: string): string {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[famz] ${context} gagal — ${detail}`);

  if (detail.includes("no such table") || detail.includes("no such column")) {
    return "Database sedang disiapkan. Coba muat ulang beberapa saat lagi.";
  }
  if (detail.includes("D1 binding") || detail.includes("DB` is unavailable")) {
    return "Koneksi database belum siap. Hubungi dukungan kalau berlanjut.";
  }
  return "Terjadi kesalahan di server. Coba lagi sebentar lagi.";
}

/** Error yang pesannya memang ditujukan untuk pengguna. */
export class UserFacingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserFacingError";
    this.status = status;
  }
}
