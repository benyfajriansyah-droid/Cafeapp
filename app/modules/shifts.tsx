"use client";

import { ClipboardList, ReceiptText } from "lucide-react";
import { useState } from "react";
import { Empty, Field, Modal, canSell, dateTime, money, type ModuleProps } from "./shared";

export default function Shifts({ data, saving, submit, openAction, onCloseAction }: ModuleProps & {
  openAction: boolean; onCloseAction: () => void;
}) {
  const [note, setNote] = useState("");
  const activeShift = data.shifts.find((shift) => shift.status === "open");

  // Penjualan tunai dihitung hanya untuk outlet dan shift yang sedang berjalan.
  const cashSales = data.orders
    .filter((order) => order.status !== "void" && order.paymentMethod === "Tunai"
      && activeShift && order.createdAt >= activeShift.openedAt && order.branchId === activeShift.branchId)
    .reduce((sum, order) => sum + order.total, 0);
  const estimated = (activeShift?.openingCash ?? 0) + cashSales;

  return (
    <section className="shift-layout">
      <article className="shift-hero">
        <div className="shift-hero-top">
          <span className={activeShift ? "shift-indicator" : "shift-indicator closed"}>
            <span />{activeShift ? "SHIFT AKTIF" : "SHIFT DITUTUP"}
          </span>
          <ReceiptText size={24} />
        </div>
        <h2>{activeShift ? `Shift ${activeShift.cashierName}` : "Tidak ada shift aktif"}</h2>
        <p>{activeShift ? `Dibuka ${dateTime(activeShift.openedAt)}` : "Buka shift baru untuk mulai merekam kas outlet ini."}</p>
        <div className="shift-numbers">
          <div><span>Kas awal</span><b>{money.format(activeShift?.openingCash ?? 0)}</b></div>
          <div><span>Penjualan tunai</span><b>{money.format(cashSales)}</b></div>
          <div><span>Estimasi kas</span><b>{money.format(estimated)}</b></div>
        </div>
      </article>

      <article className="data-panel">
        <div className="panel-header"><div><h2>Riwayat shift</h2><p>Hasil rekonsiliasi kas per outlet</p></div></div>
        {!data.shifts.length ? (
          <Empty icon={ClipboardList} title="Belum ada shift" text="Riwayat rekonsiliasi kas akan muncul setelah shift pertama ditutup." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Kasir</th><th>Dibuka</th><th>Status</th><th className="right">Kas seharusnya</th><th className="right">Kas aktual</th><th className="right">Selisih</th></tr>
              </thead>
              <tbody>
                {data.shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td>
                      <b>{shift.cashierName}</b>
                      {shift.note && <small className="table-sub">{shift.note}</small>}
                    </td>
                    <td>{dateTime(shift.openedAt)}</td>
                    <td><span className={shift.status === "open" ? "stock-chip" : "category-badge"}>{shift.status === "open" ? "Berjalan" : "Ditutup"}</span></td>
                    <td className="right">{shift.expectedCash == null ? "–" : money.format(shift.expectedCash)}</td>
                    <td className="right">{shift.actualCash == null ? "–" : money.format(shift.actualCash)}</td>
                    <td className="right">
                      <b className={(shift.variance ?? 0) < 0 ? "danger-text" : "margin-text"}>
                        {shift.variance == null ? "–" : money.format(shift.variance)}
                      </b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {openAction && canSell(data) && (
        activeShift ? (
          <Modal title="Tutup shift" description="Hitung uang tunai fisik di laci kas sebelum menyimpan." onClose={onCloseAction}>
            <form onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const result = await submit("close-shift", {
                actualCash: Number(form.get("actualCash")), note: String(form.get("note") ?? ""),
              });
              if (result) onCloseAction();
            }}>
              <div className="void-summary">
                <div><span>Kas awal</span><b>{money.format(activeShift.openingCash)}</b></div>
                <div><span>Estimasi kas</span><b>{money.format(estimated)}</b></div>
              </div>
              <div className="form-grid">
                <Field label="Uang tunai aktual"><input name="actualCash" type="number" min="0" required placeholder="Hitung uang di laci kas" /></Field>
                <Field label="Catatan"><input name="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opsional" /></Field>
              </div>
              <button className="submit-button" disabled={saving}>{saving ? "Menghitung…" : "Rekonsiliasi & tutup shift"}</button>
            </form>
          </Modal>
        ) : (
          <Modal title="Buka shift" description="Shift merekam kas outlet yang sedang lo pilih." onClose={onCloseAction}>
            <form onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const result = await submit("open-shift", {
                cashierName: String(form.get("cashierName") ?? ""), openingCash: Number(form.get("openingCash")),
              });
              if (result) onCloseAction();
            }}>
              <div className="form-grid">
                <Field label="Nama kasir">
                  <input name="cashierName" required defaultValue={data.currentMember.name || data.currentMember.email.split("@")[0]} />
                </Field>
                <Field label="Kas awal" hint="Uang tunai di laci saat shift dimulai.">
                  <input name="openingCash" type="number" min="0" required placeholder="0" />
                </Field>
              </div>
              <button className="submit-button" disabled={saving}>{saving ? "Membuka…" : "Buka shift"}</button>
            </form>
          </Modal>
        )
      )}
    </section>
  );
}
