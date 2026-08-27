"use client";

import { Coffee, Minus, Pencil, Plus, Trash2, Utensils } from "lucide-react";
import { useState } from "react";
import {
  Empty, Field, Modal, SummaryStrip, canManage, canStock, money, number,
  type Ingredient, type ModuleProps, type Product,
} from "./shared";

const categories = ["Coffee", "Non Coffee", "Food", "Pastry"];

type RecipeLine = { ingredientId: string; quantity: string };

export default function Products({ data, saving, submit, openCreate, onCloseCreate }: ModuleProps & {
  openCreate: boolean; onCloseCreate: () => void;
}) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [recipeFor, setRecipeFor] = useState<Product | null>(null);

  const editable = canManage(data);
  const recipeEditable = canStock(data);

  const margin = data.products.length
    ? data.products.reduce((sum, product) => sum + (product.price ? (product.price - product.cost) / product.price * 100 : 0), 0) / data.products.length
    : 0;

  const withoutRecipe = data.products.filter(
    (product) => product.isActive && !data.recipes.some((recipe) => recipe.productId === product.id),
  ).length;

  return (
    <section className="data-panel">
      <SummaryStrip items={[
        { label: "Produk aktif", value: String(data.products.filter((product) => product.isActive).length) },
        { label: "Kategori", value: String(new Set(data.products.map((product) => product.category)).size) },
        { label: "Margin rata-rata", value: `${number.format(margin)}%` },
        { label: "Belum punya resep", value: String(withoutRecipe), tone: withoutRecipe ? "danger" : "good" },
      ]} />

      {withoutRecipe > 0 && (
        <p className="panel-note">
          Produk tanpa resep tidak memotong stok bahan saat terjual. Atur komposisinya supaya stok dan HPP ikut terhitung.
        </p>
      )}

      {!data.products.length ? (
        <Empty icon={Coffee} title="Belum ada produk" text="Tambahkan menu pertama lo untuk mulai berjualan." />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Produk</th><th>SKU</th><th>Kategori</th><th>Komposisi resep</th>
                <th className="right">HPP</th><th className="right">Harga</th><th className="right">Margin</th>
                {(editable || recipeEditable) && <th className="right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {data.products.map((product) => {
                const lines = data.recipes
                  .filter((recipe) => recipe.productId === product.id)
                  .map((recipe) => {
                    const ingredient = data.ingredients.find((item) => item.id === recipe.ingredientId);
                    return `${ingredient?.name ?? "Bahan"} ${number.format(recipe.quantity)} ${ingredient?.unit ?? ""}`.trim();
                  });
                return (
                  <tr key={product.id} className={product.isActive ? undefined : "row-muted"}>
                    <td>
                      <div className="table-product"><span><Coffee size={16} /></span><b>{product.name}</b></div>
                      {!product.isActive && <small className="table-sub">Nonaktif</small>}
                    </td>
                    <td>{product.sku}</td>
                    <td><span className="category-badge">{product.category}</span></td>
                    <td className="recipe-cell">{lines.length ? lines.join(" · ") : <em className="danger-text">Resep belum diatur</em>}</td>
                    <td className="right">{money.format(product.cost)}</td>
                    <td className="right"><b>{money.format(product.price)}</b></td>
                    <td className="right">
                      <span className="margin-text">{product.price ? number.format((product.price - product.cost) / product.price * 100) : 0}%</span>
                    </td>
                    {(editable || recipeEditable) && (
                      <td className="right">
                        <div className="row-actions">
                          {recipeEditable && (
                            <button type="button" className="row-action" onClick={() => setRecipeFor(product)}>
                              <Utensils size={14} /> Resep
                            </button>
                          )}
                          {editable && (
                            <button type="button" className="row-action" onClick={() => setEditing(product)}>
                              <Pencil size={14} /> Ubah
                            </button>
                          )}
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
        <ProductForm
          product={editing}
          saving={saving}
          onClose={() => { setEditing(null); onCloseCreate(); }}
          onSubmit={async (payload) => {
            const result = editing
              ? await submit("update-product", { productId: editing.id, ...payload })
              : await submit("create-product", payload);
            if (result) { setEditing(null); onCloseCreate(); }
          }}
          onArchive={editing ? async () => {
            const result = await submit("archive-product", { productId: editing.id });
            if (result) setEditing(null);
          } : undefined}
        />
      )}

      {recipeFor && (
        <RecipeEditor
          product={recipeFor}
          ingredients={data.ingredients.filter((ingredient) => ingredient.isActive)}
          initial={data.recipes
            .filter((recipe) => recipe.productId === recipeFor.id)
            .map((recipe) => ({ ingredientId: recipe.ingredientId, quantity: String(recipe.quantity) }))}
          saving={saving}
          onClose={() => setRecipeFor(null)}
          onSubmit={async (lines) => {
            const result = await submit("set-recipe", { productId: recipeFor.id, lines });
            if (result) setRecipeFor(null);
          }}
        />
      )}
    </section>
  );
}

function ProductForm({ product, saving, onClose, onSubmit, onArchive }: {
  product: Product | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onArchive?: () => Promise<void>;
}) {
  return (
    <Modal
      title={product ? `Ubah ${product.name}` : "Tambah produk"}
      description={product ? "Perubahan harga berlaku untuk transaksi berikutnya." : "Produk langsung muncul di kasir."}
      onClose={onClose}
    >
      <form onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
      }}>
        <div className="form-grid">
          <Field label="Nama produk"><input name="name" required defaultValue={product?.name} placeholder="Contoh: Latte Gula Aren" /></Field>
          <Field label="SKU"><input name="sku" defaultValue={product?.sku} placeholder="Otomatis kalau kosong" /></Field>
          <Field label="Kategori">
            <select name="category" defaultValue={product?.category ?? "Coffee"}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Harga jual"><input name="price" type="number" min="1" required defaultValue={product?.price} placeholder="0" /></Field>
          <Field label="HPP" hint="Terisi otomatis kalau resepnya diatur."><input name="cost" type="number" min="0" defaultValue={product?.cost} placeholder="0" /></Field>
          {product && (
            <Field label="Status">
              <select name="isActive" defaultValue={product.isActive ? "true" : "false"}>
                <option value="true">Aktif di kasir</option>
                <option value="false">Nonaktif</option>
              </select>
            </Field>
          )}
        </div>
        <div className="modal-actions">
          {onArchive && (
            <button type="button" className="row-action danger" onClick={() => void onArchive()} disabled={saving}>
              <Trash2 size={14} /> Hapus produk
            </button>
          )}
          <button className="submit-button" disabled={saving}>
            {saving ? "Menyimpan…" : product ? "Simpan perubahan" : "Tambah produk"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Penyunting resep.
 *
 * Menyimpan seluruh komposisi sekaligus, bukan baris per baris — supaya isi resep di layar
 * selalu sama persis dengan yang tersimpan, tanpa keadaan setengah jadi.
 */
function RecipeEditor({ product, ingredients, initial, saving, onClose, onSubmit }: {
  product: Product;
  ingredients: Ingredient[];
  initial: RecipeLine[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (lines: Array<{ ingredientId: string; quantity: number }>) => Promise<void>;
}) {
  const [lines, setLines] = useState<RecipeLine[]>(initial.length ? initial : [{ ingredientId: "", quantity: "" }]);

  const update = (index: number, patch: Partial<RecipeLine>) =>
    setLines((current) => current.map((line, position) => position === index ? { ...line, ...patch } : line));

  const valid = lines.filter((line) => line.ingredientId && Number(line.quantity) > 0);
  const estimatedCost = valid.reduce((sum, line) => {
    const ingredient = ingredients.find((item) => item.id === line.ingredientId);
    return sum + (ingredient ? ingredient.averageCost * Number(line.quantity) : 0);
  }, 0);

  if (!ingredients.length) {
    return (
      <Modal title={`Resep ${product.name}`} description="Butuh bahan baku dulu." onClose={onClose}>
        <Empty
          icon={Utensils}
          title="Belum ada bahan baku"
          text="Tambahkan bahan di menu Stok Bahan, lalu susun resepnya di sini."
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={`Resep ${product.name}`}
      description="Bahan di sini yang dipotong otomatis setiap produk ini terjual."
      onClose={onClose}
    >
      <form onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(valid.map((line) => ({ ingredientId: line.ingredientId, quantity: Number(line.quantity) })));
      }}>
        <div className="recipe-editor">
          {lines.map((line, index) => {
            const ingredient = ingredients.find((item) => item.id === line.ingredientId);
            return (
              <div className="recipe-line" key={index}>
                <select
                  aria-label="Bahan"
                  value={line.ingredientId}
                  onChange={(event) => update(index, { ingredientId: event.target.value })}
                >
                  <option value="">Pilih bahan…</option>
                  {ingredients.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                  ))}
                </select>
                <input
                  type="number" min="0" step="0.01" inputMode="decimal" placeholder="0"
                  aria-label="Jumlah pemakaian"
                  value={line.quantity}
                  onChange={(event) => update(index, { quantity: event.target.value })}
                />
                <span className="recipe-unit">{ingredient?.unit ?? "satuan"}</span>
                <button
                  type="button" className="row-action danger" aria-label="Hapus baris"
                  onClick={() => setLines((current) => current.filter((_, position) => position !== index))}
                >
                  <Minus size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <button type="button" className="outline-action" onClick={() => setLines((current) => [...current, { ingredientId: "", quantity: "" }])}>
          <Plus size={15} /> Tambah bahan
        </button>

        <div className="recipe-total">
          <span>Perkiraan HPP dari resep</span>
          <b>{money.format(estimatedCost)}</b>
        </div>

        <button className="submit-button" disabled={saving}>
          {saving ? "Menyimpan…" : valid.length ? `Simpan ${valid.length} bahan` : "Kosongkan resep"}
        </button>
      </form>
    </Modal>
  );
}
