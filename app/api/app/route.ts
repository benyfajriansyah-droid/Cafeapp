import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import {
  branches,
  billingInvoices,
  expenses,
  ingredients,
  members,
  orderItems,
  orders,
  platformSettings,
  products,
  recipes,
  shifts,
  stockMovements,
  subscriptionClaims,
  workspaces,
} from "../../../db/schema";

const PLATFORM_ADMIN_EMAIL = "beny.fajriansyah@gmail.com";

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function todayAt(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan";
  if (message.includes("no such table")) {
    return "Database sedang disiapkan. Coba muat ulang beberapa saat lagi.";
  }
  return message;
}

async function getContext(email: string) {
  const db = getDb();
  let workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.ownerEmail, email) });

  if (!workspace) {
    const membership = await db.query.members.findFirst({ where: and(eq(members.email, email), eq(members.status, "active")) });
    if (membership) workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, membership.workspaceId) });
  }

  if (!workspace) {
    const workspaceId = id("ws");
    const branchId = id("br");
    const trialEnds = new Date(); trialEnds.setDate(trialEnds.getDate() + 14);
    await db.insert(workspaces).values({ id: workspaceId, ownerEmail: email, name: "Usaha Kopi Saya", slug: `coffee-${Date.now().toString().slice(-6)}`, onboardingCompleted: false, trialEndsAt: trialEnds.toISOString() });
    await db.insert(branches).values({ id: branchId, workspaceId, name: "Outlet Pertama", code: "OUT-01", address: "Indonesia" });
    await db.insert(members).values({ id: id("mem"), workspaceId, email, name: email.split("@")[0], role: "owner", invitedBy: email });

    const seededProducts = [
      { id: id("prd"), name: "Kopi Susu Famz", sku: "KSF-01", category: "Coffee", price: 18000, cost: 5700 },
      { id: id("prd"), name: "Americano Aren", sku: "AMA-01", category: "Coffee", price: 15000, cost: 4200 },
      { id: id("prd"), name: "Matcha Cream", sku: "MTC-01", category: "Non Coffee", price: 20000, cost: 6900 },
      { id: id("prd"), name: "Chocolate Sea Salt", sku: "CSS-01", category: "Non Coffee", price: 21000, cost: 7400 },
      { id: id("prd"), name: "Croissant Butter", sku: "CRB-01", category: "Pastry", price: 18000, cost: 8500 },
      { id: id("prd"), name: "Rice Bowl Chicken", sku: "RBC-01", category: "Food", price: 28000, cost: 13700 },
    ];
    await db.insert(products).values(seededProducts.map((product) => ({ ...product, workspaceId })));

    const seededIngredients = [
      { id: id("ing"), name: "Biji kopi house blend", unit: "gram", stockQty: 1200, minimumStock: 1500, averageCost: 220, supplier: "Roastery Partner" },
      { id: id("ing"), name: "Fresh milk", unit: "ml", stockQty: 3500, minimumStock: 5000, averageCost: 19, supplier: "Supplier Harian" },
      { id: id("ing"), name: "Gula aren", unit: "ml", stockQty: 5200, minimumStock: 2000, averageCost: 26, supplier: "Dapur Aren" },
      { id: id("ing"), name: "Bubuk matcha", unit: "gram", stockQty: 680, minimumStock: 250, averageCost: 540, supplier: "Tea Supply" },
      { id: id("ing"), name: "Cup 16 oz", unit: "pcs", stockQty: 42, minimumStock: 150, averageCost: 1150, supplier: "Packaging Hub" },
      { id: id("ing"), name: "Es batu", unit: "gram", stockQty: 18000, minimumStock: 7000, averageCost: 2, supplier: "Internal" },
    ];
    await db.insert(ingredients).values(seededIngredients.map((ingredient) => ({ ...ingredient, workspaceId })));

    const coffee = seededIngredients[0];
    const milk = seededIngredients[1];
    const aren = seededIngredients[2];
    const matcha = seededIngredients[3];
    const cup = seededIngredients[4];
    await db.insert(recipes).values([
      { id: id("rcp"), workspaceId, productId: seededProducts[0].id, ingredientId: coffee.id, quantity: 18 },
      { id: id("rcp"), workspaceId, productId: seededProducts[0].id, ingredientId: milk.id, quantity: 120 },
      { id: id("rcp"), workspaceId, productId: seededProducts[0].id, ingredientId: aren.id, quantity: 25 },
      { id: id("rcp"), workspaceId, productId: seededProducts[0].id, ingredientId: cup.id, quantity: 1 },
      { id: id("rcp"), workspaceId, productId: seededProducts[1].id, ingredientId: coffee.id, quantity: 18 },
      { id: id("rcp"), workspaceId, productId: seededProducts[1].id, ingredientId: aren.id, quantity: 20 },
      { id: id("rcp"), workspaceId, productId: seededProducts[1].id, ingredientId: cup.id, quantity: 1 },
      { id: id("rcp"), workspaceId, productId: seededProducts[2].id, ingredientId: matcha.id, quantity: 8 },
      { id: id("rcp"), workspaceId, productId: seededProducts[2].id, ingredientId: milk.id, quantity: 140 },
      { id: id("rcp"), workspaceId, productId: seededProducts[2].id, ingredientId: cup.id, quantity: 1 },
    ]);

    await db.insert(expenses).values([
      { id: id("exp"), workspaceId, branchId, category: "Bahan bakar", amount: 23000, paymentMethod: "Tunai", note: "Gas LPG", transactionDate: new Date().toISOString().slice(0, 10) },
      { id: id("exp"), workspaceId, branchId, category: "Operasional", amount: 85000, paymentMethod: "Transfer", note: "Air galon & tissue", transactionDate: new Date().toISOString().slice(0, 10) },
      { id: id("exp"), workspaceId, branchId, category: "Transportasi", amount: 45000, paymentMethod: "Tunai", note: "Ongkir bahan", transactionDate: new Date().toISOString().slice(0, 10) },
    ]);

    const demoOrders = [
      { product: seededProducts[0], qty: 3, method: "QRIS", hour: 8, minute: 12 },
      { product: seededProducts[1], qty: 2, method: "Tunai", hour: 8, minute: 44 },
      { product: seededProducts[2], qty: 2, method: "QRIS", hour: 9, minute: 18 },
      { product: seededProducts[0], qty: 4, method: "Debit", hour: 9, minute: 52 },
      { product: seededProducts[4], qty: 3, method: "Tunai", hour: 10, minute: 16 },
      { product: seededProducts[5], qty: 2, method: "QRIS", hour: 10, minute: 36 },
    ];
    for (let index = 0; index < demoOrders.length; index += 1) {
      const demo = demoOrders[index];
      const orderId = id("ord");
      const total = demo.product.price * demo.qty;
      await db.insert(orders).values({ id: orderId, workspaceId, branchId, orderNo: `FZ-${String(837 + index).padStart(4, "0")}`, channel: index % 3 === 0 ? "Take away" : "Dine in", paymentMethod: demo.method, subtotal: total, total, createdAt: todayAt(demo.hour, demo.minute) });
      await db.insert(orderItems).values({ id: id("itm"), orderId, productId: demo.product.id, productName: demo.product.name, quantity: demo.qty, unitPrice: demo.product.price, unitCost: demo.product.cost, subtotal: total });
    }
    await db.insert(shifts).values({ id: id("shf"), workspaceId, branchId, cashierName: "Raka", openingCash: 500000, openedAt: todayAt(7, 2) });
    workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
  }

  if (!workspace) throw new Error("Workspace gagal dibuat");
  let currentMember = await db.query.members.findFirst({ where: and(eq(members.workspaceId, workspace.id), eq(members.email, email), eq(members.status, "active")) });
  if (!currentMember && workspace.ownerEmail === email) {
    await db.insert(members).values({ id: id("mem"), workspaceId: workspace.id, email, name: email.split("@")[0], role: "owner", invitedBy: email });
    currentMember = await db.query.members.findFirst({ where: and(eq(members.workspaceId, workspace.id), eq(members.email, email)) });
  }
  if (!currentMember) throw new Error("Akun belum memiliki akses ke bisnis ini");

  if (workspace.ownerEmail === email && workspace.subscriptionStatus !== "active") {
    const paidClaim = await db.query.subscriptionClaims.findFirst({
      where: and(eq(subscriptionClaims.buyerEmail, email), eq(subscriptionClaims.status, "paid")),
    });
    if (paidClaim) {
      const activatedAt = new Date().toISOString();
      await db.update(workspaces).set({ plan: paidClaim.plan, billingInterval: paidClaim.interval, subscriptionStatus: "active" }).where(eq(workspaces.id, workspace.id));
      await db.update(subscriptionClaims).set({ workspaceId: workspace.id, status: "activated", activatedAt }).where(eq(subscriptionClaims.id, paidClaim.id));
      const refreshedWorkspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspace.id) });
      if (refreshedWorkspace) workspace = refreshedWorkspace;
    }
  }
  const branch = await db.query.branches.findFirst({ where: eq(branches.workspaceId, workspace.id) });
  if (!branch) throw new Error("Outlet belum tersedia");
  return { db, workspace, branch, currentMember };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  try {
    const { db, workspace, currentMember } = await getContext(user.email);
    const platformAdmin = user.email === PLATFORM_ADMIN_EMAIL;
    const [branchRows, productRows, ingredientRows, recipeRows, orderRows, itemRows, expenseRows, movementRows, shiftRows, memberRows, billingRows, claimRows, settingRows] = await Promise.all([
      db.select().from(branches).where(eq(branches.workspaceId, workspace.id)),
      db.select().from(products).where(eq(products.workspaceId, workspace.id)).orderBy(products.category, products.name),
      db.select().from(ingredients).where(eq(ingredients.workspaceId, workspace.id)).orderBy(ingredients.name),
      db.select().from(recipes).where(eq(recipes.workspaceId, workspace.id)),
      db.select().from(orders).where(eq(orders.workspaceId, workspace.id)).orderBy(desc(orders.createdAt)).limit(200),
      db.select().from(orderItems).where(inArray(orderItems.orderId, db.select({ id: orders.id }).from(orders).where(eq(orders.workspaceId, workspace.id)))),
      db.select().from(expenses).where(eq(expenses.workspaceId, workspace.id)).orderBy(desc(expenses.transactionDate), desc(expenses.createdAt)).limit(200),
      db.select().from(stockMovements).where(eq(stockMovements.workspaceId, workspace.id)).orderBy(desc(stockMovements.createdAt)).limit(200),
      db.select().from(shifts).where(eq(shifts.workspaceId, workspace.id)).orderBy(desc(shifts.openedAt)).limit(50),
      db.select().from(members).where(eq(members.workspaceId, workspace.id)).orderBy(members.role, members.name),
      db.select().from(billingInvoices).where(eq(billingInvoices.workspaceId, workspace.id)).orderBy(desc(billingInvoices.createdAt)).limit(50),
      platformAdmin
        ? db.select().from(subscriptionClaims).orderBy(desc(subscriptionClaims.createdAt)).limit(200)
        : db.select().from(subscriptionClaims).where(eq(subscriptionClaims.workspaceId, workspace.id)).orderBy(desc(subscriptionClaims.createdAt)).limit(20),
      platformAdmin ? db.select().from(platformSettings) : Promise.resolve([]),
    ]);
    return Response.json({ workspace, currentMember, platformAdmin, platformSettings: Object.fromEntries(settingRows.map((row) => [row.key, row.value])), subscriptionClaims: claimRows, branches: branchRows, products: productRows, ingredients: ingredientRows, recipes: recipeRows, orders: orderRows, orderItems: itemRows, expenses: expenseRows, stockMovements: movementRows, shifts: shiftRows, members: memberRows, billingInvoices: billingRows });
  } catch (error) {
    return Response.json({ error: apiError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const { db, workspace, branch, currentMember } = await getContext(user.email);
    const role = currentMember.role;
    const canManage = role === "owner" || role === "manager";
    const canSell = canManage || role === "cashier";
    const canStock = canManage || role === "inventory";

    if (action === "claim-orderhero") {
      if (role !== "owner") return Response.json({ error: "Hanya owner yang bisa mengaktifkan langganan" }, { status: 403 });
      const checkoutReference = String(body.checkoutReference ?? "").trim().toUpperCase();
      const orderHeroInvoice = String(body.orderHeroInvoice ?? "").trim();
      if (!checkoutReference || !orderHeroInvoice) return Response.json({ error: "Kode checkout dan invoice OrderHero wajib diisi" }, { status: 400 });
      const claim = await db.query.subscriptionClaims.findFirst({ where: eq(subscriptionClaims.checkoutReference, checkoutReference) });
      if (!claim) return Response.json({ error: "Kode checkout tidak ditemukan. Pastikan sama dengan kode sebelum pembayaran." }, { status: 404 });
      if (["activated", "rejected"].includes(claim.status)) return Response.json({ error: `Pengajuan ini sudah berstatus ${claim.status}` }, { status: 400 });
      await db.update(subscriptionClaims).set({ workspaceId: workspace.id, orderHeroInvoice, status: "payment_review" }).where(eq(subscriptionClaims.id, claim.id));
      await db.update(workspaces).set({ plan: claim.plan, billingInterval: claim.interval, subscriptionStatus: "pending_payment" }).where(eq(workspaces.id, workspace.id));
      return Response.json({ ok: true, message: "Bukti OrderHero masuk antrean verifikasi" });
    }

    if (action === "update-orderhero-settings") {
      if (user.email !== PLATFORM_ADMIN_EMAIL) return Response.json({ error: "Akses admin platform diperlukan" }, { status: 403 });
      const entries = ["starter_url", "pro_url", "business_url", "support_whatsapp"].map((key) => ({ key, value: String(body[key] ?? "").trim(), updatedAt: new Date().toISOString() }));
      for (const entry of entries) {
        if (entry.key.endsWith("_url") && entry.value && !entry.value.startsWith("https://")) return Response.json({ error: "Link checkout harus memakai https://" }, { status: 400 });
        await db.insert(platformSettings).values(entry).onConflictDoUpdate({ target: platformSettings.key, set: { value: entry.value, updatedAt: entry.updatedAt } });
      }
      return Response.json({ ok: true, message: "Link checkout OrderHero disimpan" });
    }

    if (action === "review-orderhero") {
      if (user.email !== PLATFORM_ADMIN_EMAIL) return Response.json({ error: "Akses admin platform diperlukan" }, { status: 403 });
      const claimId = String(body.claimId ?? "");
      const decision = body.decision === "approve" ? "approve" : "reject";
      const claim = await db.query.subscriptionClaims.findFirst({ where: eq(subscriptionClaims.id, claimId) });
      if (!claim) return Response.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
      const now = new Date().toISOString();
      if (decision === "reject") {
        await db.update(subscriptionClaims).set({ status: "rejected", reviewerEmail: user.email, reviewedAt: now }).where(eq(subscriptionClaims.id, claim.id));
        return Response.json({ ok: true, message: "Pengajuan ditolak" });
      }
      const targetWorkspace = claim.workspaceId
        ? await db.query.workspaces.findFirst({ where: eq(workspaces.id, claim.workspaceId) })
        : await db.query.workspaces.findFirst({ where: eq(workspaces.ownerEmail, claim.buyerEmail) });
      if (targetWorkspace) {
        await db.update(workspaces).set({ plan: claim.plan, billingInterval: claim.interval, subscriptionStatus: "active" }).where(eq(workspaces.id, targetWorkspace.id));
        const due = new Date(); due.setDate(due.getDate() + (claim.interval === "yearly" ? 365 : 30));
        await db.insert(billingInvoices).values({ id: id("bil"), workspaceId: targetWorkspace.id, invoiceNo: claim.orderHeroInvoice || claim.checkoutReference, plan: claim.plan, interval: claim.interval, amount: claim.amount, status: "paid", dueDate: due.toISOString().slice(0, 10), paidAt: now, paymentMethod: "OrderHero" });
      }
      await db.update(subscriptionClaims).set({ workspaceId: targetWorkspace?.id ?? claim.workspaceId, status: targetWorkspace ? "activated" : "paid", reviewerEmail: user.email, reviewedAt: now, activatedAt: targetWorkspace ? now : null }).where(eq(subscriptionClaims.id, claim.id));
      return Response.json({ ok: true, message: targetWorkspace ? "Pembayaran disetujui dan paket aktif" : "Pembayaran disetujui; paket aktif saat pembeli masuk" });
    }

    if (action === "create-order") {
      if (!canSell) return Response.json({ error: "Peran lo tidak punya akses kasir" }, { status: 403 });
      const submitted = Array.isArray(body.items) ? body.items as Array<{ productId?: string; quantity?: number }> : [];
      const productRows = await db.select().from(products).where(and(eq(products.workspaceId, workspace.id), eq(products.isActive, true)));
      const items = submitted.map((entry) => {
        const product = productRows.find((row) => row.id === entry.productId);
        const quantity = Math.max(1, Number(entry.quantity ?? 1));
        return product ? { product, quantity } : null;
      }).filter((entry): entry is { product: typeof productRows[number]; quantity: number } => Boolean(entry));
      if (!items.length) return Response.json({ error: "Keranjang masih kosong" }, { status: 400 });
      const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const discount = Math.max(0, Number(body.discount ?? 0));
      const total = Math.max(0, subtotal - discount);
      const orderId = id("ord");
      const orderNo = `FZ-${String(Date.now()).slice(-6)}`;
      await db.insert(orders).values({ id: orderId, workspaceId: workspace.id, branchId: branch.id, orderNo, channel: String(body.channel ?? "Dine in"), paymentMethod: String(body.paymentMethod ?? "QRIS"), subtotal, discount, total, customerName: String(body.customerName ?? ""), customerPhone: String(body.customerPhone ?? ""), notes: String(body.notes ?? "") });
      await db.insert(orderItems).values(items.map((item) => ({ id: id("itm"), orderId, productId: item.product.id, productName: item.product.name, quantity: item.quantity, unitPrice: item.product.price, unitCost: item.product.cost, subtotal: item.product.price * item.quantity })));
      for (const item of items) {
        const recipeRows = await db.select().from(recipes).where(and(eq(recipes.workspaceId, workspace.id), eq(recipes.productId, item.product.id)));
        for (const recipe of recipeRows) {
          const used = recipe.quantity * item.quantity;
          await db.update(ingredients).set({ stockQty: sql`${ingredients.stockQty} - ${used}` }).where(and(eq(ingredients.id, recipe.ingredientId), eq(ingredients.workspaceId, workspace.id)));
          await db.insert(stockMovements).values({ id: id("mov"), workspaceId: workspace.id, branchId: branch.id, ingredientId: recipe.ingredientId, type: "usage", quantity: -used, note: orderNo });
        }
      }
      return Response.json({ ok: true, orderNo, total, orderId, items: items.map((item) => ({ name: item.product.name, quantity: item.quantity, unitPrice: item.product.price, subtotal: item.product.price * item.quantity })), business: workspace.name, branch: branch.name, paymentMethod: String(body.paymentMethod ?? "QRIS"), customerName: String(body.customerName ?? "") });
    }

    if (action === "create-expense") {
      if (!canManage) return Response.json({ error: "Hanya owner atau manager yang bisa mencatat biaya" }, { status: 403 });
      const amount = Number(body.amount ?? 0);
      if (!(amount > 0)) return Response.json({ error: "Nominal biaya harus lebih dari 0" }, { status: 400 });
      await db.insert(expenses).values({ id: id("exp"), workspaceId: workspace.id, branchId: branch.id, category: String(body.category ?? "Operasional"), amount, paymentMethod: String(body.paymentMethod ?? "Tunai"), note: String(body.note ?? ""), transactionDate: String(body.transactionDate ?? new Date().toISOString().slice(0, 10)) });
      return Response.json({ ok: true });
    }

    if (action === "restock") {
      if (!canStock) return Response.json({ error: "Peran lo tidak punya akses stok" }, { status: 403 });
      const ingredientId = String(body.ingredientId ?? "");
      const quantity = Number(body.quantity ?? 0);
      const unitCost = Number(body.unitCost ?? 0);
      const ingredient = await db.query.ingredients.findFirst({ where: and(eq(ingredients.id, ingredientId), eq(ingredients.workspaceId, workspace.id)) });
      if (!ingredient || !(quantity > 0)) return Response.json({ error: "Bahan atau jumlah tidak valid" }, { status: 400 });
      const newAverage = unitCost > 0 ? ((ingredient.stockQty * ingredient.averageCost) + (quantity * unitCost)) / Math.max(1, ingredient.stockQty + quantity) : ingredient.averageCost;
      await db.update(ingredients).set({ stockQty: sql`${ingredients.stockQty} + ${quantity}`, averageCost: newAverage, supplier: String(body.supplier ?? ingredient.supplier) }).where(eq(ingredients.id, ingredient.id));
      await db.insert(stockMovements).values({ id: id("mov"), workspaceId: workspace.id, branchId: branch.id, ingredientId: ingredient.id, type: "purchase", quantity, unitCost, supplier: String(body.supplier ?? ""), note: String(body.note ?? "") });
      return Response.json({ ok: true });
    }

    if (action === "create-product") {
      if (!canManage) return Response.json({ error: "Hanya owner atau manager yang bisa mengubah produk" }, { status: 403 });
      const name = String(body.name ?? "").trim();
      const price = Number(body.price ?? 0);
      if (!name || !(price > 0)) return Response.json({ error: "Nama dan harga jual wajib diisi" }, { status: 400 });
      await db.insert(products).values({ id: id("prd"), workspaceId: workspace.id, name, sku: String(body.sku ?? `SKU-${Date.now().toString().slice(-5)}`), category: String(body.category ?? "Coffee"), price, cost: Number(body.cost ?? 0) });
      return Response.json({ ok: true });
    }

    if (action === "close-shift") {
      if (!canSell) return Response.json({ error: "Peran lo tidak punya akses shift" }, { status: 403 });
      const activeShift = await db.query.shifts.findFirst({ where: and(eq(shifts.workspaceId, workspace.id), eq(shifts.status, "open")) });
      if (!activeShift) return Response.json({ error: "Tidak ada shift aktif" }, { status: 400 });
      const actualCash = Number(body.actualCash ?? 0);
      const cashSales = await db.select({ total: sql<number>`coalesce(sum(${orders.total}), 0)` }).from(orders).where(and(eq(orders.workspaceId, workspace.id), eq(orders.paymentMethod, "Tunai"), sql`${orders.createdAt} >= ${activeShift.openedAt}`));
      const expected = activeShift.openingCash + Number(cashSales[0]?.total ?? 0);
      await db.update(shifts).set({ status: "closed", actualCash, variance: actualCash - expected, closedAt: new Date().toISOString() }).where(eq(shifts.id, activeShift.id));
      return Response.json({ ok: true, expected, variance: actualCash - expected });
    }

    if (action === "complete-onboarding") {
      if (role !== "owner") return Response.json({ error: "Hanya owner yang bisa menyelesaikan onboarding" }, { status: 403 });
      const businessName = String(body.businessName ?? "").trim();
      const outletName = String(body.outletName ?? "").trim();
      if (!businessName || !outletName) return Response.json({ error: "Nama bisnis dan outlet wajib diisi" }, { status: 400 });
      const selectedPlan = ["starter", "pro", "business"].includes(String(body.plan)) ? String(body.plan) : "pro";
      await db.update(workspaces).set({ name: businessName, phone: String(body.phone ?? ""), businessType: String(body.businessType ?? "coffee-home"), taxPercent: Math.max(0, Number(body.taxPercent ?? 0)), plan: selectedPlan, onboardingCompleted: true }).where(eq(workspaces.id, workspace.id));
      await db.update(branches).set({ name: outletName, address: String(body.address ?? "") }).where(eq(branches.id, branch.id));
      return Response.json({ ok: true });
    }

    if (action === "update-settings") {
      if (role !== "owner") return Response.json({ error: "Hanya owner yang bisa mengubah pengaturan bisnis" }, { status: 403 });
      const businessName = String(body.businessName ?? "").trim();
      if (!businessName) return Response.json({ error: "Nama bisnis wajib diisi" }, { status: 400 });
      await db.update(workspaces).set({ name: businessName, phone: String(body.phone ?? ""), businessType: String(body.businessType ?? workspace.businessType), taxPercent: Math.max(0, Number(body.taxPercent ?? workspace.taxPercent)) }).where(eq(workspaces.id, workspace.id));
      return Response.json({ ok: true });
    }

    if (action === "create-member") {
      if (!canManage) return Response.json({ error: "Hanya owner atau manager yang bisa menambah tim" }, { status: 403 });
      const memberEmail = String(body.email ?? "").trim().toLowerCase();
      const memberRole = ["manager", "cashier", "inventory"].includes(String(body.role)) ? String(body.role) : "cashier";
      if (!memberEmail.includes("@")) return Response.json({ error: "Email anggota tim tidak valid" }, { status: 400 });
      const memberRows = await db.select().from(members).where(eq(members.workspaceId, workspace.id));
      const limits: Record<string, number> = { starter: 2, pro: 10, business: 999 };
      if (memberRows.length >= (limits[workspace.plan] ?? 10)) return Response.json({ error: `Paket ${workspace.plan} sudah mencapai batas pengguna` }, { status: 400 });
      const exists = memberRows.some((member) => member.email === memberEmail);
      if (exists) return Response.json({ error: "Email ini sudah terdaftar di tim" }, { status: 400 });
      await db.insert(members).values({ id: id("mem"), workspaceId: workspace.id, email: memberEmail, name: String(body.name ?? ""), role: memberRole, invitedBy: user.email });
      return Response.json({ ok: true });
    }

    if (action === "create-branch") {
      if (role !== "owner") return Response.json({ error: "Hanya owner yang bisa menambah cabang" }, { status: 403 });
      const branchRows = await db.select().from(branches).where(eq(branches.workspaceId, workspace.id));
      const limits: Record<string, number> = { starter: 1, pro: 3, business: 999 };
      if (branchRows.length >= (limits[workspace.plan] ?? 3)) return Response.json({ error: `Paket ${workspace.plan} sudah mencapai batas outlet` }, { status: 400 });
      const name = String(body.name ?? "").trim();
      if (!name) return Response.json({ error: "Nama outlet wajib diisi" }, { status: 400 });
      await db.insert(branches).values({ id: id("br"), workspaceId: workspace.id, name, code: String(body.code ?? `OUT-${String(branchRows.length + 1).padStart(2, "0")}`), address: String(body.address ?? "") });
      return Response.json({ ok: true });
    }

    if (action === "select-plan") {
      if (role !== "owner") return Response.json({ error: "Hanya owner yang bisa memilih paket" }, { status: 403 });
      const plan = String(body.plan ?? "");
      const interval = body.interval === "yearly" ? "yearly" : "monthly";
      const prices: Record<string, { monthly: number; yearly: number }> = { starter: { monthly: 99000, yearly: 990000 }, pro: { monthly: 199000, yearly: 1990000 }, business: { monthly: 399000, yearly: 3990000 } };
      if (!prices[plan]) return Response.json({ error: "Paket tidak tersedia" }, { status: 400 });
      const due = new Date(); due.setDate(due.getDate() + 1);
      const invoiceNo = `SUB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      await db.insert(billingInvoices).values({ id: id("bil"), workspaceId: workspace.id, invoiceNo, plan, interval, amount: prices[plan][interval], dueDate: due.toISOString().slice(0, 10) });
      await db.update(workspaces).set({ plan, billingInterval: interval, subscriptionStatus: "pending_payment" }).where(eq(workspaces.id, workspace.id));
      return Response.json({ ok: true, invoiceNo });
    }

    return Response.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: apiError(error) }, { status: 500 });
  }
}
