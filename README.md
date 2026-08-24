# Famz Coffee OS

Sistem operasional dan SaaS untuk usaha kopi rumahan, booth, kedai, dan bisnis multi-outlet. Famz Coffee OS menghubungkan kasir, resep, stok bahan, pembelian, biaya, shift kas, serta laporan laba dalam satu workspace.

## ⚠️ Konfigurasi wajib sebelum deploy

Aplikasi ini **sengaja gagal aman**: tanpa dua variabel di bawah, tidak ada yang bisa masuk dan tidak ada yang jadi admin. Isi keduanya di Wrangler vars/secrets atau control plane hosting sebelum menjalankan di produksi.

| Variabel | Isi | Kalau kosong |
|---|---|---|
| `AUTH_TRUSTED_PROXY` | `chatgpt-sites` | Tidak ada pengguna yang dikenali; semua permintaan dianggap belum masuk |
| `PLATFORM_ADMIN_EMAILS` | Email admin, dipisah koma | Panel **Penjualan SaaS** tidak bisa dibuka siapa pun |

**Kenapa `AUTH_TRUSTED_PROXY` perlu dinyatakan.** Identitas pengguna diambil dari header `oai-authenticated-user-email` yang disuntikkan proxy ChatGPT Sites. Header itu hanya aman selama ada proxy di depan aplikasi yang menghapus versi palsunya. Kalau aplikasi dijalankan langsung — domain sendiri, VPS, Workers tanpa proxy, atau deployment preview — siapa pun bisa mengirim header itu dan langsung menjadi pemilik atau admin. Variabel ini memaksa keputusan itu jadi eksplisit.

Kalau nanti pindah dari ChatGPT Sites, ganti dulu lapisan autentikasi di `app/chatgpt-auth.ts` dengan sesi bertanda tangan atau OAuth yang diverifikasi sendiri.

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
- Sign in with ChatGPT melalui Sites

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
```

Migrasi database ada di `drizzle/` dan diterapkan berurutan. `npm test` menjalankan seluruh migrasi ke SQLite sungguhan dan memeriksa data lama tetap utuh.

## Struktur utama

```text
app/
  page.tsx              Landing page publik
  app/page.tsx          Aplikasi yang membutuhkan sign-in
  coffee-app.tsx        Shell dashboard, pemilih outlet, struk
  modules/              Satu berkas per layar (kasir, laporan, stok, dst)
  lib/
    plans.ts            Paket, batas, dan hak akses langganan
    money.ts            Hitungan pesanan, pajak, diskon, laba
    chunk.ts            Pemecah insert agar tidak melewati batas parameter D1
    platform.ts         Admin platform dan sanitasi pesan error
    reference.ts        Kode checkout OrderHero
  api/app/route.ts      API dan pemeriksaan hak akses
db/schema.ts            Skema data multi-tenant
drizzle/                Migrasi database
tests/                  Uji logika, batas D1, dan migrasi
```

## Keamanan data

Semua query dan aksi ditautkan ke `workspaceId`, dan aksi tulis diperiksa berdasarkan peran di server sebelum data berubah — bukan hanya menyembunyikan tombol di layar. Baris milik workspace lain ditolak lewat pemeriksaan kepemilikan, bukan hanya lewat id.

Nominal uang disimpan sebagai integer rupiah supaya penjumlahan di laporan tidak mengakumulasi galat floating point. Yang tetap pecahan hanya besaran fisik bahan dan harga per satuan.

Pesan error dari server disanitasi sebelum dikirim ke browser; detail lengkapnya hanya masuk log.

## Roadmap komersial

- Integrasi payment gateway Indonesia langsung
- Email undangan tim dan notifikasi tagihan
- Ekspor laporan PDF/Excel
- Target penjualan dan perencanaan batch produksi
- Dukungan printer Bluetooth/ESC-POS
- Autentikasi mandiri supaya bisa lepas dari ChatGPT Sites

## Catatan

Famz Coffee OS membantu pencatatan dan pengambilan keputusan. Produk ini tidak menjanjikan keuntungan atau penjualan instan; hasil tetap bergantung pada kualitas produk dan operasional setiap usaha.
