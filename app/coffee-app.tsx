"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Coffee,
  CreditCard,
  LayoutDashboard,
  Menu,
  PackagePlus,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  Store,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import ModulePage from "./module-page";

type DashboardData = {
  workspace: { onboardingCompleted: boolean };
  platformAdmin: boolean;
  products: Array<{ id: string; name: string; category: string; price: number; cost: number }>;
  ingredients: Array<{ id: string; name: string; stockQty: number; minimumStock: number; unit: string }>;
  orders: Array<{ id: string; total: number }>;
  orderItems: Array<{ productId: string; quantity: number; subtotal: number; unitCost: number }>;
  expenses: Array<{ amount: number }>;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function numberFormat(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
}

const nav = [
  { label: "Ringkasan", icon: LayoutDashboard },
  { label: "Kasir", icon: ShoppingCart },
  { label: "Transaksi", icon: ReceiptText },
  { label: "Produk & Resep", icon: Coffee },
  { label: "Stok Bahan", icon: Boxes },
  { label: "Pembelian", icon: PackagePlus },
  { label: "Biaya", icon: WalletCards },
  { label: "Shift Kas", icon: ClipboardList },
  { label: "Laporan", icon: BarChart3 },
];

const sales = [32, 44, 39, 58, 51, 72, 65, 88, 74, 93, 81, 97, 84, 112];

const topProducts = [
  { name: "Kopi Susu Famz", category: "Coffee", sold: 63, revenue: 1134000, color: "#c96f45" },
  { name: "Americano Aren", category: "Coffee", sold: 41, revenue: 615000, color: "#426b5a" },
  { name: "Matcha Cream", category: "Non Coffee", sold: 28, revenue: 560000, color: "#8d9c6d" },
  { name: "Croissant Butter", category: "Pastry", sold: 21, revenue: 378000, color: "#d6a552" },
];

const lowStock = [
  { name: "Fresh milk", remaining: "3,5 L", percent: 18, status: "Kritis" },
  { name: "Biji kopi house blend", remaining: "1,2 kg", percent: 24, status: "Rendah" },
  { name: "Cup 16 oz", remaining: "42 pcs", percent: 28, status: "Rendah" },
];

const activities = [
  { title: "Shift pagi dibuka", meta: "Raka · 07.02", icon: Store },
  { title: "Penjualan #FZ-0842", meta: "QRIS · Rp57.000 · 10.36", icon: CreditCard },
  { title: "Stok fresh milk berkurang", meta: "Otomatis dari 2 produk · 10.36", icon: Boxes },
  { title: "Biaya operasional dicatat", meta: "Gas LPG · Rp23.000 · 09.18", icon: WalletCards },
];

function KpiCard({ label, value, helper, trend, icon: Icon, tone }: {
  label: string; value: string; helper: string; trend?: "up" | "down";
  icon: typeof BadgeDollarSign; tone: string;
}) {
  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="icon-box" style={{ background: tone }}><Icon size={19} /></span>
      </div>
      <strong>{value}</strong>
      <div className="kpi-helper">
        {trend === "up" && <span className="trend positive"><ArrowUpRight size={14} />12,4%</span>}
        {trend === "down" && <span className="trend negative"><ArrowDownRight size={14} />3,1%</span>}
        <span>{helper}</span>
      </div>
    </article>
  );
}

