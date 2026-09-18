# Cafe App — Dkriuk

Branch ini khusus implementasi Cafe App untuk client Dkriuk.

## Batas pemisahan

- Perubahan khusus Dkriuk hanya dikerjakan di branch `client/dkriuk-cafe-app`.
- Branch `main` tetap menjadi produk utama Cafe App dan tidak mengikuti kebutuhan khusus Dkriuk.
- Data dan deployment Dkriuk harus dipisahkan dari aplikasi utama sebelum go-live.

## Ruang lingkup revisi

- Akun pemilik: akses penuh.
- Akun kasir: kasir, penjualan harian, produk, dan stok barang.
- Menu utama: kasir, produk yang dijual, stok barang, akun, dan laporan keuangan.
- Pemilik dapat mencatat pembelian atau stok masuk dari menu stok barang.
- Laporan dapat diunduh sebagai satu file spreadsheet berisi tab ringkasan, transaksi,
  detail penjualan, pelanggan, produk, stok, pergerakan stok, biaya, dan shift.

## Penyimpanan data

- Neon Postgres adalah sumber data utama aplikasi.
- Spreadsheet adalah salinan laporan untuk arsip dan pengolahan lanjutan, bukan database utama.
- Ekspor mengikuti outlet dan rentang tanggal yang sedang dipilih di menu Laporan.
- File `.xls` dapat dibuka di Excel/LibreOffice atau diimpor ke Google Sheets.

## Skema serah-terima

- Domain khusus tidak diwajibkan; alamat deployment gratis dapat dipakai selama masih tersedia.
- Akun hosting, database, dan email operasional idealnya dimiliki client.
- Fasilitas gratis tunduk pada batas dan perubahan kebijakan masing-masing penyedia.
- Upgrade kapasitas dan fitur baru berada di luar harga implementasi awal.
- Garansi hanya mencakup bug pada fitur yang disepakati, bukan perubahan alur atau fitur baru.
