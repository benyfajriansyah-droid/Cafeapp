"use client";

import {
  BadgeCheck,
  Boxes,
  Check,
  CircleAlert,
  Coffee,
  CreditCard,
  Minus,
  PackagePlus,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Workspace = { id: string; name: string; plan: string; phone: string; businessType: string; taxPercent: number; onboardingCompleted: boolean; subscriptionStatus: string; trialEndsAt: string | null; billingInterval: string };
type Branch = { id: string; name: string; code: string; address: string; isActive: boolean };
type Product = { id: string; name: string; sku: string; category: string; price: number; cost: number; isActive: boolean };
type Ingredient = { id: string; name: string; unit: string; stockQty: number; minimumStock: number; averageCost: number; supplier: string };
type Recipe = { id: string; productId: string; ingredientId: string; quantity: number };
type Order = { id: string; orderNo: string; channel: string; paymentMethod: string; subtotal: number; discount: number; total: number; status: string; createdAt: string; customerName: string; customerPhone: string; notes: string };
type OrderItem = { id: string; orderId: string; productId: string; productName: string; quantity: number; unitPrice: number; unitCost: number; subtotal: number };
type Expense = { id: string; category: string; amount: number; paymentMethod: string; note: string; transactionDate: string };
type StockMovement = { id: string; ingredientId: string; type: string; quantity: number; unitCost: number; supplier: string; note: string; createdAt: string };
type Shift = { id: string; cashierName: string; openingCash: number; actualCash: number | null; variance: number | null; status: string; openedAt: string; closedAt: string | null };
type Member = { id: string; email: string; name: string; role: string; status: string };
type BillingInvoice = { id: string; invoiceNo: string; plan: string; interval: string; amount: number; status: string; dueDate: string; paidAt: string | null };
type SubscriptionClaim = { id: string; workspaceId: string | null; checkoutReference: string; orderHeroInvoice: string; buyerName: string; buyerEmail: string; buyerPhone: string; plan: string; interval: string; amount: number; status: string; createdAt: string };
type AppData = { workspace: Workspace; currentMember: Member; platformAdmin: boolean; platformSettings: Record<string, string>; subscriptionClaims: SubscriptionClaim[]; branches: Branch[]; products: Product[]; ingredients: Ingredient[]; recipes: Recipe[]; orders: Order[]; orderItems: OrderItem[]; expenses: Expense[]; stockMovements: StockMovement[]; shifts: Shift[]; members: Member[]; billingInvoices: BillingInvoice[] };
type Receipt = { orderNo: string; total: number; items: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }>; business: string; branch: string; paymentMethod: string; customerName: string };

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const categories = ["Semua", "Coffee", "Non Coffee", "Food", "Pastry"];
const today = new Date().toISOString().slice(0, 10);

function dateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Empty({ icon: Icon, title, text }: { icon: typeof Boxes; title: string; text: string }) {
  return <div className="empty-state"><span><Icon size={25} /></span><b>{title}</b><p>{text}</p></div>;
}

