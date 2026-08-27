"use client";

import { BarChart3 } from "lucide-react";
import { Empty, money, number, type ModuleProps } from "./shared";

/** Rentang siap pakai — pemilik kedai hampir selalu membandingkan periode, bukan tanggal lepas. */
function presets() {
  const now = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const startOfMonth = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const endOfMonth = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  const daysAgo = (days: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

  return [
    { label: "Hari ini", from: iso(now), to: iso(now) },
    { label: "7 hari", from: iso(daysAgo(6)), to: iso(now) },
    { label: "30 hari", from: iso(daysAgo(29)), to: iso(now) },
    { label: "Bulan ini", from: iso(startOfMonth(0)), to: iso(now) },
    { label: "Bulan lalu", from: iso(startOfMonth(-1)), to: iso(endOfMonth(-1)) },
    { label: "Semua", from: null, to: null },
  ];
}

export function RangeFilter({ data, setRange }: Pick<ModuleProps, "data" | "setRange">) {
  const { from, to } = data.range;
  const options = presets();
  const activeLabel = options.find((option) => option.from === from && option.to === to)?.label;

  return (
    <div className="range-filter">
      <div className="range-presets">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            className={activeLabel === option.label ? "active" : ""}
            onClick={() => setRange({ from: option.from, to: option.to })}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="range-custom">
        <label>
          <span>Dari</span>
          <input type="date" value={from ?? ""} max={to ?? undefined} onChange={(event) => setRange({ from: event.target.value || null, to })} />
        </label>
        <label>
          <span>Sampai</span>
          <input type="date" value={to ?? ""} min={from ?? undefined} onChange={(event) => setRange({ from, to: event.target.value || null })} />
        </label>
      </div>
    </div>
  );
}

export default function Reports({ data, setRange }: ModuleProps) {
  const { summary, range } = data;

  // Semua angka di bawah datang dari server, dihitung atas rentang yang sama untuk penjualan,
  // HPP, dan biaya. Menjumlahkannya ulang di browser dari daftar yang dipotong `limit` adalah
  // sebabnya laba kotor dulu merosot sampai minus setelah 200 transaksi.
  const periodLabel = range.from || range.to
    ? `${range.from ?? "awal"} sampai ${range.to ?? "sekarang"}`
    : "seluruh periode tersimpan";

  return (
    <section className="report-layout">
      <RangeFilter data={data} setRange={setRange} />

      {!summary.orderCount ? (
        <Empty icon={BarChart3} title="Belum ada data di periode ini" text="Pilih rentang lain atau catat transaksi pertama lo." />
      ) : (
        <>
          <div className="report-kpis">
            <article><span>Penjualan</span><b>{money.format(summary.sales)}</b><small>{summary.orderCount} transaksi</small></article>
            <article><span>Laba kotor</span><b>{money.format(summary.grossProfit)}</b><small>Margin {number.format(summary.sales ? summary.grossProfit / summary.sales * 100 : 0)}%</small></article>
            <article><span>Laba bersih</span><b className={summary.netProfit < 0 ? "danger-text" : undefined}>{money.format(summary.netProfit)}</b><small>Setelah biaya operasional</small></article>
          </div>

          <article className="data-panel profit-card">
            <div className="panel-header">
              <div><h2>Laba rugi sederhana</h2><p>Data {periodLabel}</p></div>
              <button type="button" onClick={() => window.print()}>Cetak laporan</button>
            </div>
            <div className="profit-lines">
              <div><span>Penjualan bersih</span><b>{money.format(summary.sales)}</b></div>
              {summary.discount > 0 && <div><span>Diskon diberikan</span><b>({money.format(summary.discount)})</b></div>}
              {summary.tax > 0 && <div><span>Pajak terkumpul</span><b>{money.format(summary.tax)}</b></div>}
              <div><span>Harga pokok penjualan</span><b>({money.format(summary.cogs)})</b></div>
              <div className="strong"><span>Laba kotor</span><b>{money.format(summary.grossProfit)}</b></div>
              <div><span>Biaya operasional</span><b>({money.format(summary.expenses)})</b></div>
              <div className="total"><span>Laba bersih</span><b>{money.format(summary.netProfit)}</b></div>
            </div>
          </article>

          <article className="data-panel payment-card">
            <div className="panel-header"><div><h2>Komposisi pembayaran</h2><p>Nilai transaksi per metode</p></div></div>
            {summary.payments.map((payment) => {
              const width = summary.sales ? payment.total / summary.sales * 100 : 0;
              return (
                <div className="payment-line" key={payment.method}>
                  <div><b>{payment.method}</b><span>{money.format(payment.total)}</span></div>
                  <div><span style={{ width: `${width}%` }} /></div>
                  <small>{number.format(width)}%</small>
                </div>
              );
            })}
          </article>

          <article className="data-panel">
            <div className="panel-header"><div><h2>Produk terlaris</h2><p>Berdasarkan jumlah terjual di periode ini</p></div></div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Produk</th><th className="right">Terjual</th><th className="right">Omzet</th></tr></thead>
                <tbody>
                  {summary.topProducts.map((product) => (
                    <tr key={product.productId}>
                      <td><b>{product.name}</b></td>
                      <td className="right">{number.format(product.sold)}</td>
                      <td className="right"><b>{money.format(product.revenue)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </section>
  );
}
