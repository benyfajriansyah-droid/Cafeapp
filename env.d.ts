/**
 * Binding dan konfigurasi yang tersedia untuk Worker.
 *
 * Semua variabel di bawah sengaja opsional supaya kode wajib menangani keadaan
 * "belum dikonfigurasi". Yang menentukan keamanan — siapa yang jadi admin platform, ke mana
 * tautan reset kata sandi mengarah — lebih baik mati saat belum diisi daripada diam-diam
 * memakai nilai bawaan yang salah.
 */
declare global {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    IMAGES: ImagesBinding;
    /** Email admin platform, dipisah koma. Kosong = tidak ada yang jadi admin. */
    PLATFORM_ADMIN_EMAILS?: string;
    /** Alamat publik aplikasi, mis. https://app.famzcoffee.id. Dipakai untuk tautan di email. */
    APP_URL?: string;
    /** Kunci Resend untuk email reset kata sandi. Kosong = reset kata sandi tidak terkirim. */
    RESEND_API_KEY?: string;
    /** Alamat pengirim email, mis. "Famz Coffee OS <halo@famzcoffee.id>". */
    MAIL_FROM?: string;
  }

  namespace Cloudflare {
    interface Env {
      ASSETS: Fetcher;
      DB: D1Database;
      IMAGES: ImagesBinding;
      PLATFORM_ADMIN_EMAILS?: string;
      APP_URL?: string;
      RESEND_API_KEY?: string;
      MAIL_FROM?: string;
    }
  }
}

export {};
