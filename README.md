# Famz Coffee OS

Sistem operasional dan SaaS untuk usaha kopi rumahan, booth, kedai, dan bisnis multi-outlet. Famz Coffee OS menghubungkan kasir, resep, stok bahan, pembelian, biaya, shift kas, serta laporan laba dalam satu workspace.

## Fitur utama

- Landing page produk dan paket harga
- Onboarding bisnis mandiri
- Workspace terpisah untuk setiap bisnis
- POS/kasir dengan struk 80 mm siap cetak
- Pengurangan stok otomatis berdasarkan resep
- Produk, HPP, harga jual, dan margin
- Pembelian bahan dan biaya operasional
- Shift kas dan rekonsiliasi
- Laporan penjualan, HPP, laba kotor, dan laba bersih
- Multi-outlet dengan batas berdasarkan paket
- Tim dengan role `owner`, `manager`, `cashier`, dan `inventory`
- Billing internal untuk paket Starter, Pro, dan Business
- Checkout OrderHero, kode referensi, aktivasi pelanggan, dan approval admin

## Paket produk

| Paket | Harga bulanan | Outlet | Pengguna |
|---|---:|---:|---:|
| Starter | Rp99.000 | 1 | 2 |
| Pro | Rp199.000 | 3 | 10 |
| Business | Rp399.000 | Lebih banyak | Tanpa batas standar |

Pembayaran diproses oleh OrderHero. Link produk per paket dapat ditempel dari panel **Penjualan SaaS**; aplikasi mencatat kode checkout, pengajuan invoice, dan aktivasi workspace. Materi listing serta SOP peluncuran ada di [`docs/orderhero-launch-kit.md`](docs/orderhero-launch-kit.md).

## Teknologi

- Vinext / React 19 / TypeScript
- Tailwind CSS
- Cloudflare Workers
- Cloudflare D1
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
npm run lint
npm run build
npm run db:generate
```

## Struktur utama

```text
app/
  page.tsx              Landing page publik
  app/page.tsx          Aplikasi yang membutuhkan sign-in
  coffee-app.tsx        Shell dashboard
  module-page.tsx       Modul operasional
  api/app/route.ts      API dan pemeriksaan hak akses
db/
  schema.ts             Skema data multi-tenant
drizzle/                Migrasi database
```

## Keamanan data

Semua query dan aksi ditautkan ke `workspaceId`. API memeriksa identitas pengguna dan role di server sebelum transaksi, pengubahan stok, pengelolaan tim, outlet, pengaturan, atau billing dilakukan.

## Roadmap komersial

- Integrasi payment gateway Indonesia
- Email undangan dan notifikasi tagihan
- Pengelolaan resep yang lebih visual
- Target penjualan dan perencanaan batch produksi
- Template SOP operasional
- Ekspor laporan PDF/Excel
- Dukungan printer Bluetooth/ESC-POS

## Catatan

Famz Coffee OS membantu pencatatan dan pengambilan keputusan. Produk ini tidak menjanjikan keuntungan atau penjualan instan; hasil tetap bergantung pada kualitas produk dan operasional setiap usaha.
