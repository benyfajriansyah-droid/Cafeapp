# Famz Coffee OS

Sistem operasional dan SaaS untuk usaha kopi rumahan, booth, kedai, dan bisnis multi-outlet. Famz Coffee OS menghubungkan kasir, resep, stok bahan, pembelian, biaya, shift kas, serta laporan laba dalam satu workspace.

## Konfigurasi sebelum deploy

Aplikasi ini punya sistem akun sendiri — email dan kata sandi, sesi tersimpan di database, tanpa bergantung pada penyedia hosting mana pun. Bisa dipasang di domain sendiri.

| Variabel | Isi | Kalau kosong |
|---|---|---|
| `APP_URL` | Alamat publik aplikasi, mis. `https://app.domain-lo.com` | Tautan di email memakai host permintaan; aman di Workers, tapi sebaiknya dikunci |
| `PLATFORM_ADMIN_EMAILS` | Email admin, dipisah koma | Panel **Penjualan SaaS** tidak bisa dibuka siapa pun |
| `RESEND_API_KEY` | Kunci API Resend (rahasia) | Reset kata sandi tidak terkirim; tautannya hanya masuk ke log server |
| `MAIL_FROM` | Pengirim, mis. `Famz Coffee OS <halo@domain-lo.com>` | Sama seperti di atas |

Yang rahasia dipasang lewat `npx wrangler secret put RESEND_API_KEY -c wrangler.deploy.jsonc`, bukan ditulis di berkas konfigurasi.

**`PLATFORM_ADMIN_EMAILS` sengaja tanpa nilai bawaan.** Kalau kosong, tidak ada seorang pun yang jadi admin. Lebih baik panel penjualan tidak bisa dibuka daripada bisa dibuka siapa saja.

**Kata sandi butuh Workers berbayar.** Masuk dan daftar memakai PBKDF2 210.000 iterasi (±32 ms CPU per permintaan). Itu melewati batas 10 ms paket Workers gratis. Jumlah iterasi tersimpan di dalam setiap hash, jadi bisa dinaikkan kapan pun tanpa membatalkan kata sandi yang sudah ada.

## Deploy ke Cloudflare sendiri

```bash
npx wrangler d1 create famz-coffee-os
# salin database_id ke wrangler.deploy.jsonc, lalu:
npx wrangler d1 migrations apply famz-coffee-os --remote -c wrangler.deploy.jsonc
npx wrangler secret put RESEND_API_KEY -c wrangler.deploy.jsonc
npm run build
npx wrangler deploy -c wrangler.deploy.jsonc
```

Berkasnya sengaja bernama `wrangler.deploy.jsonc`, bukan `wrangler.jsonc`: `npm run dev` memakai konfigurasi Worker-nya sendiri lewat plugin Vite, dan kalau ada `wrangler.jsonc` di akar proyek keduanya bergabung lalu bentrok.

## Akun dan akses

- **Daftar dan masuk** di `/daftar` dan `/masuk`. Kata sandi minimal 10 karakter, disimpan sebagai PBKDF2-SHA256.
- **Sesi** berumur 30 hari, disimpan sebagai cookie `HttpOnly` + `SameSite=Lax`. Yang tersimpan di database hanya SHA-256 token-nya, jadi salinan database yang bocor tidak bisa dipakai untuk menyamar.
- **Undangan tim** dibuat sebagai tautan yang terikat ke satu alamat email dan berlaku 7 hari. Salin dari layar lalu kirim lewat WhatsApp — tidak butuh konfigurasi email.
- **Lupa kata sandi** di `/lupa-password`. Ini satu-satunya fitur yang benar-benar butuh `RESEND_API_KEY`.
- **Percobaan masuk** dibatasi 8 kali berturut-turut per akun, lalu terkunci 15 menit.
- Mengganti atau mengatur ulang kata sandi mengakhiri semua sesi lain di perangkat mana pun.

## Fitur utama

- Landing page produk dan paket harga
- Onboarding mandiri, dengan pilihan mulai kosong atau dengan data contoh
- Workspace terpisah untuk setiap bisnis
- POS/kasir dengan struk 80 mm siap cetak
- Resep yang bisa disusun sendiri; stok bahan berkurang otomatis saat terjual
- Produk, HPP, harga jual, dan margin
- Pembelian bahan, stok opname, dan biaya operasional
- Shift kas per outlet dan rekonsiliasi
- Pembatalan transaksi dengan pengembalian stok
- Laporan penjualan, HPP, laba kotor, dan laba bersih dengan filter periode
- Multi-outlet dengan pemisahan data per cabang dan batas berdasarkan paket
- Tim dengan role `owner`, `manager`, `cashier`, dan `inventory`
- Batas diskon kasir yang bisa diatur pemilik
- Billing internal dan checkout OrderHero dengan approval admin

## Paket produk

| Paket | Harga bulanan | Outlet | Pengguna |
|---|---:|---:|---:|
| Starter | Rp99.000 | 1 | 2 |
| Pro | Rp199.000 | 3 | 10 |
| Business | Rp399.000 | 25 | 200 |

Masa uji coba 14 hari memberi akses setara paket Pro. Setelah itu workspace terkunci: datanya tetap tersimpan dan bisa dibaca, tapi tidak ada aksi operasional yang bisa dijalankan sampai paketnya diperpanjang.

