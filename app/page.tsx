import { ArrowRight, BarChart3, Boxes, Check, Coffee, CreditCard, ReceiptText, ShieldCheck, Sparkles, Store, UsersRound } from "lucide-react";
import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  const appLink = user ? "/app" : chatGPTSignInPath("/app");
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <a className="landing-brand" href="#top"><span><Coffee size={21} /></span><b>Famz Coffee OS</b></a>
        <div><a href="#fitur">Fitur</a><a href="#harga">Harga</a><a href="/aktivasi">Aktivasi</a><a href={appLink} className="landing-login">{user ? "Buka aplikasi" : "Masuk"}</a></div>
      </nav>

      <section className="landing-hero" id="top">
        <div className="hero-copy">
          <span className="hero-badge"><Sparkles size={14} /> Dibangun dari operasional kopi rumahan</span>
          <h1>Jualan kopi lebih rapi.<br/><em>Laba nggak lagi ditebak.</em></h1>
          <p>Kasir, resep, stok bahan, shift, dan laporan usaha dalam satu aplikasi yang mudah dipakai—untuk penjual kopi rumahan sampai kedai bertumbuh.</p>
          <div className="hero-actions"><a className="hero-primary" href={appLink}>Coba gratis 14 hari <ArrowRight size={17} /></a><a className="hero-secondary" href="#fitur">Lihat cara kerjanya</a></div>
          <small>Tanpa kartu kredit · Data bisnis terpisah dan aman</small>
        </div>
        <div className="hero-product">
          <div className="mini-window">
            <div className="mini-window-top"><span /><span /><span /><b>Ringkasan hari ini</b></div>
            <div className="mini-kpis"><div><small>Penjualan</small><b>Rp2.845.000</b><em>+12,4%</em></div><div><small>Laba kotor</small><b>Rp1.934.600</b><em>Margin 68%</em></div></div>
            <div className="mini-chart"><div><b>Performa penjualan</b><small>Omzet per jam</small></div><div className="mini-bars">{[28,42,36,58,49,72,64,88,76,94].map((h,i)=><span key={i} style={{height:`${h}%`}} />)}</div></div>
            <div className="mini-alert"><Boxes size={19}/><div><b>3 bahan perlu dibeli</b><small>Fresh milk, biji kopi, cup 16 oz</small></div><ArrowRight size={15}/></div>
          </div>
          <div className="floating-proof proof-one"><ReceiptText size={17}/><div><b>Transaksi tersimpan</b><small>Stok resep berkurang otomatis</small></div></div>
          <div className="floating-proof proof-two"><ShieldCheck size={17}/><div><b>Data tiap bisnis terpisah</b><small>Siap untuk tim & cabang</small></div></div>
        </div>
      </section>

      <section className="trust-strip"><span>UNTUK USAHA KOPI YANG MAU BERTUMBUH</span><div><b>Kopi rumahan</b><b>Booth & gerobak</b><b>Kedai kopi</b><b>Multi-outlet</b></div></section>

      <section className="landing-section" id="fitur">
        <div className="section-intro"><span>OPERASIONAL LENGKAP</span><h2>Satu alur dari pesanan sampai laba bersih.</h2><p>Bukan sekadar kasir. Semua angka terhubung supaya keputusan usaha lebih jelas.</p></div>
        <div className="feature-grid">
          <article><span><ReceiptText/></span><h3>Kasir & struk</h3><p>Pesanan cepat, metode pembayaran lengkap, dan struk siap cetak.</p></article>
          <article><span><Coffee/></span><h3>HPP & resep</h3><p>Simpan racikan, hitung biaya per produk, lalu pantau margin jual.</p></article>
          <article><span><Boxes/></span><h3>Stok otomatis</h3><p>Bahan berkurang mengikuti resep dan memberi peringatan saat menipis.</p></article>
          <article><span><BarChart3/></span><h3>Laporan usaha</h3><p>Omzet, HPP, biaya, laba kotor, dan laba bersih dalam satu tampilan.</p></article>
          <article><span><Store/></span><h3>Cabang & shift</h3><p>Pisahkan aktivitas per outlet dan rekonsiliasi kas per shift.</p></article>
          <article><span><UsersRound/></span><h3>Tim & hak akses</h3><p>Owner, manager, kasir, dan gudang melihat menu sesuai tugasnya.</p></article>
          <article><span><CreditCard/></span><h3>Langganan via OrderHero</h3><p>Checkout QRIS, VA, dan e-wallet diproses di OrderHero, lalu paket diaktifkan ke workspace.</p></article>
        </div>
      </section>

      <section className="landing-section pricing-section" id="harga">
        <div className="section-intro"><span>HARGA TRANSPARAN</span><h2>Mulai kecil, naik paket saat usaha tumbuh.</h2></div>
        <div className="pricing-grid">
          <article><span className="plan-name">STARTER</span><h3>Rp99.000<small>/bulan</small></h3><p>Untuk usaha kopi rumahan dan booth pertama.</p><ul><li><Check/>1 outlet</li><li><Check/>2 pengguna</li><li><Check/>Kasir, stok, HPP, laporan</li><li><Check/>Struk siap cetak</li></ul><a href="/order?plan=starter">Beli via OrderHero</a></article>
          <article className="featured-plan"><span className="popular">PALING COCOK</span><span className="plan-name">PRO</span><h3>Rp199.000<small>/bulan</small></h3><p>Untuk kedai yang sudah punya tim dan ingin berkembang.</p><ul><li><Check/>3 outlet</li><li><Check/>10 pengguna</li><li><Check/>Semua fitur Starter</li><li><Check/>Hak akses & laporan cabang</li></ul><a href="/order?plan=pro">Beli Pro via OrderHero</a></article>
          <article><span className="plan-name">BUSINESS</span><h3>Rp399.000<small>/bulan</small></h3><p>Untuk operasional multi-outlet yang lebih besar.</p><ul><li><Check/>Outlet lebih banyak</li><li><Check/>Pengguna tanpa batas</li><li><Check/>Semua fitur Pro</li><li><Check/>Prioritas bantuan</li></ul><a href="/order?plan=business">Beli via OrderHero</a></article>
        </div>
        <p className="pricing-note">Famz Coffee OS membantu pencatatan dan pengambilan keputusan. Hasil penjualan tetap bergantung pada operasional masing-masing usaha.</p>
      </section>

      <section className="landing-cta"><Coffee size={28}/><h2>Berhenti menebak angka usaha.</h2><p>Mulai catat satu transaksi pertama dan lihat bagaimana stok serta laba terhubung.</p><a href={appLink}>Mulai gratis 14 hari <ArrowRight size={16}/></a></section>
      <footer className="landing-footer"><div className="landing-brand"><span><Coffee size={19}/></span><b>Famz Coffee OS</b></div><p>Software operasional untuk usaha kopi Indonesia.</p><small>© 2026 Famz Coffee OS</small></footer>
    </main>
  );
}
