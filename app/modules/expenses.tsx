"use client";

import { Pencil, Trash2, WalletCards } from "lucide-react";
import { useState } from "react";
import { Empty, Field, Modal, SummaryStrip, canManage, longDate, money, today, type Expense, type ModuleProps } from "./shared";

const expenseCategories = ["Operasional", "Bahan bakar", "Transportasi", "Maintenance", "Marketing", "Gaji", "Sewa"];

export default function Expenses({ data, saving, submit, openCreate, onCloseCreate }: ModuleProps & {
  openCreate: boolean; onCloseCreate: () => void;
}) {
  const [editing, setEditing] = useState<Expense | null>(null);
  const editable = canManage(data);
  const largest = data.expenses.reduce((max, expense) => Math.max(max, expense.amount), 0);

  return (
    <section className="data-panel">
      <SummaryStrip items={[
        { label: "Total biaya", value: money.format(data.summary.expenses) },
        { label: "Jumlah catatan", value: String(data.expenses.length) },
        { label: "Terbesar", value: money.format(largest) },
      ]} />

      {!data.expenses.length ? (
        <Empty icon={WalletCards} title="Belum ada catatan biaya" text="Catat biaya operasional supaya laba bersih ikut terhitung." />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Pembayaran</th>
                <th className="right">Nominal</th>{editable && <th className="right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {data.expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{longDate(expense.transactionDate)}</td>
                  <td><span className="category-badge">{expense.category}</span></td>
                  <td><b>{expense.note || "Tanpa keterangan"}</b></td>
                  <td>{expense.paymentMethod}</td>
                  <td className="right"><b>{money.format(expense.amount)}</b></td>
                  {editable && (
                    <td className="right">
                      <button type="button" className="row-action" onClick={() => setEditing(expense)}>
                        <Pencil size={14} /> Ubah
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(openCreate || editing) && (
        <Modal
          title={editing ? "Ubah catatan biaya" : "Catat biaya"}
          description="Biaya ikut mengurangi laba bersih di laporan."
          onClose={() => { setEditing(null); onCloseCreate(); }}
        >
          <form onSubmit={async (event) => {
            event.preventDefault();
            const payload = Object.fromEntries(new FormData(event.currentTarget));
            const result = editing
              ? await submit("update-expense", { expenseId: editing.id, ...payload })
              : await submit("create-expense", payload);
            if (result) { setEditing(null); onCloseCreate(); }
          }}>
            <div className="form-grid">
              <Field label="Kategori">
                <select name="category" defaultValue={editing?.category ?? "Operasional"}>
                  {expenseCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Nominal"><input name="amount" type="number" min="1" required defaultValue={editing?.amount} placeholder="0" /></Field>
              <Field label="Pembayaran">
                <select name="paymentMethod" defaultValue={editing?.paymentMethod ?? "Tunai"}>
                  {["Tunai", "Transfer", "QRIS"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Tanggal"><input name="transactionDate" type="date" required defaultValue={editing?.transactionDate ?? today()} /></Field>
              <Field label="Keterangan"><input name="note" required defaultValue={editing?.note} placeholder="Contoh: Gas LPG" /></Field>
            </div>
            <div className="modal-actions">
              {editing && (
                <button
                  type="button" className="row-action danger" disabled={saving}
                  onClick={async () => {
                    const result = await submit("delete-expense", { expenseId: editing.id });
                    if (result) setEditing(null);
                  }}
                >
                  <Trash2 size={14} /> Hapus
                </button>
              )}
              <button className="submit-button" disabled={saving}>{saving ? "Menyimpan…" : "Simpan biaya"}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