Pembayaran diproses OrderHero. Link produk per paket ditempel dari panel **Penjualan SaaS**. Materi listing dan SOP peluncuran ada di [`docs/orderhero-launch-kit.md`](docs/orderhero-launch-kit.md).

## Cara paket menjadi aktif

Ini satu-satunya jalur yang memberi hak akses berbayar:

1. Pembeli checkout dari landing page. Sistem membuat **kode checkout** acak (`FCO-XXXX-XXXX-XXXX-XXXX`) dan mencatat klaimnya.
2. Pembeli membayar di OrderHero, lalu membuka `/aktivasi` dan memasukkan kode checkout beserta nomor invoice.
   Klaim hanya bisa diambil oleh akun dengan email yang sama seperti saat checkout.
3. Admin membuka **Penjualan SaaS**, mencocokkan invoice, lalu menyetujui.
4. Baru pada langkah ini kolom `paid_plan` terisi dan paket berlaku.

Memilih paket di dalam aplikasi hanya membuat tagihan — tidak pernah memberi hak akses. Batas outlet dan jumlah pengguna selalu dibaca dari paket yang sudah terverifikasi bayar, bukan dari pilihan pengguna.

## Teknologi

- Vinext / React 19 / TypeScript
- Tailwind CSS
- Cloudflare Workers dan D1
- Drizzle ORM
- Autentikasi mandiri: kata sandi PBKDF2 dan sesi berbasis cookie

## Menjalankan project

Prasyarat: Node.js `>=22.13.0`.

```bash
npm ci
npm run dev
```

Perintah penting:

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build      # build terbatas waktu
npm test           # uji logika + migrasi
npm run test:build # build dulu, lalu seluruh uji termasuk hasil build
npm run db:generate
npm run db:migrate:local  # terapkan migrasi ke D1 lokal (dev)
```

Migrasi database ada di `drizzle/` dan diterapkan berurutan. `npm test` menjalankan seluruh migrasi ke SQLite sungguhan dan memeriksa data lama tetap utuh.

## Struktur utama

```text
app/
  page.tsx              Landing page publik
  masuk/ daftar/        Halaman masuk dan daftar
  lupa-password/        Permintaan tautan reset
  atur-password/        Membuat kata sandi baru dari tautan
  keluar/               Mengakhiri sesi (selalu lewat POST)
  app/page.tsx          Aplikasi yang membutuhkan sign-in
  coffee-app.tsx        Shell dashboard, pemilih outlet, struk
  modules/              Satu berkas per layar (kasir, laporan, stok, dst)
  lib/
    auth/password.ts    Hash PBKDF2 dan perbandingan aman-waktu
    auth/session.ts     Cookie sesi, penjaga asal permintaan, tujuan aman
    auth/tokens.ts      Token acak untuk sesi, undangan, dan reset
    auth/mail.ts        Pengiriman email opsional lewat Resend
    plans.ts            Paket, batas, dan hak akses langganan
    money.ts            Hitungan pesanan, pajak, diskon, laba
    chunk.ts            Pemecah insert agar tidak melewati batas parameter D1
    platform.ts         Admin platform dan sanitasi pesan error
    reference.ts        Kode checkout OrderHero
  api/auth/route.ts     Daftar, masuk, keluar, reset, terima undangan
  api/app/route.ts      API dan pemeriksaan hak akses
db/schema.ts            Skema data multi-tenant
drizzle/                Migrasi database
scripts/migrate-local.mjs  Menerapkan migrasi ke D1 lokal saat pengembangan
tests/                  Uji logika, autentikasi, batas D1, dan migrasi
wrangler.deploy.jsonc   Konfigurasi deploy ke Cloudflare sendiri
```

## Keamanan data

Semua query dan aksi ditautkan ke `workspaceId`, dan aksi tulis diperiksa berdasarkan peran di server sebelum data berubah — bukan hanya menyembunyikan tombol di layar. Baris milik workspace lain ditolak lewat pemeriksaan kepemilikan, bukan hanya lewat id.

Nominal uang disimpan sebagai integer rupiah supaya penjumlahan di laporan tidak mengakumulasi galat floating point. Yang tetap pecahan hanya besaran fisik bahan dan harga per satuan.

Kata sandi tidak pernah disimpan, hanya turunan PBKDF2-nya dengan salt acak per akun. Token sesi, undangan, dan reset juga hanya disimpan sebagai SHA-256 — yang bocor dari salinan database tidak bisa dipakai untuk masuk. Permintaan tulis wajib berasal dari origin aplikasi sendiri, jadi form dari situs lain tidak bisa menumpang sesi yang sedang aktif.

Pesan error dari server disanitasi sebelum dikirim ke browser; detail lengkapnya hanya masuk log.

## Roadmap komersial

- Integrasi payment gateway Indonesia langsung
- Notifikasi tagihan lewat email dan WhatsApp
- Ekspor laporan PDF/Excel
- Target penjualan dan perencanaan batch produksi
- Dukungan printer Bluetooth/ESC-POS
- Masuk dengan Google

## Catatan

Famz Coffee OS membantu pencatatan dan pengambilan keputusan. Produk ini tidak menjanjikan keuntungan atau penjualan instan; hasil tetap bergantung pada kualitas produk dan operasional setiap usaha.