export default function CoffeeApp({ userName }: { userName: string }) {
  const [active, setActive] = useState("Ringkasan");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/app", { cache: "no-store" });
        if (response.ok) setDashboard(await response.json() as DashboardData);
      } catch { /* Dashboard tetap menampilkan data contoh saat jaringan belum siap. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const dashboardSales = dashboard?.orders.reduce((sum, order) => sum + order.total, 0) ?? 8452000;
  const dashboardCogs = dashboard?.orderItems.reduce((sum, item) => sum + item.unitCost * item.quantity, 0) ?? 2704000;
  const dashboardExpenses = dashboard?.expenses.reduce((sum, item) => sum + item.amount, 0) ?? 687000;
  const displayProducts = dashboard ? dashboard.products.map((product, index) => {
    const items = dashboard.orderItems.filter((item) => item.productId === product.id);
    return { name: product.name, category: product.category, sold: items.reduce((sum, item) => sum + item.quantity, 0), revenue: items.reduce((sum, item) => sum + item.subtotal, 0), color: ["#c96f45", "#426b5a", "#8d9c6d", "#d6a552"][index % 4] };
  }).sort((a, b) => b.sold - a.sold).slice(0, 4) : topProducts;
  const displayLowStock = dashboard ? dashboard.ingredients.filter((item) => item.stockQty <= item.minimumStock).slice(0, 3).map((item) => ({ name: item.name, remaining: `${numberFormat(item.stockQty)} ${item.unit}`, percent: Math.max(5, Math.min(100, item.minimumStock ? item.stockQty / item.minimumStock * 100 : 100)), status: item.stockQty <= item.minimumStock * .4 ? "Kritis" : "Rendah" })) : lowStock;

  if (dashboard && !dashboard.workspace.onboardingCompleted) return <ModulePage active="Ringkasan" />;

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Tutup menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Coffee size={22} strokeWidth={2.4} /></div>
          <div><strong>Famz Coffee</strong><span>OPERATING SYSTEM</span></div>
          <button className="close-sidebar" aria-label="Tutup menu" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>

        <div className="store-switcher">
          <span className="store-avatar">FC</span>
          <div><b>Famz Coffee</b><small>Outlet Utama</small></div>
          <ChevronDown size={16} />
        </div>

        <nav className="side-nav" aria-label="Navigasi utama">
          <span className="nav-eyebrow">OPERASIONAL</span>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} className={active === item.label ? "active" : ""} onClick={() => { setActive(item.label); setSidebarOpen(false); }}>
                <Icon size={18} />{item.label}
              </button>
            );
          })}
          <span className="nav-eyebrow business-label">BISNIS</span>
          <button className={active === "Cabang" ? "active" : ""} onClick={() => { setActive("Cabang"); setSidebarOpen(false); }}><Building2 size={18} />Cabang</button>
          <button className={active === "Tim & Akses" ? "active" : ""} onClick={() => { setActive("Tim & Akses"); setSidebarOpen(false); }}><UsersRound size={18} />Tim & Akses</button>
          <button className={active === "Pengaturan" ? "active" : ""} onClick={() => { setActive("Pengaturan"); setSidebarOpen(false); }}><Settings size={18} />Pengaturan</button>
          {dashboard?.platformAdmin && <button className={active === "Penjualan SaaS" ? "active" : ""} onClick={() => { setActive("Penjualan SaaS"); setSidebarOpen(false); }}><BadgeDollarSign size={18} />Penjualan SaaS</button>}
        </nav>

        <div className="plan-card">
          <div><span>PRO PLAN</span><b>Semua fitur aktif</b></div>
          <span className="plan-pill">14 hari</span>
        </div>
        <div className="user-row">
          <span className="user-avatar">{userName.slice(0, 1).toUpperCase()}</span>
          <div><b>{userName.split("@")[0]}</b><small>Owner</small></div>
          <ChevronDown size={15} />
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Buka menu" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
          <div className="search-box"><Search size={17} /><input aria-label="Cari" placeholder="Cari transaksi, produk, atau menu..." /><kbd>⌘ K</kbd></div>
          <div className="topbar-actions">
            <button className="date-chip"><CalendarDays size={16} /> Hari ini, 22 Agu</button>
            <button className="notification" aria-label="Notifikasi"><Bell size={19} /><span /></button>
            <button className="new-sale" onClick={() => setActive("Kasir")}><ShoppingCart size={17} /> Penjualan baru</button>
          </div>
        </header>

        <div className={`page-wrap ${active === "Kasir" ? "pos-page" : ""}`}>
          {active === "Ringkasan" ? <>
          <section className="page-heading">
            <div>
              <p className="eyebrow">SELAMAT DATANG KEMBALI</p>
              <h1>Ringkasan operasional</h1>
              <p>Pantau performa outlet dan ambil tindakan dari satu tempat.</p>
            </div>
            <div className="live-status"><span /> Outlet buka <b>·</b> Shift pagi</div>
          </section>

          <section className="kpi-grid">
            <KpiCard label="Penjualan tersimpan" value={rupiah.format(dashboardSales)} helper="seluruh transaksi" trend="up" icon={BadgeDollarSign} tone="#f5e9e1" />
            <KpiCard label="Transaksi" value={String(dashboard?.orders.length ?? 182)} helper={`Rata-rata ${rupiah.format(dashboardSales / Math.max(1, dashboard?.orders.length ?? 182))}`} icon={ReceiptText} tone="#e7efe9" />
            <KpiCard label="Laba kotor" value={rupiah.format(dashboardSales - dashboardCogs)} helper={`Margin ${numberFormat(dashboardSales ? (dashboardSales - dashboardCogs) / dashboardSales * 100 : 0)}%`} trend="up" icon={BarChart3} tone="#edf0dc" />
            <KpiCard label="Biaya operasional" value={rupiah.format(dashboardExpenses)} helper={`${dashboard?.expenses.length ?? 5} catatan biaya`} trend="down" icon={WalletCards} tone="#f8e9e7" />
          </section>

          <section className="dashboard-grid">
            <article className="panel sales-panel">
              <div className="panel-header">
                <div><h2>Performa penjualan</h2><p>Omzet per jam · Hari ini</p></div>
                <button>Hari ini <ChevronDown size={14} /></button>
              </div>
              <div className="sales-summary"><b>{rupiah.format(dashboardSales)}</b><span className="trend positive"><ArrowUpRight size={14} />12,4%</span><small>total tersimpan</small></div>
              <div className="chart-wrap" aria-label="Grafik penjualan per jam">
                <div className="axis-labels"><span>800rb</span><span>600rb</span><span>400rb</span><span>200rb</span><span>0</span></div>
                <div className="bars">
                  {sales.map((value, index) => <div key={index} className="bar-column"><span className={index === sales.length - 1 ? "bar current" : "bar"} style={{ height: `${value * .88}px` }} /><small>{index % 2 === 0 ? `${7 + index}.00` : ""}</small></div>)}
                </div>
              </div>
            </article>

            <article className="panel quick-panel" id="quick-action">
              <div className="panel-header"><div><h2>Aksi cepat</h2><p>Operasional tanpa pindah halaman</p></div></div>
              <div className="quick-grid">
                <button onClick={() => setActive("Kasir")}><span className="quick-icon primary"><ShoppingCart size={21} /></span><b>Penjualan</b><small>Buka kasir</small></button>
                <button onClick={() => setActive("Pembelian")}><span className="quick-icon green"><PackagePlus size={21} /></span><b>Stok masuk</b><small>Catat belanja</small></button>
                <button onClick={() => setActive("Biaya")}><span className="quick-icon yellow"><WalletCards size={21} /></span><b>Catat biaya</b><small>Operasional</small></button>
                <button onClick={() => setActive("Shift Kas")}><span className="quick-icon red"><ClipboardList size={21} /></span><b>Tutup shift</b><small>Rekonsiliasi</small></button>
              </div>
              <div className="shift-card">
                <div><span className="status-dot" /><div><b>Shift pagi berjalan</b><small>Dibuka 07.02 oleh Raka</small></div></div>
                <strong>{rupiah.format(2350000)}</strong>
                <small>Estimasi kas</small>
              </div>
            </article>

            <article className="panel products-panel">
              <div className="panel-header"><div><h2>Produk terlaris</h2><p>Berdasarkan jumlah terjual</p></div><button>Lihat semua</button></div>
              <div className="product-list">
                {displayProducts.map((product, index) => (
                  <div className="product-row" key={product.name}>
                    <span className="product-rank">{index + 1}</span>
                    <span className="product-thumb" style={{ background: product.color }}><Coffee size={18} /></span>
                    <div><b>{product.name}</b><small>{product.category}</small></div>
                    <div className="product-total"><b>{product.sold} item</b><small>{rupiah.format(product.revenue)}</small></div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel stock-panel">
              <div className="panel-header"><div><h2>Stok perlu perhatian</h2><p>Segera lakukan pengadaan</p></div><span className="alert-count"><CircleAlert size={14} />{displayLowStock.length} item</span></div>
              <div className="stock-list">
                {displayLowStock.map((item) => (
                  <div className="stock-row" key={item.name}>
                    <div><b>{item.name}</b><small>Sisa {item.remaining}</small></div>
                    <span className={`stock-badge ${item.status === "Kritis" ? "critical" : ""}`}>{item.status}</span>
                    <div className="progress"><span style={{ width: `${item.percent}%` }} /></div>
                  </div>
                ))}
              </div>
              <button className="outline-action"><PackagePlus size={16} /> Buat daftar belanja</button>
            </article>

            <article className="panel activity-panel">
              <div className="panel-header"><div><h2>Aktivitas terbaru</h2><p>Jejak operasional outlet</p></div><button>Lihat riwayat</button></div>
              <div className="activity-list">
                {activities.map((item) => {
                  const Icon = item.icon;
                  return <div key={item.title}><span><Icon size={16} /></span><p><b>{item.title}</b><small>{item.meta}</small></p></div>;
                })}
              </div>
            </article>
          </section>
          </> : <ModulePage active={active} />}
        </div>
      </main>
    </div>
  );
}
