"use client";

import {
  BadgeDollarSign, BarChart3, Boxes, ClipboardList, Coffee, CreditCard, PackagePlus,
  ReceiptText, ShoppingCart, Store, WalletCards,
} from "lucide-react";
import { dateTime, formatUnit, money, number, type ModuleProps } from "./shared";

const swatches = ["#c96f45", "#426b5a", "#8d9c6d", "#d6a552", "#7a6a8c"];

function KpiCard({ label, value, helper, icon: Icon, tone }: {
  label: string; value: string; helper: string; icon: typeof BadgeDollarSign; tone: string;
}) {
  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="icon-box" style={{ background: tone }}><Icon size={19} /></span>
      </div>
      <strong>{value}</strong>
      <div className="kpi-helper"><span>{helper}</span></div>
    </article>
  );
}

export default function Dashboard({ data, go }: ModuleProps & { go: (module: string) => void }) {
  const { summary } = data;

  // Setiap angka di halaman ini berasal dari data workspace yang sedang dibuka. Versi
  // sebelumnya memakai deret angka tetap di dalam kode, jadi semua pelanggan melihat
  // grafik dan aktivitas yang sama — dan itu justru layar pertama yang mereka buka.
  const peak = Math.max(1, ...summary.hourly.map((point) => point.total));
  const lowStock = data.ingredients
    .filter((item) => item.stockQty <= item.minimumStock)
    .sort((a, b) => (a.minimumStock ? a.stockQty / a.minimumStock : 0) - (b.minimumStock ? b.stockQty / b.minimumStock : 0))
    .slice(0, 3);

  const activeShift = data.shifts.find((shift) => shift.status === "open");
  const cashSales = data.orders
    .filter((order) => order.status !== "void" && order.paymentMethod === "Tunai"
      && activeShift && order.createdAt >= activeShift.openedAt && order.branchId === activeShift.branchId)
    .reduce((sum, order) => sum + order.total, 0);

  const activities = [
    ...data.orders.slice(0, 4).map((order) => ({
      key: `order-${order.id}`,
      title: order.status === "void" ? `Transaksi ${order.orderNo} dibatalkan` : `Penjualan ${order.orderNo}`,
      meta: `${order.paymentMethod} · ${money.format(order.total)} · ${dateTime(order.createdAt)}`,
      icon: order.status === "void" ? ReceiptText : CreditCard,
      at: order.createdAt,
    })),
    ...data.stockMovements.filter((movement) => movement.type === "purchase").slice(0, 3).map((movement) => ({
      key: `move-${movement.id}`,
      title: `Stok masuk ${data.ingredients.find((item) => item.id === movement.ingredientId)?.name ?? "bahan"}`,
      meta: `${number.format(movement.quantity)} · ${dateTime(movement.createdAt)}`,
      icon: Boxes,
      at: movement.createdAt,
    })),
    ...data.shifts.slice(0, 2).map((shift) => ({
      key: `shift-${shift.id}`,
      title: shift.status === "open" ? `Shift ${shift.cashierName} dibuka` : `Shift ${shift.cashierName} ditutup`,
      meta: dateTime(shift.status === "open" ? shift.openedAt : shift.closedAt ?? shift.openedAt),
      icon: Store,
      at: shift.status === "open" ? shift.openedAt : shift.closedAt ?? shift.openedAt,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);

  const average = summary.orderCount ? Math.round(summary.sales / summary.orderCount) : 0;

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">RINGKASAN OPERASIONAL</p>
          <h1>{data.workspace.name}</h1>
          <p>Pantau performa outlet dan ambil tindakan dari satu tempat.</p>
        </div>
        <div className="live-status">
          <span />{activeShift ? `Shift ${activeShift.cashierName} berjalan` : "Belum ada shift aktif"}
        </div>
      </section>

      <section className="kpi-grid">
        <KpiCard label="Penjualan" value={money.format(summary.sales)} helper={`${summary.orderCount} transaksi`} icon={BadgeDollarSign} tone="#f5e9e1" />
        <KpiCard label="Rata-rata struk" value={money.format(average)} helper="per transaksi" icon={ReceiptText} tone="#e7efe9" />
        <KpiCard
          label="Laba kotor" value={money.format(summary.grossProfit)}
          helper={`Margin ${number.format(summary.sales ? summary.grossProfit / summary.sales * 100 : 0)}%`}
          icon={BarChart3} tone="#edf0dc"
        />
        <KpiCard label="Biaya operasional" value={money.format(summary.expenses)} helper={`${data.expenses.length} catatan biaya`} icon={WalletCards} tone="#f8e9e7" />
      </section>

      <section className="dashboard-grid">
        <article className="panel sales-panel">
          <div className="panel-header">
            <div><h2>Performa penjualan</h2><p>Omzet per jam</p></div>
          </div>
          <div className="sales-summary">
            <b>{money.format(summary.sales)}</b>
            <small>{summary.orderCount ? `puncak ${money.format(peak)} dalam satu jam` : "belum ada transaksi"}</small>
          </div>
          {!summary.hourly.length ? (
            <p className="chart-empty">Grafik muncul setelah ada transaksi tersimpan di periode ini.</p>
          ) : (
            <div className="chart-wrap" aria-label="Grafik penjualan per jam">
              <div className="bars">
                {summary.hourly.map((point) => (
                  <div className="bar-column" key={point.hour}>
                    <span
                      className="bar"
                      style={{ height: `${Math.max(4, point.total / peak * 100)}%` }}
                      title={`${point.hour}.00 — ${money.format(point.total)}`}
                    />
                    <small>{point.hour}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="panel quick-panel">
          <div className="panel-header"><div><h2>Aksi cepat</h2><p>Operasional tanpa pindah halaman</p></div></div>
          <div className="quick-grid">
            <button type="button" onClick={() => go("Kasir")}><span className="quick-icon primary"><ShoppingCart size={21} /></span><b>Penjualan</b><small>Buka kasir</small></button>
            <button type="button" onClick={() => go("Pembelian")}><span className="quick-icon green"><PackagePlus size={21} /></span><b>Stok masuk</b><small>Catat belanja</small></button>
            <button type="button" onClick={() => go("Biaya")}><span className="quick-icon yellow"><WalletCards size={21} /></span><b>Catat biaya</b><small>Operasional</small></button>
            <button type="button" onClick={() => go("Shift Kas")}><span className="quick-icon red"><ClipboardList size={21} /></span><b>{activeShift ? "Tutup shift" : "Buka shift"}</b><small>Rekonsiliasi</small></button>
          </div>
          <div className="shift-card">
            <div>
              <span className="status-dot" />
              <div>
                <b>{activeShift ? `Shift ${activeShift.cashierName} berjalan` : "Shift belum dibuka"}</b>
                <small>{activeShift ? `Dibuka ${dateTime(activeShift.openedAt)}` : "Buka shift untuk merekam kas"}</small>
              </div>
            </div>
            <strong>{money.format((activeShift?.openingCash ?? 0) + cashSales)}</strong>
            <small>Estimasi kas</small>
          </div>
        </article>

        <article className="panel products-panel">
          <div className="panel-header"><div><h2>Produk terlaris</h2><p>Berdasarkan jumlah terjual</p></div></div>
          {!summary.topProducts.length ? (
            <p className="chart-empty">Belum ada produk terjual di periode ini.</p>
          ) : (
            <div className="product-list">
              {summary.topProducts.slice(0, 4).map((product, index) => (
                <div className="product-row" key={product.productId}>
                  <span className="product-rank">{index + 1}</span>
                  <span className="product-thumb" style={{ background: swatches[index % swatches.length] }}><Coffee size={18} /></span>
                  <div><b>{product.name}</b><small>{number.format(product.sold)} terjual</small></div>
                  <div className="product-total"><b>{money.format(product.revenue)}</b></div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel stock-panel">
          <div className="panel-header">
            <div><h2>Stok perlu perhatian</h2><p>Segera lakukan pengadaan</p></div>
            <span className="alert-count">{lowStock.length} item</span>
          </div>
          {!lowStock.length ? (
            <p className="chart-empty">Semua bahan masih di atas batas minimum.</p>
          ) : (
            <div className="stock-list">
              {lowStock.map((item) => {
                const percent = item.minimumStock ? Math.max(0, Math.min(100, item.stockQty / item.minimumStock * 100)) : 100;
                return (
                  <div className="stock-row" key={item.id}>
                    <div><b>{item.name}</b><small>Sisa {formatUnit(item.stockQty, item.unit)}</small></div>
                    <span className={`stock-badge ${item.stockQty <= item.minimumStock * 0.4 ? "critical" : ""}`}>
                      {item.stockQty < 0 ? "Minus" : item.stockQty <= item.minimumStock * 0.4 ? "Kritis" : "Rendah"}
                    </span>
                    <div className="progress"><span style={{ width: `${Math.max(4, percent)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
          <button type="button" className="outline-action" onClick={() => go("Stok Bahan")}>
            <PackagePlus size={16} /> Kelola stok bahan
          </button>
        </article>

        <article className="panel activity-panel">
          <div className="panel-header"><div><h2>Aktivitas terbaru</h2><p>Jejak operasional outlet</p></div></div>
          {!activities.length ? (
            <p className="chart-empty">Aktivitas muncul setelah ada transaksi, pembelian, atau shift.</p>
          ) : (
            <div className="activity-list">
              {activities.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key}>
                    <span><Icon size={16} /></span>
                    <p><b>{item.title}</b><small>{item.meta}</small></p>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </>
  );
}
