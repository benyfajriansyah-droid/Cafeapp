"use client";

import { Coffee, Minus, Plus, Search, ShoppingBag, ShoppingCart, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Empty, Field, canManage, formatUnit, money, type ModuleProps, type Receipt } from "./shared";

const categories = ["Semua", "Coffee", "Non Coffee", "Food", "Pastry"];

export default function Pos({ data, saving, submit, onReceipt }: ModuleProps & { onReceipt: (receipt: Receipt) => void }) {
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState("QRIS");
  const [channel, setChannel] = useState("Dine in");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState("");

  const menu = data.products.filter((product) => product.isActive);
  const filtered = menu.filter((product) =>
    (category === "Semua" || product.category === category)
    && product.name.toLowerCase().includes(query.trim().toLowerCase()));

  const cartItems = menu
    .filter((product) => cart[product.id] > 0)
    .map((product) => ({ product, quantity: cart[product.id] }));

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Batas diskon di layar mengikuti aturan yang sama dengan yang dijaga server, supaya kasir
  // tahu batasnya sebelum menekan bayar — bukan baru ditolak setelahnya.
  const discountCeiling = canManage(data)
    ? subtotal
    : Math.floor(subtotal * data.workspace.cashierDiscountPercent / 100);
  const appliedDiscount = Math.min(Math.max(0, Number(discount) || 0), discountCeiling);
  const tax = Math.round((subtotal - appliedDiscount) * data.workspace.taxPercent / 100);
  const total = subtotal - appliedDiscount + tax;

  const setQuantity = (productId: string, quantity: number) =>
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });

  async function checkout() {
    const result = await submit("create-order", {
      items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      paymentMethod: payment, channel, customerName, customerPhone,
      discount: appliedDiscount,
    });
    if (!result || !result.orderNo) return;
    setCart({}); setCustomerName(""); setCustomerPhone(""); setDiscount("");
    onReceipt(result as unknown as Receipt);
  }

  if (!menu.length) {
    return (
      <Empty
        icon={Coffee}
        title="Belum ada produk yang bisa dijual"
        text="Tambahkan produk di menu Produk & Resep, lalu kasir siap dipakai."
      />
    );
  }

  return (
    <section className="pos-layout">
      <div className="menu-surface">
        <div className="module-toolbar">
          <div className="module-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari menu…" aria-label="Cari menu" />
          </div>
          <div className="category-tabs">
            {categories.map((item) => (
              <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
        </div>

        {!filtered.length ? (
          <Empty icon={Search} title="Menu tidak ketemu" text="Coba kata kunci atau kategori yang lain." />
        ) : (
          <div className="menu-grid">
            {filtered.map((product) => (
              <button type="button" className="menu-card" key={product.id} onClick={() => setQuantity(product.id, (cart[product.id] ?? 0) + 1)}>
                <span><Coffee size={25} /></span>
                <small>{product.category}</small>
                <b>{product.name}</b>
                <strong>{money.format(product.price)}</strong>
                <em>HPP {money.format(product.cost)}</em>
              </button>
            ))}
          </div>
        )}
      </div>

      <aside className="cart-surface">
        <div className="cart-title">
          <div>
            <h2>Pesanan baru</h2>
            <p>{channel} · {cartItems.reduce((sum, item) => sum + item.quantity, 0)} item</p>
          </div>
          <button type="button" onClick={() => setCart({})}>Kosongkan</button>
        </div>

        <div className="segment-control">
          {["Dine in", "Take away"].map((item) => (
            <button key={item} type="button" className={channel === item ? "active" : ""} onClick={() => setChannel(item)}>{item}</button>
          ))}
        </div>

        <div className="customer-fields">
          <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nama pelanggan (opsional)" aria-label="Nama pelanggan" />
          <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="WhatsApp (opsional)" aria-label="Nomor WhatsApp pelanggan" />
        </div>

        <div className="cart-items">
          {!cartItems.length ? (
            <Empty icon={ShoppingBag} title="Keranjang kosong" text="Pilih produk untuk mulai transaksi." />
          ) : cartItems.map(({ product, quantity }) => (
            <div className="cart-row" key={product.id}>
              <div><b>{product.name}</b><small>{money.format(product.price)}</small></div>
              <div className="quantity-control">
                <button type="button" aria-label={`Kurangi ${product.name}`} onClick={() => setQuantity(product.id, quantity - 1)}><Minus size={13} /></button>
                <span>{quantity}</span>
                <button type="button" aria-label={`Tambah ${product.name}`} onClick={() => setQuantity(product.id, quantity + 1)}><Plus size={13} /></button>
              </div>
              <strong>{money.format(product.price * quantity)}</strong>
            </div>
          ))}
        </div>

        <div className="cart-bottom">
          {discountCeiling > 0 && (
            <Field
              label="Diskon"
              hint={canManage(data) ? "Maksimal sebesar subtotal" : `Batas peran lo ${data.workspace.cashierDiscountPercent}% · ${money.format(discountCeiling)}`}
            >
              <input
                type="number" min="0" max={discountCeiling} inputMode="numeric" placeholder="0"
                value={discount} onChange={(event) => setDiscount(event.target.value)}
              />
            </Field>
          )}

          <div className="payment-options">
            {["Tunai", "QRIS", "Debit"].map((item) => (
              <button key={item} type="button" className={payment === item ? "active" : ""} onClick={() => setPayment(item)}>{item}</button>
            ))}
          </div>

          <div className="cart-breakdown">
            <div><span>Subtotal</span><b>{money.format(subtotal)}</b></div>
            {appliedDiscount > 0 && <div><span>Diskon</span><b className="danger-text">−{money.format(appliedDiscount)}</b></div>}
            {data.workspace.taxPercent > 0 && <div><span>Pajak {data.workspace.taxPercent}%</span><b>{money.format(tax)}</b></div>}
          </div>

          <div className="cart-total"><span>Total pembayaran</span><strong>{money.format(total)}</strong></div>

          <button type="button" className="checkout-button" disabled={!cartItems.length || saving} onClick={() => void checkout()}>
            <ShoppingCart size={17} />{saving ? "Menyimpan…" : `Bayar ${money.format(total)}`}
          </button>
        </div>
      </aside>
    </section>
  );
}

/** Peringatan stok minus setelah transaksi tersimpan. */
export function StockWarnings({ warnings }: { warnings: Receipt["stockWarnings"] }) {
  if (!warnings.length) return null;
  return (
    <div className="stock-warning">
      <TriangleAlert size={16} />
      <div>
        <b>Stok tercatat kurang dari pemakaian</b>
        <p>
          {warnings.map((warning) => `${warning.name} (sisa ${formatUnit(warning.available, warning.unit)}, dipakai ${formatUnit(warning.needed, warning.unit)})`).join(" · ")}
        </p>
        <small>Transaksi tetap tersimpan. Catat pembelian yang belum masuk supaya stok kembali cocok.</small>
      </div>
    </div>
  );
}