function Onboarding({ saving, onComplete }: { saving: boolean; onComplete: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({ businessName: "", outletName: "Outlet Utama", phone: "", businessType: "coffee-home", address: "", taxPercent: "0" });
  const [plan, setPlan] = useState("pro");
  const plans = [
    { id: "starter", name: "Starter", price: "Rp99rb", text: "1 outlet · 2 pengguna" },
    { id: "pro", name: "Pro", price: "Rp199rb", text: "3 outlet · 10 pengguna" },
    { id: "business", name: "Business", price: "Rp399rb", text: "Multi-outlet · tim besar" },
  ];
  return <main className="onboarding-shell"><div className="onboarding-brand"><span><Coffee size={22} /></span><b>Famz Coffee OS</b></div><div className="onboarding-progress"><span className={step >= 1 ? "active" : ""}>1</span><i/><span className={step >= 2 ? "active" : ""}>2</span><i/><span className={step >= 3 ? "active" : ""}>3</span></div>
    <section className="onboarding-card">
      {step === 1 && <><div className="onboarding-title"><span>LANGKAH 1 DARI 3</span><h1>Kenalin usaha kopi lo.</h1><p>Informasi ini dipakai untuk outlet, laporan, dan struk.</p></div><div className="form-grid"><Field label="Nama usaha"><input value={profile.businessName} onChange={(e)=>setProfile({...profile,businessName:e.target.value})} placeholder="Contoh: Famz Coffee" autoFocus /></Field><Field label="Nama outlet pertama"><input value={profile.outletName} onChange={(e)=>setProfile({...profile,outletName:e.target.value})} /></Field><Field label="Jenis usaha"><select value={profile.businessType} onChange={(e)=>setProfile({...profile,businessType:e.target.value})}><option value="coffee-home">Kopi rumahan</option><option value="booth">Booth / gerobak</option><option value="coffee-shop">Kedai kopi</option><option value="multi-outlet">Multi-outlet</option></select></Field><Field label="Nomor WhatsApp"><input value={profile.phone} onChange={(e)=>setProfile({...profile,phone:e.target.value})} placeholder="08xxxxxxxxxx" /></Field><Field label="Alamat outlet"><input value={profile.address} onChange={(e)=>setProfile({...profile,address:e.target.value})} placeholder="Alamat singkat" /></Field><Field label="Pajak layanan (%)"><input type="number" min="0" max="100" value={profile.taxPercent} onChange={(e)=>setProfile({...profile,taxPercent:e.target.value})} /></Field></div><button className="onboarding-next" disabled={!profile.businessName.trim() || !profile.outletName.trim()} onClick={()=>setStep(2)}>Pilih paket <ArrowIcon /></button></>}
      {step === 2 && <><div className="onboarding-title"><span>LANGKAH 2 DARI 3</span><h1>Pilih ruang untuk bertumbuh.</h1><p>Semua paket gratis dicoba 14 hari. Belum perlu pembayaran.</p></div><div className="onboarding-plans">{plans.map((item)=><button key={item.id} className={plan===item.id?"active":""} onClick={()=>setPlan(item.id)}><span>{item.name}</span><b>{item.price}<small>/bulan</small></b><p>{item.text}</p>{plan===item.id&&<Check size={17}/>}</button>)}</div><div className="onboarding-buttons"><button onClick={()=>setStep(1)}>Kembali</button><button disabled={saving} onClick={async()=>{const result=await onComplete({...profile,taxPercent:Number(profile.taxPercent),plan});if(result)setStep(3)}}>{saving?"Menyiapkan…":"Siapkan workspace"}</button></div></>}
      {step === 3 && <div className="onboarding-done"><span><Check size={28}/></span><h1>Workspace lo siap.</h1><p>Produk contoh sudah tersedia. Lo bisa langsung mencoba kasir, lalu ganti produk dan resep dengan data usaha sendiri.</p><button onClick={()=>window.location.reload()}>Masuk ke dashboard</button></div>}
    </section><small className="onboarding-foot">Data usaha dipisahkan per akun dan hanya bisa diakses tim yang lo izinkan.</small></main>;
}

function ArrowIcon() { return <span aria-hidden="true">→</span>; }

export default function ModulePage({ active }: { active: string }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"expense" | "restock" | "product" | "close" | "member" | "branch" | "plan" | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState("QRIS");
  const [channel, setChannel] = useState("Dine in");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/app", { cache: "no-store" });
      const result = await response.json() as AppData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Data gagal dimuat");
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Data gagal dimuat");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submit = async (action: string, payload: Record<string, unknown>) => {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/app", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const result = await response.json() as { error?: string; orderNo?: string };
      if (!response.ok) throw new Error(result.error || "Data gagal disimpan");
      setModal(null); setToast(action === "create-order" ? `Transaksi ${result.orderNo} berhasil` : "Data berhasil disimpan");
      setTimeout(() => setToast(""), 2600);
      await load();
      return result;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Data gagal disimpan");
      return false;
    } finally { setSaving(false); }
  };

  const cartItems = useMemo(() => data?.products.filter((product) => cart[product.id]).map((product) => ({ product, quantity: cart[product.id] })) ?? [], [cart, data]);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const activeShift = data?.shifts.find((shift) => shift.status === "open");

  if (loading && !data) return <div className="module-loading"><span /><p>Menyiapkan operasional kedai…</p></div>;
  if (error && !data) return <div className="module-error"><CircleAlert size={28} /><b>Belum bisa memuat data</b><p>{error}</p><button onClick={() => void load()}><RefreshCw size={15} /> Coba lagi</button></div>;
  if (!data) return null;
  if (!data.workspace.onboardingCompleted) return <Onboarding saving={saving} onComplete={(payload) => submit("complete-onboarding", payload)} />;

  const lowIngredients = data.ingredients.filter((item) => item.stockQty <= item.minimumStock);
  const totalSales = data.orders.reduce((sum, order) => sum + order.total, 0);
  const totalCogs = data.orderItems.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
  const totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const grossProfit = totalSales - totalCogs;
  const netProfit = grossProfit - totalExpenses;

  const filteredProducts = data.products.filter((product) => (category === "Semua" || product.category === category) && product.name.toLowerCase().includes(query.toLowerCase()));

  const heading: Record<string, { title: string; text: string }> = {
    Kasir: { title: "Kasir", text: "Catat pesanan dengan cepat, stok resep berkurang otomatis." },
    Transaksi: { title: "Riwayat transaksi", text: "Semua penjualan dari seluruh metode pembayaran." },
    "Produk & Resep": { title: "Produk & resep", text: "Atur menu, harga, HPP, dan komposisi bahan." },
    "Stok Bahan": { title: "Stok bahan", text: "Pantau persediaan dan titik pemesanan ulang." },
    Pembelian: { title: "Pembelian bahan", text: "Catat stok masuk dan histori belanja supplier." },
    Biaya: { title: "Biaya operasional", text: "Catat pengeluaran di luar bahan baku." },
    "Shift Kas": { title: "Shift kas", text: "Buka, pantau, dan rekonsiliasi kas setiap shift." },
    Laporan: { title: "Laporan usaha", text: "Baca omzet, HPP, margin, dan laba bersih." },
    Cabang: { title: "Cabang", text: "Kelola outlet dalam satu akun bisnis." },
    "Tim & Akses": { title: "Tim & akses", text: "Siapkan peran owner, manager, kasir, dan gudang." },
    Pengaturan: { title: "Pengaturan bisnis", text: "Identitas toko, pajak, dan kesiapan produk berlangganan." },
    "Penjualan SaaS": { title: "Penjualan SaaS", text: "Hubungkan produk OrderHero dan verifikasi aktivasi pelanggan." },
  };

  return (
    <>
      {toast && <div className="toast"><BadgeCheck size={17} />{toast}</div>}
      <section className="module-heading">
        <div><p className="eyebrow">FAMZ COFFEE · OUTLET UTAMA</p><h1>{heading[active]?.title ?? active}</h1><p>{heading[active]?.text}</p></div>
        {active === "Kasir" && <div className="live-status"><span /> Shift {activeShift ? "aktif" : "belum dibuka"}</div>}
        {active === "Produk & Resep" && <button className="primary-action" onClick={() => setModal("product")}><Plus size={16} /> Produk baru</button>}
        {(active === "Stok Bahan" || active === "Pembelian") && <button className="primary-action" onClick={() => setModal("restock")}><PackagePlus size={16} /> Stok masuk</button>}
        {active === "Biaya" && <button className="primary-action" onClick={() => setModal("expense")}><Plus size={16} /> Catat biaya</button>}
        {active === "Shift Kas" && activeShift && <button className="primary-action" onClick={() => setModal("close")}><Check size={16} /> Tutup shift</button>}
        {active === "Cabang" && data.currentMember.role === "owner" && <button className="primary-action" onClick={() => setModal("branch")}><Plus size={16} /> Tambah outlet</button>}
        {active === "Tim & Akses" && ["owner","manager"].includes(data.currentMember.role) && <button className="primary-action" onClick={() => setModal("member")}><UserPlus size={16} /> Tambah anggota</button>}
      </section>

      {error && <div className="inline-error"><CircleAlert size={16} />{error}<button onClick={() => setError("")}><X size={14} /></button></div>}

      {active === "Kasir" && (
        <section className="pos-layout">
          <div className="menu-surface">
            <div className="module-toolbar">
              <div className="module-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari menu…" /></div>
              <div className="category-tabs">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
            </div>
            <div className="menu-grid">
              {filteredProducts.map((product) => (
                <button className="menu-card" key={product.id} onClick={() => setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))}>
                  <span><Coffee size={25} /></span><small>{product.category}</small><b>{product.name}</b><strong>{money.format(product.price)}</strong><em>HPP {money.format(product.cost)}</em>
                </button>
              ))}
            </div>
          </div>
          <aside className="cart-surface">
            <div className="cart-title"><div><h2>Pesanan baru</h2><p>{channel} · {cartItems.reduce((sum, item) => sum + item.quantity, 0)} item</p></div><button onClick={() => setCart({})}>Kosongkan</button></div>
            <div className="segment-control"><button className={channel === "Dine in" ? "active" : ""} onClick={() => setChannel("Dine in")}>Dine in</button><button className={channel === "Take away" ? "active" : ""} onClick={() => setChannel("Take away")}>Take away</button></div>
            <div className="customer-fields"><input value={customerName} onChange={(event)=>setCustomerName(event.target.value)} placeholder="Nama pelanggan (opsional)"/><input value={customerPhone} onChange={(event)=>setCustomerPhone(event.target.value)} placeholder="WhatsApp (opsional)"/></div>
            <div className="cart-items">
              {!cartItems.length ? <Empty icon={ShoppingBag} title="Keranjang kosong" text="Pilih produk untuk mulai transaksi." /> : cartItems.map(({ product, quantity }) => (
                <div className="cart-row" key={product.id}>
                  <div><b>{product.name}</b><small>{money.format(product.price)}</small></div>
                  <div className="quantity-control"><button onClick={() => setCart((current) => ({ ...current, [product.id]: Math.max(0, quantity - 1) }))}><Minus size={13} /></button><span>{quantity}</span><button onClick={() => setCart((current) => ({ ...current, [product.id]: quantity + 1 }))}><Plus size={13} /></button></div>
                  <strong>{money.format(product.price * quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="cart-bottom">
              <div className="payment-options">{["Tunai", "QRIS", "Debit"].map((item) => <button key={item} className={payment === item ? "active" : ""} onClick={() => setPayment(item)}>{item}</button>)}</div>
              <div className="cart-total"><span>Total pembayaran</span><strong>{money.format(cartTotal)}</strong></div>
              <button className="checkout-button" disabled={!cartItems.length || saving} onClick={async () => { const result = await submit("create-order", { items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })), paymentMethod: payment, channel, customerName, customerPhone }); if (result && result.orderNo) { setCart({}); setCustomerName(""); setCustomerPhone(""); setReceipt(result as unknown as Receipt); } }}><ShoppingCart size={17} />{saving ? "Menyimpan…" : `Bayar ${money.format(cartTotal)}`}</button>
            </div>
          </aside>
        </section>
      )}

      {active === "Transaksi" && (
        <section className="data-panel"><div className="summary-strip"><div><span>Total transaksi</span><b>{data.orders.length}</b></div><div><span>Total penjualan</span><b>{money.format(totalSales)}</b></div><div><span>Rata-rata struk</span><b>{money.format(totalSales / Math.max(1, data.orders.length))}</b></div></div>
          <div className="table-scroll"><table><thead><tr><th>No. transaksi</th><th>Waktu</th><th>Channel</th><th>Pembayaran</th><th>Status</th><th className="right">Total</th></tr></thead><tbody>{data.orders.map((order) => <tr key={order.id}><td><b>{order.orderNo}</b></td><td>{dateTime(order.createdAt)}</td><td>{order.channel}</td><td>{order.paymentMethod}</td><td><span className="paid-badge">Lunas</span></td><td className="right"><b>{money.format(order.total)}</b></td></tr>)}</tbody></table></div>
        </section>
      )}

      {active === "Produk & Resep" && (
        <section className="data-panel"><div className="summary-strip"><div><span>Produk aktif</span><b>{data.products.filter((p) => p.isActive).length}</b></div><div><span>Kategori</span><b>{new Set(data.products.map((p) => p.category)).size}</b></div><div><span>Margin rata-rata</span><b>{number.format(data.products.reduce((sum, p) => sum + (p.price ? (p.price - p.cost) / p.price * 100 : 0), 0) / Math.max(1, data.products.length))}%</b></div></div>
          <div className="table-scroll"><table><thead><tr><th>Produk</th><th>SKU</th><th>Kategori</th><th>Komposisi resep</th><th className="right">HPP</th><th className="right">Harga</th><th className="right">Margin</th></tr></thead><tbody>{data.products.map((product) => { const parts = data.recipes.filter((recipe) => recipe.productId === product.id).map((recipe) => { const ingredient = data.ingredients.find((item) => item.id === recipe.ingredientId); return `${ingredient?.name ?? "Bahan"} ${number.format(recipe.quantity)} ${ingredient?.unit ?? ""}`; }); return <tr key={product.id}><td><div className="table-product"><span><Coffee size={16} /></span><b>{product.name}</b></div></td><td>{product.sku}</td><td><span className="category-badge">{product.category}</span></td><td className="recipe-cell">{parts.length ? parts.join(" · ") : "Resep belum diatur"}</td><td className="right">{money.format(product.cost)}</td><td className="right"><b>{money.format(product.price)}</b></td><td className="right"><span className="margin-text">{number.format((product.price - product.cost) / product.price * 100)}%</span></td></tr>; })}</tbody></table></div>
        </section>
      )}

      {active === "Stok Bahan" && (
        <section className="data-panel"><div className="summary-strip"><div><span>Jenis bahan</span><b>{data.ingredients.length}</b></div><div><span>Perlu dibeli</span><b className="danger-text">{lowIngredients.length}</b></div><div><span>Nilai persediaan</span><b>{money.format(data.ingredients.reduce((sum, item) => sum + item.stockQty * item.averageCost, 0))}</b></div></div>
          <div className="table-scroll"><table><thead><tr><th>Bahan</th><th>Supplier</th><th>Status</th><th className="right">Stok</th><th className="right">Batas minimum</th><th className="right">Nilai stok</th></tr></thead><tbody>{data.ingredients.map((item) => { const low = item.stockQty <= item.minimumStock; return <tr key={item.id}><td><b>{item.name}</b><small className="table-sub">Satuan {item.unit}</small></td><td>{item.supplier || "–"}</td><td><span className={low ? "stock-chip low" : "stock-chip"}>{low ? "Perlu dibeli" : "Aman"}</span></td><td className="right"><b>{number.format(item.stockQty)} {item.unit}</b></td><td className="right">{number.format(item.minimumStock)} {item.unit}</td><td className="right">{money.format(item.stockQty * item.averageCost)}</td></tr>; })}</tbody></table></div>
        </section>
      )}

      {active === "Pembelian" && (
        <section className="data-panel">{!data.stockMovements.filter((item) => item.type === "purchase").length ? <Empty icon={PackagePlus} title="Belum ada pembelian" text="Catat stok masuk pertama untuk membangun histori supplier." /> : <div className="table-scroll"><table><thead><tr><th>Waktu</th><th>Bahan</th><th>Supplier</th><th>Catatan</th><th className="right">Jumlah</th><th className="right">Total</th></tr></thead><tbody>{data.stockMovements.filter((item) => item.type === "purchase").map((movement) => { const ingredient = data.ingredients.find((item) => item.id === movement.ingredientId); return <tr key={movement.id}><td>{dateTime(movement.createdAt)}</td><td><b>{ingredient?.name}</b></td><td>{movement.supplier || "–"}</td><td>{movement.note || "–"}</td><td className="right">{number.format(movement.quantity)} {ingredient?.unit}</td><td className="right"><b>{money.format(movement.quantity * movement.unitCost)}</b></td></tr>; })}</tbody></table></div>}</section>
      )}

      {active === "Biaya" && (
        <section className="data-panel"><div className="summary-strip"><div><span>Total biaya</span><b>{money.format(totalExpenses)}</b></div><div><span>Jumlah catatan</span><b>{data.expenses.length}</b></div><div><span>Terbesar</span><b>{money.format(Math.max(0, ...data.expenses.map((item) => item.amount)))}</b></div></div>
          <div className="table-scroll"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Pembayaran</th><th className="right">Nominal</th></tr></thead><tbody>{data.expenses.map((expense) => <tr key={expense.id}><td>{new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(expense.transactionDate))}</td><td><span className="category-badge">{expense.category}</span></td><td><b>{expense.note || "Tanpa keterangan"}</b></td><td>{expense.paymentMethod}</td><td className="right"><b>{money.format(expense.amount)}</b></td></tr>)}</tbody></table></div>
        </section>
      )}

      {active === "Shift Kas" && (
        <section className="shift-layout"><article className="shift-hero"><div className="shift-hero-top"><span className={activeShift ? "shift-indicator" : "shift-indicator closed"}><span />{activeShift ? "SHIFT AKTIF" : "SHIFT DITUTUP"}</span><ReceiptText size={24} /></div><h2>{activeShift ? `Shift ${activeShift.cashierName}` : "Tidak ada shift aktif"}</h2><p>{activeShift ? `Dibuka ${dateTime(activeShift.openedAt)}` : "Buka shift baru untuk mulai merekam kas."}</p><div className="shift-numbers"><div><span>Kas awal</span><b>{money.format(activeShift?.openingCash ?? 0)}</b></div><div><span>Penjualan tunai</span><b>{money.format(data.orders.filter((order) => order.paymentMethod === "Tunai").reduce((sum, order) => sum + order.total, 0))}</b></div><div><span>Estimasi kas</span><b>{money.format((activeShift?.openingCash ?? 0) + data.orders.filter((order) => order.paymentMethod === "Tunai").reduce((sum, order) => sum + order.total, 0))}</b></div></div></article>
          <article className="data-panel"><div className="panel-header"><div><h2>Riwayat shift</h2><p>Hasil rekonsiliasi kas</p></div></div><div className="table-scroll"><table><thead><tr><th>Kasir</th><th>Dibuka</th><th>Status</th><th className="right">Kas aktual</th><th className="right">Selisih</th></tr></thead><tbody>{data.shifts.map((shift) => <tr key={shift.id}><td><b>{shift.cashierName}</b></td><td>{dateTime(shift.openedAt)}</td><td><span className={shift.status === "open" ? "stock-chip" : "category-badge"}>{shift.status === "open" ? "Berjalan" : "Ditutup"}</span></td><td className="right">{shift.actualCash == null ? "–" : money.format(shift.actualCash)}</td><td className="right"><b className={(shift.variance ?? 0) < 0 ? "danger-text" : "margin-text"}>{shift.variance == null ? "–" : money.format(shift.variance)}</b></td></tr>)}</tbody></table></div></article>
        </section>
      )}

      {active === "Laporan" && (
        <section className="report-layout">
          <div className="report-kpis"><article><span>Penjualan</span><b>{money.format(totalSales)}</b><small>{data.orders.length} transaksi</small></article><article><span>Laba kotor</span><b>{money.format(grossProfit)}</b><small>Margin {number.format(totalSales ? grossProfit / totalSales * 100 : 0)}%</small></article><article><span>Laba bersih</span><b>{money.format(netProfit)}</b><small>Setelah biaya operasional</small></article></div>
          <article className="data-panel profit-card"><div className="panel-header"><div><h2>Laba rugi sederhana</h2><p>Data seluruh periode tersimpan</p></div><button onClick={() => window.print()}>Cetak laporan</button></div><div className="profit-lines"><div><span>Penjualan bersih</span><b>{money.format(totalSales)}</b></div><div><span>Harga pokok penjualan</span><b>({money.format(totalCogs)})</b></div><div className="strong"><span>Laba kotor</span><b>{money.format(grossProfit)}</b></div><div><span>Biaya operasional</span><b>({money.format(totalExpenses)})</b></div><div className="total"><span>Laba bersih</span><b>{money.format(netProfit)}</b></div></div></article>
          <article className="data-panel payment-card"><div className="panel-header"><div><h2>Komposisi pembayaran</h2><p>Nilai transaksi per metode</p></div></div>{["QRIS", "Tunai", "Debit"].map((method) => { const value = data.orders.filter((order) => order.paymentMethod === method).reduce((sum, order) => sum + order.total, 0); const width = totalSales ? value / totalSales * 100 : 0; return <div className="payment-line" key={method}><div><b>{method}</b><span>{money.format(value)}</span></div><div><span style={{ width: `${width}%` }} /></div><small>{number.format(width)}%</small></div>; })}</article>
        </section>
      )}

      {active === "Cabang" && <section className="settings-grid"><article className="data-panel"><div className="panel-header"><div><h2>Outlet aktif</h2><p>Data penjualan dan stok dipisahkan per cabang</p></div><span className="paid-badge">{data.branches.length} outlet</span></div><div className="branch-list">{data.branches.map((branch) => <div key={branch.id}><span><Store size={20} /></span><div><b>{branch.name}</b><small>{branch.code} · {branch.address || "Alamat belum diisi"}</small></div><em>{branch.isActive ? "Aktif" : "Nonaktif"}</em></div>)}</div></article><article className="upgrade-card"><Boxes size={24} /><h2>Paket {data.workspace.plan}</h2><p>{data.workspace.plan === "starter" ? "Paket Starter mencakup 1 outlet. Upgrade ke Pro untuk mengelola sampai 3 outlet." : data.workspace.plan === "pro" ? "Lo bisa mengelola sampai 3 outlet dalam satu workspace." : "Paket Business mendukung operasional multi-outlet tanpa batas standar."}</p><button onClick={() => setModal("plan")}>Kelola paket</button></article></section>}

      {active === "Tim & Akses" && <section className="data-panel"><div className="summary-strip"><div><span>Peran tersedia</span><b>4</b></div><div><span>Pengguna aktif</span><b>{data.members.filter((member)=>member.status==="active").length}</b></div><div><span>Peran lo</span><b className="capitalize">{data.currentMember.role}</b></div></div><div className="table-scroll"><table><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Akses</th><th>Status</th></tr></thead><tbody>{data.members.map((member)=><tr key={member.id}><td><b>{member.name || member.email.split("@")[0]}</b></td><td>{member.email}</td><td><span className="category-badge capitalize">{member.role}</span></td><td>{member.role === "owner" ? "Semua modul & billing" : member.role === "manager" ? "Operasional tanpa billing" : member.role === "cashier" ? "Kasir & shift" : "Stok & pembelian"}</td><td><span className="stock-chip">{member.status === "active" ? "Aktif" : "Menunggu"}</span></td></tr>)}</tbody></table></div><div className="role-note"><ShieldCheck size={16} /><p><b>Akses dijaga di server</b><span>Setiap aksi diperiksa berdasarkan peran, bukan hanya menyembunyikan tombol di layar.</span></p></div></section>}

      {active === "Pengaturan" && <section className="account-layout"><article className="data-panel"><div className="panel-header"><div><h2>Identitas bisnis</h2><p>Digunakan di laporan dan struk</p></div></div><form onSubmit={(event)=>{event.preventDefault();void submit("update-settings",Object.fromEntries(new FormData(event.currentTarget)));}}><div className="settings-fields"><Field label="Nama bisnis"><input name="businessName" defaultValue={data.workspace.name} /></Field><Field label="Nomor WhatsApp"><input name="phone" defaultValue={data.workspace.phone} /></Field><Field label="Jenis usaha"><select name="businessType" defaultValue={data.workspace.businessType}><option value="coffee-home">Kopi rumahan</option><option value="booth">Booth / gerobak</option><option value="coffee-shop">Kedai kopi</option><option value="multi-outlet">Multi-outlet</option></select></Field><Field label="Pajak layanan (%)"><input name="taxPercent" type="number" min="0" max="100" defaultValue={data.workspace.taxPercent} /></Field></div>{data.currentMember.role === "owner" && <button className="settings-save" disabled={saving}>Simpan perubahan</button>}</form></article><article className="subscription-card"><div><span>PAKET AKTIF</span><b className="capitalize">{data.workspace.plan}</b><small className={`subscription-status ${data.workspace.subscriptionStatus}`}>{data.workspace.subscriptionStatus === "trialing" ? "Uji coba aktif" : data.workspace.subscriptionStatus === "active" ? "Aktif" : "Menunggu pembayaran"}</small></div><CreditCard size={25}/><p>{data.workspace.trialEndsAt ? `Masa uji coba sampai ${new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(data.workspace.trialEndsAt))}.` : "Langganan tercatat di workspace ini."}</p><button onClick={()=>setModal("plan")}>Ubah paket</button></article><article className="data-panel billing-history"><div className="panel-header"><div><h2>Riwayat tagihan</h2><p>Tagihan langganan Famz Coffee OS</p></div></div>{!data.billingInvoices.length?<Empty icon={CreditCard} title="Belum ada tagihan" text="Tagihan muncul setelah lo memilih paket berbayar."/>:<div className="table-scroll"><table><thead><tr><th>Invoice</th><th>Paket</th><th>Jatuh tempo</th><th>Status</th><th className="right">Total</th></tr></thead><tbody>{data.billingInvoices.map((invoice)=><tr key={invoice.id}><td><b>{invoice.invoiceNo}</b></td><td className="capitalize">{invoice.plan} · {invoice.interval === "yearly" ? "Tahunan" : "Bulanan"}</td><td>{invoice.dueDate}</td><td><span className={invoice.status === "paid" ? "stock-chip" : "stock-chip low"}>{invoice.status === "paid" ? "Lunas" : "Menunggu"}</span></td><td className="right"><b>{money.format(invoice.amount)}</b></td></tr>)}</tbody></table></div>}</article></section>}

      {active === "Penjualan SaaS" && data.platformAdmin && <section className="saas-sales-layout">
        <article className="data-panel"><div className="panel-header"><div><h2>Link checkout OrderHero</h2><p>Tempel link form order masing-masing produk. Landing page langsung memakai link ini.</p></div></div><form onSubmit={(event)=>{event.preventDefault();void submit("update-orderhero-settings",Object.fromEntries(new FormData(event.currentTarget)));}}><div className="settings-fields"><Field label="Starter"><input name="starter_url" type="url" defaultValue={data.platformSettings.starter_url} placeholder="https://..."/></Field><Field label="Pro"><input name="pro_url" type="url" defaultValue={data.platformSettings.pro_url} placeholder="https://..."/></Field><Field label="Business"><input name="business_url" type="url" defaultValue={data.platformSettings.business_url} placeholder="https://..."/></Field><Field label="WhatsApp bantuan"><input name="support_whatsapp" defaultValue={data.platformSettings.support_whatsapp} placeholder="628xxxxxxxxxx"/></Field></div><button className="settings-save" disabled={saving}>Simpan integrasi</button></form><div className="integration-note"><ShieldCheck size={16}/><p>Pembayaran tetap diproses dan diverifikasi oleh OrderHero. Dashboard ini hanya menghubungkan invoice ke workspace pelanggan.</p></div></article>
        <article className="data-panel billing-history"><div className="panel-header"><div><h2>Antrean aktivasi</h2><p>Setujui hanya setelah invoice terlihat lunas di dashboard OrderHero.</p></div><span className="paid-badge">{data.subscriptionClaims.filter((claim)=>claim.status==="payment_review").length} perlu dicek</span></div>{!data.subscriptionClaims.length?<Empty icon={CreditCard} title="Belum ada pembelian" text="Order yang dimulai dari landing page akan tampil di sini."/>:<div className="table-scroll"><table><thead><tr><th>Referensi</th><th>Pembeli</th><th>Paket</th><th>Invoice OrderHero</th><th>Status</th><th className="right">Aksi</th></tr></thead><tbody>{data.subscriptionClaims.map((claim)=><tr key={claim.id}><td><b>{claim.checkoutReference}</b><small className="table-sub">{dateTime(claim.createdAt)}</small></td><td><b>{claim.buyerName}</b><small className="table-sub">{claim.buyerEmail} · {claim.buyerPhone}</small></td><td className="capitalize">{claim.plan} · {claim.interval === "yearly" ? "Tahunan" : "Bulanan"}<small className="table-sub">{money.format(claim.amount)}</small></td><td>{claim.orderHeroInvoice || "Belum dikirim"}</td><td><span className={claim.status==="activated"||claim.status==="paid"?"stock-chip":"stock-chip low"}>{claim.status.replaceAll("_"," ")}</span></td><td className="right">{claim.status==="payment_review"?<div className="review-actions"><button onClick={()=>void submit("review-orderhero",{claimId:claim.id,decision:"reject"})}>Tolak</button><button onClick={()=>void submit("review-orderhero",{claimId:claim.id,decision:"approve"})}>Setujui</button></div>:"–"}</td></tr>)}</tbody></table></div>}</article>
      </section>}

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && setModal(null)}><div className="modal-card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><h2>{modal === "expense" ? "Catat biaya" : modal === "restock" ? "Stok bahan masuk" : modal === "product" ? "Tambah produk" : modal === "member" ? "Tambah anggota tim" : modal === "branch" ? "Tambah outlet" : modal === "plan" ? "Pilih paket" : "Tutup shift"}</h2><p>{modal === "close" ? "Hitung uang tunai fisik sebelum menyimpan." : modal === "plan" ? "Tagihan dibuat setelah paket dipilih." : "Data akan langsung masuk ke workspace bisnis."}</p></div><button onClick={() => setModal(null)}><X size={19} /></button></div>
        {modal === "expense" && <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void submit("create-expense", Object.fromEntries(form)); }}><div className="form-grid"><Field label="Kategori"><select name="category"><option>Operasional</option><option>Bahan bakar</option><option>Transportasi</option><option>Maintenance</option><option>Marketing</option><option>Gaji</option></select></Field><Field label="Nominal"><input name="amount" type="number" min="1" required placeholder="0" /></Field><Field label="Pembayaran"><select name="paymentMethod"><option>Tunai</option><option>Transfer</option><option>QRIS</option></select></Field><Field label="Tanggal"><input name="transactionDate" type="date" defaultValue={today} required /></Field><Field label="Keterangan"><input name="note" required placeholder="Contoh: Gas LPG" /></Field></div><button className="submit-button" disabled={saving}>{saving ? "Menyimpan…" : "Simpan biaya"}</button></form>}
        {modal === "restock" && <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void submit("restock", Object.fromEntries(form)); }}><div className="form-grid"><Field label="Bahan"><select name="ingredientId" required>{data.ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></Field><Field label="Jumlah masuk"><input name="quantity" type="number" min="0.01" step="0.01" required placeholder="0" /></Field><Field label="Harga per satuan"><input name="unitCost" type="number" min="0" step="0.01" placeholder="0" /></Field><Field label="Supplier"><input name="supplier" placeholder="Nama supplier" /></Field><Field label="Catatan"><input name="note" placeholder="No. nota / catatan" /></Field></div><button className="submit-button" disabled={saving}>{saving ? "Menyimpan…" : "Simpan stok masuk"}</button></form>}
        {modal === "product" && <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void submit("create-product", Object.fromEntries(form)); }}><div className="form-grid"><Field label="Nama produk"><input name="name" required placeholder="Contoh: Latte Gula Aren" /></Field><Field label="SKU"><input name="sku" placeholder="Otomatis jika kosong" /></Field><Field label="Kategori"><select name="category"><option>Coffee</option><option>Non Coffee</option><option>Food</option><option>Pastry</option></select></Field><Field label="Harga jual"><input name="price" type="number" min="1" required placeholder="0" /></Field><Field label="HPP"><input name="cost" type="number" min="0" placeholder="0" /></Field></div><button className="submit-button" disabled={saving}>{saving ? "Menyimpan…" : "Tambah produk"}</button></form>}
        {modal === "close" && <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void submit("close-shift", Object.fromEntries(form)); }}><Field label="Uang tunai aktual"><input name="actualCash" type="number" min="0" required placeholder="Hitung uang di laci kas" /></Field><button className="submit-button" disabled={saving}>{saving ? "Menghitung…" : "Rekonsiliasi & tutup shift"}</button></form>}
        {modal === "member" && <form onSubmit={(event)=>{event.preventDefault();void submit("create-member",Object.fromEntries(new FormData(event.currentTarget)));}}><div className="form-grid"><Field label="Nama"><input name="name" required placeholder="Nama anggota"/></Field><Field label="Email akun"><input name="email" type="email" required placeholder="nama@email.com"/></Field><Field label="Peran"><select name="role"><option value="cashier">Kasir</option><option value="inventory">Gudang / stok</option><option value="manager">Manager</option></select></Field></div><div className="permission-preview"><ShieldCheck size={16}/><p>Anggota bisa masuk menggunakan email yang sama. Akses mereka otomatis mengikuti peran.</p></div><button className="submit-button" disabled={saving}>{saving?"Menambahkan…":"Tambahkan ke tim"}</button></form>}
        {modal === "branch" && <form onSubmit={(event)=>{event.preventDefault();void submit("create-branch",Object.fromEntries(new FormData(event.currentTarget)));}}><div className="form-grid"><Field label="Nama outlet"><input name="name" required placeholder="Contoh: Outlet Jakarta"/></Field><Field label="Kode outlet"><input name="code" placeholder="Otomatis jika kosong"/></Field><Field label="Alamat"><input name="address" placeholder="Alamat outlet"/></Field></div><button className="submit-button" disabled={saving}>{saving?"Menambahkan…":"Tambah outlet"}</button></form>}
        {modal === "plan" && <form onSubmit={(event)=>{event.preventDefault();const form=new FormData(event.currentTarget);window.location.href=`/order?plan=${form.get("plan")}`;}}><div className="plan-picker"><label><input type="radio" name="plan" value="starter" defaultChecked={data.workspace.plan==="starter"}/><span><b>Starter</b><small>1 outlet · 2 pengguna</small></span><strong>Rp99.000</strong></label><label><input type="radio" name="plan" value="pro" defaultChecked={data.workspace.plan==="pro"}/><span><b>Pro</b><small>3 outlet · 10 pengguna</small></span><strong>Rp199.000</strong></label><label><input type="radio" name="plan" value="business" defaultChecked={data.workspace.plan==="business"}/><span><b>Business</b><small>Multi-outlet · tim besar</small></span><strong>Rp399.000</strong></label></div><p className="billing-disclaimer">Pembayaran QRIS, VA, dan e-wallet diproses aman melalui OrderHero. Setelah bayar, gunakan halaman aktivasi dan masukkan nomor invoice.</p><button className="submit-button">Lanjut ke OrderHero</button></form>}
      </div></div>}
      {receipt && <div className="receipt-backdrop"><div className="receipt-dialog"><div className="receipt-actions"><button onClick={()=>setReceipt(null)}><X size={16}/>Tutup</button><button onClick={()=>window.print()}><ReceiptText size={16}/>Cetak struk</button></div><article className="receipt-paper"><div className="receipt-logo"><Coffee size={24}/><h2>{receipt.business}</h2><p>{receipt.branch}</p></div><div className="receipt-meta"><span>{receipt.orderNo}</span><span>{new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date())}</span></div>{receipt.customerName&&<p className="receipt-customer">Pelanggan: {receipt.customerName}</p>}<div className="receipt-items">{receipt.items.map((item,index)=><div key={`${item.name}-${index}`}><span>{item.name}<small>{number.format(item.quantity)} × {money.format(item.unitPrice)}</small></span><b>{money.format(item.subtotal)}</b></div>)}</div><div className="receipt-total"><span>Total</span><b>{money.format(receipt.total)}</b></div><div className="receipt-payment"><span>Pembayaran</span><b>{receipt.paymentMethod}</b></div><footer>Terima kasih sudah membeli.<br/>Simpan struk ini sebagai bukti transaksi.</footer></article></div></div>}
    </>
  );
}
