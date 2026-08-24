"use client";

import {
  BadgeDollarSign, BarChart3, Boxes, Building2, Check, CircleAlert, ClipboardList, Coffee,
  LayoutDashboard, Menu, PackagePlus, Plus, ReceiptText, RefreshCw, Settings as SettingsIcon,
  ShoppingCart, UserPlus, UsersRound, WalletCards, X,
} from "lucide-react";
import { useState } from "react";

import Dashboard from "./modules/dashboard";
import Expenses from "./modules/expenses";
import Inventory, { Purchases } from "./modules/inventory";
import Pos, { StockWarnings } from "./modules/pos";
import Products from "./modules/products";
import Reports from "./modules/reports";
import SaasAdmin from "./modules/saas-admin";
import Shifts from "./modules/shifts";
import Transactions from "./modules/transactions";
import { Branches, PlanPicker, Settings, Team } from "./modules/business";
import { LockedScreen, Onboarding } from "./modules/onboarding";
import { canManage, canSell, canStock, isOwner, money, type ModuleProps, type Receipt } from "./modules/shared";
import { useAppData } from "./modules/use-app-data";

const operations = [
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

const business = [
  { label: "Cabang", icon: Building2 },
  { label: "Tim & Akses", icon: UsersRound },
  { label: "Pengaturan", icon: SettingsIcon },
];

export default function CoffeeApp({ userName }: { userName: string }) {
  const app = useAppData();
  const [active, setActive] = useState("Ringkasan");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<"product" | "ingredient" | "restock" | "expense" | "member" | "branch" | "shift" | "plan" | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const { data, loading, saving, error, toast, submit, reload, setRange, branchId, setBranchId } = app;

  if (loading && !data) {
    return <div className="module-loading"><span /><p>Menyiapkan operasional kedai…</p></div>;
  }
  if (!data) {
    return (
      <div className="module-error">
        <CircleAlert size={28} />
        <b>Belum bisa memuat data</b>
        <p>{error || "Coba muat ulang halaman."}</p>
        <button type="button" onClick={() => void reload()}><RefreshCw size={15} /> Coba lagi</button>
      </div>
    );
  }

  if (!data.workspace.onboardingCompleted) {
    return <Onboarding data={data} saving={saving} onComplete={(payload) => submit("complete-onboarding", payload)} />;
  }

  const moduleProps: ModuleProps = { data, saving, submit, reload, setRange };

  if (data.entitlement.locked) {
    return (
      <>
        <LockedScreen data={data} onManagePlan={() => setModal("plan")} />
        {modal === "plan" && <PlanPicker {...moduleProps} onClose={() => setModal(null)} />}
        {toast && <div className="toast"><Check size={16} />{toast}</div>}
        {error && <div className="toast error"><CircleAlert size={16} />{error}</div>}
      </>
    );
  }

  const activeShift = data.shifts.find((shift) => shift.status === "open");
  const activeBranch = data.branches.find((branch) => branch.id === data.activeBranchId);
  const go = (module: string) => { setActive(module); setSidebarOpen(false); };

  /** Tombol aksi utama tiap modul — hanya muncul kalau peran ini memang boleh melakukannya. */
  const primaryAction = (() => {
    if (active === "Produk & Resep" && canManage(data)) return { label: "Produk baru", icon: Plus, onClick: () => setModal("product") };
    if (active === "Stok Bahan" && canStock(data)) return { label: "Bahan baru", icon: Plus, onClick: () => setModal("ingredient") };
    if (active === "Pembelian" && canStock(data)) return { label: "Stok masuk", icon: PackagePlus, onClick: () => setModal("restock") };
    if (active === "Biaya" && canManage(data)) return { label: "Catat biaya", icon: Plus, onClick: () => setModal("expense") };
    if (active === "Shift Kas" && canSell(data)) return { label: activeShift ? "Tutup shift" : "Buka shift", icon: Check, onClick: () => setModal("shift") };
    if (active === "Cabang" && isOwner(data)) return { label: "Tambah outlet", icon: Plus, onClick: () => setModal("branch") };
    if (active === "Tim & Akses" && canManage(data)) return { label: "Tambah anggota", icon: UserPlus, onClick: () => setModal("member") };
    return null;
  })();

  const headings: Record<string, { title: string; subtitle: string }> = {
    Kasir: { title: "Kasir", subtitle: "Pilih menu, terima pembayaran, cetak struk" },
    Transaksi: { title: "Transaksi", subtitle: "Riwayat penjualan outlet ini" },
    "Produk & Resep": { title: "Produk & Resep", subtitle: "Menu, HPP, dan komposisi bahan" },
    "Stok Bahan": { title: "Stok Bahan", subtitle: "Persediaan dan batas minimum" },
    Pembelian: { title: "Pembelian", subtitle: "Riwayat stok masuk dan supplier" },
    Biaya: { title: "Biaya", subtitle: "Pengeluaran operasional" },
    "Shift Kas": { title: "Shift Kas", subtitle: "Rekonsiliasi kas per outlet" },
    Laporan: { title: "Laporan", subtitle: "Penjualan, HPP, dan laba" },
    Cabang: { title: "Cabang", subtitle: "Outlet dan batas paket" },
    "Tim & Akses": { title: "Tim & Akses", subtitle: "Anggota dan hak akses" },
    Pengaturan: { title: "Pengaturan", subtitle: "Identitas bisnis dan langganan" },
    "Penjualan SaaS": { title: "Penjualan SaaS", subtitle: "Checkout dan aktivasi pelanggan" },
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Tutup menu" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Coffee size={22} strokeWidth={2.4} /></div>
          <div><strong>{data.workspace.name}</strong><span>OPERATING SYSTEM</span></div>
          <button className="close-sidebar" aria-label="Tutup menu" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>

        {/* Pemilih outlet: transaksi, stok, biaya, dan shift ditulis ke outlet yang dipilih di sini. */}
        <div className="store-switcher">
          <span className="store-avatar">{(activeBranch?.name ?? "O").slice(0, 2).toUpperCase()}</span>
          <label>
            <span className="visually-hidden">Pilih outlet</span>
            <select value={branchId || data.activeBranchId} onChange={(event) => setBranchId(event.target.value)}>
              {data.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}{branch.isActive ? "" : " (nonaktif)"}</option>
              ))}
              {data.branches.length > 1 && <option value="all">Semua outlet (khusus laporan)</option>}
            </select>
          </label>
        </div>

        <nav className="side-nav" aria-label="Navigasi utama">
          <span className="nav-eyebrow">OPERASIONAL</span>
          {operations.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} className={active === item.label ? "active" : ""} onClick={() => go(item.label)}>
                <Icon size={18} />{item.label}
              </button>
            );
          })}
          <span className="nav-eyebrow business-label">BISNIS</span>
          {business.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} className={active === item.label ? "active" : ""} onClick={() => go(item.label)}>
                <Icon size={18} />{item.label}
              </button>
            );
          })}
          {data.platformAdmin && (
            <button className={active === "Penjualan SaaS" ? "active" : ""} onClick={() => go("Penjualan SaaS")}>
              <BadgeDollarSign size={18} />Penjualan SaaS
            </button>
          )}
        </nav>

        <div className="plan-card">
          <div>
            <span>{(data.entitlement.plan ?? "nonaktif").toUpperCase()} PLAN</span>
            <b>{data.entitlement.source === "trial" ? "Masa uji coba" : "Berlangganan aktif"}</b>
          </div>
          {data.entitlement.daysLeft != null && <span className="plan-pill">{data.entitlement.daysLeft} hari</span>}
        </div>

        <div className="user-row">
          <span className="user-avatar">{userName.slice(0, 1).toUpperCase()}</span>
          <div>
            <b>{data.currentMember.name || userName.split("@")[0]}</b>
            <small className="capitalize">{data.currentMember.role}</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Buka menu" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
          <div className="topbar-heading">
            <b>{headings[active]?.title ?? "Ringkasan"}</b>
            <small>{activeBranch?.name ?? "Semua outlet"} · {headings[active]?.subtitle ?? "Operasional hari ini"}</small>
          </div>
          <div className="topbar-actions">
            <button type="button" className="ghost-action" onClick={() => void reload()} aria-label="Muat ulang data">
              <RefreshCw size={16} />
            </button>
            {canSell(data) && (
              <button className="new-sale" onClick={() => go("Kasir")}><ShoppingCart size={17} /> Penjualan baru</button>
            )}
          </div>
        </header>

        <div className={`page-wrap ${active === "Kasir" ? "pos-page" : ""}`}>
          {active !== "Ringkasan" && (
            <section className="module-heading">
              <div><h1>{headings[active]?.title}</h1><p>{headings[active]?.subtitle}</p></div>
              {primaryAction && (
                <button className="primary-action" onClick={primaryAction.onClick}>
                  <primaryAction.icon size={16} /> {primaryAction.label}
                </button>
              )}
            </section>
          )}

          {error && <p className="inline-error"><CircleAlert size={15} /> {error}</p>}

          {active === "Ringkasan" && <Dashboard {...moduleProps} go={go} />}
          {active === "Kasir" && <Pos {...moduleProps} onReceipt={setReceipt} />}
          {active === "Transaksi" && <Transactions {...moduleProps} />}
          {active === "Produk & Resep" && (
            <Products {...moduleProps} openCreate={modal === "product"} onCloseCreate={() => setModal(null)} />
          )}
          {active === "Stok Bahan" && (
            <Inventory
              {...moduleProps}
              openCreate={modal === "ingredient"} onCloseCreate={() => setModal(null)}
              openRestock={modal === "restock"} onCloseRestock={() => setModal(null)}
            />
          )}
          {active === "Pembelian" && (
            <>
              <Purchases {...moduleProps} />
              {modal === "restock" && (
                <Inventory
                  {...moduleProps}
                  openCreate={false} onCloseCreate={() => setModal(null)}
                  openRestock onCloseRestock={() => setModal(null)}
                />
              )}
            </>
          )}
          {active === "Biaya" && <Expenses {...moduleProps} openCreate={modal === "expense"} onCloseCreate={() => setModal(null)} />}
          {active === "Shift Kas" && <Shifts {...moduleProps} openAction={modal === "shift"} onCloseAction={() => setModal(null)} />}
          {active === "Laporan" && <Reports {...moduleProps} />}
          {active === "Cabang" && (
            <Branches {...moduleProps} openCreate={modal === "branch"} onCloseCreate={() => setModal(null)} onManagePlan={() => setModal("plan")} />
          )}
          {active === "Tim & Akses" && <Team {...moduleProps} openCreate={modal === "member"} onCloseCreate={() => setModal(null)} />}
          {active === "Pengaturan" && <Settings {...moduleProps} onManagePlan={() => setModal("plan")} />}
          {active === "Penjualan SaaS" && data.platformAdmin && <SaasAdmin {...moduleProps} />}
        </div>
      </main>

      {modal === "plan" && <PlanPicker {...moduleProps} onClose={() => setModal(null)} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
      {receipt && <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function ReceiptDialog({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  return (
    <div className="receipt-backdrop">
      <div className="receipt-dialog">
        <div className="receipt-actions">
          <button type="button" onClick={onClose}><X size={16} />Tutup</button>
          <button type="button" onClick={() => window.print()}><ReceiptText size={16} />Cetak struk</button>
        </div>

        <StockWarnings warnings={receipt.stockWarnings ?? []} />

        <article className="receipt-paper">
          <div className="receipt-logo">
            <Coffee size={24} />
            <h2>{receipt.business}</h2>
            <p>{receipt.branch}</p>
          </div>
          <div className="receipt-meta">
            <span>{receipt.orderNo}</span>
            <span>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}</span>
          </div>
          {receipt.customerName && <p className="receipt-customer">Pelanggan: {receipt.customerName}</p>}
          <div className="receipt-items">
            {receipt.items.map((item, index) => (
              <div key={`${item.name}-${index}`}>
                <span>{item.name}<small>{item.quantity} × {money.format(item.unitPrice)}</small></span>
                <b>{money.format(item.subtotal)}</b>
              </div>
            ))}
          </div>
          <div className="receipt-lines">
            <div><span>Subtotal</span><span>{money.format(receipt.subtotal)}</span></div>
            {receipt.discount > 0 && <div><span>Diskon</span><span>−{money.format(receipt.discount)}</span></div>}
            {receipt.tax > 0 && <div><span>Pajak</span><span>{money.format(receipt.tax)}</span></div>}
          </div>
          <div className="receipt-total"><span>Total</span><b>{money.format(receipt.total)}</b></div>
          <div className="receipt-payment"><span>Pembayaran</span><b>{receipt.paymentMethod}</b></div>
          <footer>
            Kasir: {receipt.cashier}<br />
            Terima kasih sudah membeli.<br />Simpan struk ini sebagai bukti transaksi.
          </footer>
        </article>
      </div>
    </div>
  );
}
