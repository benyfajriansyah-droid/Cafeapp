"use client";

import { Boxes, ClipboardCheck, PackagePlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Empty, Field, Modal, SummaryStrip, canStock, dateTime, formatUnit, money, number,
  type Ingredient, type ModuleProps,
} from "./shared";

const units = ["gram", "ml", "pcs", "kg", "liter", "porsi"];

export default function Inventory({ data, saving, submit, openCreate, onCloseCreate, openRestock, onCloseRestock }: ModuleProps & {
  openCreate: boolean; onCloseCreate: () => void;
  openRestock: boolean; onCloseRestock: () => void;
}) {
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [counting, setCounting] = useState<Ingredient | null>(null);

  const editable = canStock(data);
  const low = data.ingredients.filter((item) => item.stockQty <= item.minimumStock);
  const negative = data.ingredients.filter((item) => item.stockQty < 0);
  const value = data.ingredients.reduce((sum, item) => sum + Math.max(0, item.stockQty) * item.averageCost, 0);

  return (
    <section className="data-panel">
      <SummaryStrip items={[
        { label: "Jenis bahan", value: String(data.ingredients.length) },
        { label: "Perlu dibeli", value: String(low.length), tone: low.length ? "danger" : "good" },
        { label: "Stok minus", value: String(negative.length), tone: negative.length ? "danger" : "good" },
        { label: "Nilai persediaan", value: money.format(value) },
      ]} />

      {negative.length > 0 && (
        <p className="panel-note danger-text">
          {negative.length} bahan tercatat minus. Itu tanda pembelian belum sempat dicatat — koreksi lewat Stok opname
          atau catat pembeliannya supaya nilai persediaan kembali benar.
        </p>
      )}

      {!data.ingredients.length ? (
        <Empty icon={Boxes} title="Belum ada bahan baku" text="Tambahkan bahan supaya resep dan stok otomatis bisa jalan." />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Bahan</th><th>Supplier</th><th>Status</th>
                <th className="right">Stok</th><th className="right">Batas minimum</th><th className="right">Nilai stok</th>
                {editable && <th className="right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {data.ingredients.map((item) => {
                const isLow = item.stockQty <= item.minimumStock;
                const isNegative = item.stockQty < 0;
                return (
                  <tr key={item.id} className={item.isActive ? undefined : "row-muted"}>
                    <td>
                      <b>{item.name}</b>
                      <small className="table-sub">Satuan {item.unit} · HPP {money.format(Math.round(item.averageCost))}/{item.unit}</small>
                    </td>
                    <td>{item.supplier || "–"}</td>
                    <td>
                      <span className={isLow ? "stock-chip low" : "stock-chip"}>
                        {isNegative ? "Minus" : isLow ? "Perlu dibeli" : "Aman"}
                      </span>
                    </td>
                    <td className="right"><b className={isNegative ? "danger-text" : undefined}>{formatUnit(item.stockQty, item.unit)}</b></td>
                    <td className="right">{formatUnit(item.minimumStock, item.unit)}</td>
                    <td className="right">{money.format(Math.round(Math.max(0, item.stockQty) * item.averageCost))}</td>
                    {editable && (
                      <td className="right">
                        <div className="row-actions">
                          <button type="button" className="row-action" onClick={() => setCounting(item)}>
                            <ClipboardCheck size={14} /> Opname
                          </button>
                          <button type="button" className="row-action" onClick={() => setEditing(item)}>
                            <Pencil size={14} /> Ubah
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(openCreate || editing) && (
        <IngredientForm
          ingredient={editing}
          saving={saving}
          onClose={() => { setEditing(null); onCloseCreate(); }}
          onSubmit={async (payload) => {
            const result = editing
              ? await submit("update-ingredient", { ingredientId: editing.id, ...payload })
              : await submit("create-ingredient", payload);
            if (result) { setEditing(null); onCloseCreate(); }
          }}
          onDelete={editing ? async () => {
            const result = await submit("archive-ingredient", { ingredientId: editing.id });
            if (result) setEditing(null);
          } : undefined}
        />
      )}

      {openRestock && (
        <RestockForm
          ingredients={data.ingredients.filter((item) => item.isActive)}
          saving={saving}
          onClose={onCloseRestock}
          onSubmit={async (payload) => {
            const result = await submit("restock", payload);
            if (result) onCloseRestock();
          }}
        />
      )}

      {counting && (
        <Modal
          title={`Stok opname ${counting.name}`}
          description="Masukkan hasil hitungan fisik. Selisihnya dicatat sebagai koreksi."
          onClose={() => setCounting(null)}
        >
          <form onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const result = await submit("adjust-stock", {
              ingredientId: counting.id,
              countedQty: Number(form.get("countedQty")),
              note: String(form.get("note") ?? ""),
            });
            if (result) setCounting(null);
          }}>
            <div className="void-summary">
              <div><span>Tercatat sistem</span><b>{formatUnit(counting.stockQty, counting.unit)}</b></div>
            </div>
            <div className="form-grid">
              <Field label={`Hasil hitungan (${counting.unit})`}>
                <input name="countedQty" type="number" min="0" step="0.01" required defaultValue={Math.max(0, counting.stockQty)} />
              </Field>
              <Field label="Catatan"><input name="note" placeholder="Contoh: opname akhir bulan" /></Field>
            </div>
            <button className="submit-button" disabled={saving}>{saving ? "Menyimpan…" : "Simpan koreksi"}</button>
          </form>
        </Modal>
      )}
    </section>
  );
}

function IngredientForm({ ingredient, saving, onClose, onSubmit, onDelete }: {
  ingredient: Ingredient | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  return (
    <Modal
      title={ingredient ? `Ubah ${ingredient.name}` : "Tambah bahan baku"}
      description={ingredient ? "Jumlah stok diubah lewat stok masuk atau opname." : "Bahan ini bisa langsung dipakai di resep."}
      onClose={onClose}
    >
      <form onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
      }}>
        <div className="form-grid">
          <Field label="Nama bahan"><input name="name" required defaultValue={ingredient?.name} placeholder="Contoh: Susu segar" /></Field>
          <Field label="Satuan">
            <select name="unit" defaultValue={ingredient?.unit ?? "gram"}>
              {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </Field>
          {!ingredient && (
            <>
              <Field label="Stok awal"><input name="stockQty" type="number" min="0" step="0.01" placeholder="0" /></Field>
              <Field label="Harga per satuan"><input name="averageCost" type="number" min="0" step="0.01" placeholder="0" /></Field>
            </>
          )}
          <Field label="Batas minimum" hint="Dipakai untuk peringatan stok menipis.">
            <input name="minimumStock" type="number" min="0" step="0.01" defaultValue={ingredient?.minimumStock} placeholder="0" />
          </Field>
          <Field label="Supplier"><input name="supplier" defaultValue={ingredient?.supplier} placeholder="Nama supplier" /></Field>
        </div>
        <div className="modal-actions">
          {onDelete && (
            <button type="button" className="row-action danger" onClick={() => void onDelete()} disabled={saving}>
              <Trash2 size={14} /> Hapus bahan
            </button>
          )}
          <button className="submit-button" disabled={saving}>
            {saving ? "Menyimpan…" : ingredient ? "Simpan perubahan" : "Tambah bahan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RestockForm({ ingredients, saving, onClose, onSubmit }: {
  ingredients: Ingredient[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  if (!ingredients.length) {
    return (
      <Modal title="Stok bahan masuk" description="Butuh bahan baku dulu." onClose={onClose}>
        <Empty icon={PackagePlus} title="Belum ada bahan baku" text="Tambahkan bahan dulu sebelum mencatat pembelian." />
      </Modal>
    );
  }
  return (
    <Modal title="Stok bahan masuk" description="Harga beli terbaru ikut memperbarui HPP bahan." onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
      }}>
        <div className="form-grid">
          <Field label="Bahan">
            <select name="ingredientId" required>
              {ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
            </select>
          </Field>
          <Field label="Jumlah masuk"><input name="quantity" type="number" min="0.01" step="0.01" required placeholder="0" /></Field>
          <Field label="Harga per satuan"><input name="unitCost" type="number" min="0" step="0.01" placeholder="0" /></Field>
          <Field label="Supplier"><input name="supplier" placeholder="Nama supplier" /></Field>
          <Field label="Catatan"><input name="note" placeholder="No. nota / catatan" /></Field>
        </div>
        <button className="submit-button" disabled={saving}>{saving ? "Menyimpan…" : "Simpan stok masuk"}</button>
      </form>
    </Modal>
  );
}

export function Purchases({ data }: ModuleProps) {
  const purchases = data.stockMovements.filter((movement) => movement.type === "purchase");
  const total = purchases.reduce((sum, movement) => sum + movement.quantity * movement.unitCost, 0);

  if (!purchases.length) {
    return (
      <section className="data-panel">
        <Empty icon={PackagePlus} title="Belum ada pembelian" text="Catat stok masuk pertama untuk membangun histori supplier." />
      </section>
    );
  }

  return (
    <section className="data-panel">
      <SummaryStrip items={[
        { label: "Transaksi pembelian", value: String(purchases.length) },
        { label: "Total belanja bahan", value: money.format(Math.round(total)) },
      ]} />
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Waktu</th><th>Bahan</th><th>Supplier</th><th>Catatan</th><th className="right">Jumlah</th><th className="right">Total</th></tr>
          </thead>
          <tbody>
            {purchases.map((movement) => {
              const ingredient = data.ingredients.find((item) => item.id === movement.ingredientId);
              return (
                <tr key={movement.id}>
                  <td>{dateTime(movement.createdAt)}</td>
                  <td><b>{ingredient?.name ?? "Bahan terhapus"}</b></td>
                  <td>{movement.supplier || "–"}</td>
                  <td>{movement.note || "–"}</td>
                  <td className="right">{number.format(movement.quantity)} {ingredient?.unit ?? ""}</td>
                  <td className="right"><b>{money.format(Math.round(movement.quantity * movement.unitCost))}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
