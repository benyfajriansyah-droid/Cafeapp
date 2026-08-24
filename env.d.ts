/**
 * Binding dan konfigurasi yang tersedia untuk Worker.
 *
 * `AUTH_TRUSTED_PROXY` dan `PLATFORM_ADMIN_EMAILS` sengaja opsional di tipe ini supaya
 * kode wajib menangani keadaan "belum dikonfigurasi" — keduanya menentukan siapa yang
 * dianggap sudah masuk dan siapa yang jadi admin platform.
 */
declare global {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    IMAGES: ImagesBinding;
    AUTH_TRUSTED_PROXY?: string;
    PLATFORM_ADMIN_EMAILS?: string;
  }

  namespace Cloudflare {
    interface Env {
      ASSETS: Fetcher;
      DB: D1Database;
      IMAGES: ImagesBinding;
      AUTH_TRUSTED_PROXY?: string;
      PLATFORM_ADMIN_EMAILS?: string;
    }
  }
}

export {};
