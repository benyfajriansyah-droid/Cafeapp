"use client";

import { Ban, ReceiptText } from "lucide-react";
import { useState } from "react";
import { Empty, Field, Modal, SummaryStrip, canManage, dateTime, money, type ModuleProps, type Order } from "./shared";

export default function Transactions({ data, saving, submit }: ModuleProps) {
  const [voiding, setVoiding] = useState<Order | null>(null);
  const [reason, setReason] = useState("");

  const { orders, summary } = data;
  const average = summary.orderCount ? Math.round(summary.sales / summary.orderCount) : 0;

  async function confirmVoid() {
    if (!voiding) return;
    const result = await submit("void-order", { orderId: voiding.id, reason });
    if (result) { setVoiding(null); setReason(""); }
  }

  return (
    <section className="data-panel">
      <SummaryStrip items={[
        { label: "Transaksi", value: String(summary.orderCount) },
        { label: "Total penjualan", value: money.format(summary.sales) },
        { label: "Rata-rata struk", value: money.format(average) },
        { label: "Total diskon", value: money.format(summary.discount), tone: summary.discount > 0 ? "danger" : undefined },
      ]} />

      {!orders.length ? (
        <Empty icon={ReceiptText} title="Belum ada transaksi" text="Transaksi dari kasir akan muncul di sini." />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>No. transaksi</th><th>Waktu</th><th>Channel</th><th>Pembayaran</th>
                <th>Status</th><th className="right">Total</th>
                {canManage(data) && <th className="right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const voided = order.status === "void";
                return (
                  <tr key={order.id} className={voided ? "row-void" : undefined}>
                    <td>
                      <b>{order.orderNo}</b>
                      {order.customerName && <small className="table-sub">{order.customerName}</small>}
                    </td>
                    <td>{dateTime(order.createdAt)}</td>
                    <td>{order.channel}</td>
                    <td>{order.paymentMethod}</td>
                    <td>
                      <span className={voided ? "stock-chip low" : "paid-badge"}>{voided ? "Dibatalkan" : "Lunas"}</span>
                      {voided && order.voidReason && <small className="table-sub">{order.voidReason}</small>}
                    </td>
                    <td className="right">
                      <b>{money.format(order.total)}</b>
                      {order.discount > 0 && <small className="table-sub">diskon {money.format(order.discount)}</small>}
                    </td>
                    {canManage(data) && (
                      <td className="right">
                        {voided ? "–" : (
                          <button type="button" className="row-action danger" onClick={() => { setVoiding(order); setReason(""); }}>
                            <Ban size={14} /> Batalkan
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {voiding && (
        <Modal
          title={`Batalkan ${voiding.orderNo}`}
          description="Bahan yang sudah dipotong akan dikembalikan ke stok."
          onClose={() => setVoiding(null)}
        >
          <form onSubmit={(event) => { event.preventDefault(); void confirmVoid(); }}>
            <div className="void-summary">
              <div><span>Total</span><b>{money.format(voiding.total)}</b></div>
              <div><span>Waktu</span><b>{dateTime(voiding.createdAt)}</b></div>
            </div>
            <Field label="Alasan pembatalan" hint="Tercatat permanen sebagai jejak audit.">
              <input value={reason} onChange={(event) => setReason(event.target.value)} required placeholder="Contoh: salah input menu" />
            </Field>
            <button className="submit-button danger" disabled={saving || !reason.trim()}>
              {saving ? "Membatalkan…" : "Batalkan transaksi"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
