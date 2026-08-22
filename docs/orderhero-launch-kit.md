# Famz Coffee OS — OrderHero Launch Kit

Paket copy-paste untuk menjual Famz Coffee OS melalui OrderHero. Buat tiga produk terpisah agar setiap paket punya harga dan link checkout sendiri.

## Produk dan harga

| Produk | Bulanan | Tahunan | Batas utama |
|---|---:|---:|---|
| Famz Coffee OS Starter | Rp99.000 | Rp990.000 | 1 outlet, 2 pengguna |
| Famz Coffee OS Pro | Rp199.000 | Rp1.990.000 | 3 outlet, 10 pengguna |
| Famz Coffee OS Business | Rp399.000 | Rp3.990.000 | Multi-outlet, pengguna tanpa batas standar |

Buat varian atau produk tahunan terpisah bila form OrderHero tidak mendukung beberapa harga.

## Listing siap pakai

**Nama:** Famz Coffee OS — [Starter/Pro/Business]

**Deskripsi singkat:**

> Aplikasi operasional usaha kopi Indonesia: kasir, struk, resep & HPP, stok otomatis, pembelian, biaya, shift, cabang, tim, dan laporan laba dalam satu dashboard.

**Deskripsi utama:**

> Berhenti menebak stok dan laba usaha kopi. Famz Coffee OS menghubungkan transaksi kasir dengan resep, pemakaian bahan, HPP, biaya operasional, shift kas, dan laporan usaha. Cocok untuk kopi rumahan, booth, kedai, hingga multi-outlet. Setelah pembayaran terverifikasi, pembeli menerima instruksi aktivasi dan dapat menyiapkan workspace usahanya sendiri.

**Yang didapat:**

- Akses Famz Coffee OS sesuai masa paket.
- POS/kasir dengan struk 80 mm.
- Produk, resep, HPP, dan margin.
- Stok bahan dan peringatan stok minimum.
- Pembelian, supplier, dan biaya operasional.
- Shift kas dan rekonsiliasi.
- Laporan omzet, HPP, laba kotor, dan laba bersih.
- Manajemen outlet dan akses tim sesuai paket.
- Onboarding mandiri dan dukungan aktivasi.

## Form order wajib

Minta nama lengkap, email akun, nomor WhatsApp, dan **Kode checkout Famz (FCO-...)**. Field kode harus wajib karena dipakai mencocokkan checkout dengan aktivasi.

## Pesan otomatis setelah pembayaran

> Pembayaran lo sudah diterima. Simpan nomor invoice OrderHero, lalu buka https://famz-coffee-os.benyfm.chatgpt.site/aktivasi. Masuk menggunakan email owner yang akan memakai aplikasi. Isi Kode Checkout Famz dan Nomor Invoice OrderHero. Tim Famz akan mencocokkan pembayaran dan mengaktifkan paket ke workspace lo. Jangan pernah kirim PIN, OTP, nomor kartu, atau password.

## Hubungkan link checkout

1. Masuk ke aplikasi dengan `beny.fajriansyah@gmail.com`.
2. Pilih **Penjualan SaaS**.
3. Tempel link form order Starter, Pro, dan Business.
4. Isi WhatsApp bantuan dengan format `62812...`.
5. Klik **Simpan integrasi**.

Landing page langsung memakai link tersebut tanpa redeploy.

## SOP verifikasi

1. Buka **Penjualan SaaS** dan cari status `payment review`.
2. Cocokkan invoice, email, paket, dan nominal dengan dashboard OrderHero.
3. Pastikan pembayaran berstatus lunas di OrderHero.
4. Klik **Setujui**. Paket langsung aktif bila workspace sudah ada; jika belum, paket aktif saat pembeli masuk dengan email yang sama.
5. Klik **Tolak** bila invoice tidak valid atau tidak cocok.

Jangan menyetujui hanya dari screenshot. Sumber kebenaran pembayaran adalah dashboard OrderHero.

## FAQ pembeli

**Harus instal aplikasi?** Tidak. Aplikasi berjalan di browser laptop, tablet, atau ponsel.

**Metode pembayarannya?** Mengikuti checkout OrderHero, termasuk QRIS, Virtual Account, dan e-wallet yang aktif pada produk.

**Kapan paket aktif?** Setelah invoice dicocokkan. Target operasional yang disarankan maksimal 1×24 jam kerja.

**Apakah data usaha tercampur?** Tidak. Setiap bisnis memiliki workspace terpisah dan akses berbasis peran.

**Bisa ganti paket?** Bisa. Beli paket baru lalu ajukan aktivasi menggunakan invoice baru.

**Apakah hasil usaha dijamin?** Tidak. Aplikasi membantu pencatatan dan keputusan; hasil bergantung pada operasional usaha.

## Kebijakan yang disarankan

- Aktivasi maksimal 1×24 jam kerja setelah data pembayaran lengkap dan cocok.
- Refund mengikuti kebijakan OrderHero dan hukum yang berlaku. Jelaskan kondisi refund sebelum pembelian.
- Nama, email, WhatsApp, invoice, dan data operasional hanya dipakai untuk layanan, dukungan, keamanan, dan administrasi langganan.

## Copy promosi

**Caption:**

> Jualan kopi rame tapi laba masih ditebak? Famz Coffee OS merapikan kasir, resep & HPP, stok bahan, biaya, shift, dan laporan dalam satu dashboard. Mulai Rp99 ribu/bulan. Checkout aman via OrderHero. Coba gratis 14 hari atau pilih paket yang pas untuk usaha lo.

**WhatsApp:**

> Halo! Famz Coffee OS sekarang tersedia untuk usaha kopi rumahan sampai multi-outlet. Ada kasir, struk, stok otomatis dari resep, HPP, shift, tim, dan laporan laba. Mulai Rp99 ribu/bulan, bayar via OrderHero. Lihat paket: https://famz-coffee-os.benyfm.chatgpt.site/#harga

**Headline:** Stok berkurang otomatis. Laba nggak lagi ditebak.

**CTA:** Pilih Paket & Bayar via OrderHero

## Checklist sebelum iklan

- [ ] Tiga produk dan harga sudah dibuat di OrderHero.
- [ ] Field Kode Checkout Famz diwajibkan.
- [ ] Pesan otomatis berisi link `/aktivasi`.
- [ ] Link produk sudah ditempel di Penjualan SaaS.
- [ ] Nomor WhatsApp bantuan sudah benar.
- [ ] Transaksi uji selesai dari landing page hingga aktivasi.
- [ ] Refund, privasi, dan kontak dukungan terlihat.
- [ ] Pixel/analytics OrderHero dipasang bila diperlukan.

## Arsitektur pembayaran

OrderHero menangani checkout dan verifikasi pembayaran. Famz Coffee OS mencatat kode checkout, mencocokkan invoice, dan mengaktifkan workspace. Sistem tidak menerima data kartu, PIN, atau OTP. Jika OrderHero menyediakan webhook/API resmi untuk akun penjual, approval manual dapat diganti callback terverifikasi tanpa mengubah pengalaman pembeli.
