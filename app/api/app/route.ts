import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
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
import {
  actionAllowedWhenLocked,
  entitlementOf,
  isPlanId,
  limitsFor,
  normalizeInterval,
  periodEndFrom,
  planPrice,
  PLANS,
  TRIAL_DAYS,
  type Entitlement,
} from "../../lib/plans";
import { calculateOrder, clampPercent, positiveRupiah, rupiah, weightedAverageCost } from "../../lib/money";
import { isPlatformAdmin, safeErrorMessage, UserFacingError } from "../../lib/platform";
import { seedDemoWorkspace } from "../../lib/demo-data";

type Db = ReturnType<typeof getDb>;
type Workspace = typeof workspaces.$inferSelect;
type Branch = typeof branches.$inferSelect;
type Member = typeof members.$inferSelect;

type Context = {
  db: Db;
  workspace: Workspace;
  branch: Branch;
  branchList: Branch[];
  currentMember: Member;
  entitlement: Entitlement;
  email: string;
  platformAdmin: boolean;
};

const LIST_LIMIT = 100;

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function text(value: unknown, fallback = "") {
  const parsed = String(value ?? "").trim();
  return parsed || fallback;
}

function fail(message: string, status = 400): never {
  throw new UserFacingError(message, status);
}

/* ------------------------------------------------------------------ *
 * Konteks & hak akses
 * ------------------------------------------------------------------ */

async function getContext(email: string, requestedBranchId?: string): Promise<Context> {
  const db = getDb();
  let workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.ownerEmail, email) });

  if (!workspace) {
    const membership = await db.query.members.findFirst({ where: and(eq(members.email, email), eq(members.status, "active")) });
    if (membership) workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, membership.workspaceId) });
  }

  if (!workspace) {
    // Workspace baru dibuat kosong. Data contoh cuma masuk kalau diminta saat onboarding,
    // supaya laporan pertama pelanggan tidak tercampur transaksi yang tidak pernah terjadi.
    const workspaceId = id("ws");
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);
    await db.insert(workspaces).values({
      id: workspaceId, ownerEmail: email, name: "Usaha Kopi Saya",
      slug: `coffee-${Date.now().toString(36)}`, onboardingCompleted: false,
      trialEndsAt: trialEnds.toISOString(),
    });
    await db.insert(branches).values({ id: id("br"), workspaceId, name: "Outlet Pertama", code: "OUT-01", address: "" });
    await db.insert(members).values({ id: id("mem"), workspaceId, email, name: email.split("@")[0], role: "owner", invitedBy: email });
    workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
  }

  if (!workspace) fail("Workspace gagal dibuat", 500);

  let currentMember = await db.query.members.findFirst({
    where: and(eq(members.workspaceId, workspace.id), eq(members.email, email), eq(members.status, "active")),
  });
  if (!currentMember && workspace.ownerEmail === email) {
    await db.insert(members).values({ id: id("mem"), workspaceId: workspace.id, email, name: email.split("@")[0], role: "owner", invitedBy: email });
    currentMember = await db.query.members.findFirst({
      where: and(eq(members.workspaceId, workspace.id), eq(members.email, email)),
    });
  }
  if (!currentMember) fail("Akun ini belum punya akses ke bisnis mana pun", 403);

  workspace = await applyVerifiedPayment(db, workspace, email);

  const branchList = await db.select().from(branches).where(eq(branches.workspaceId, workspace.id)).orderBy(branches.createdAt);
  const activeBranches = branchList.filter((row) => row.isActive);
  if (!branchList.length) fail("Outlet belum tersedia", 500);

  const requested = requestedBranchId ? branchList.find((row) => row.id === requestedBranchId) : undefined;
  const branch = requested ?? activeBranches[0] ?? branchList[0];

  return {
    db, workspace, branch, branchList, currentMember, email,
    entitlement: entitlementOf(workspace),
    platformAdmin: isPlatformAdmin(email),
  };
}

/**
 * Mengaktifkan paket kalau admin sudah menyetujui pembayaran sebelum pembelinya pernah masuk.
 * Hanya klaim yang emailnya sama persis dengan pemilik workspace yang diterima.
 */
async function applyVerifiedPayment(db: Db, workspace: Workspace, email: string): Promise<Workspace> {
  if (workspace.ownerEmail !== email) return workspace;
  if (workspace.subscriptionStatus === "active" && workspace.paidPlan) return workspace;

  const paidClaim = await db.query.subscriptionClaims.findFirst({
    where: and(eq(subscriptionClaims.buyerEmail, email), eq(subscriptionClaims.status, "paid")),
  });
  if (!paidClaim || !isPlanId(paidClaim.plan)) return workspace;

  const now = new Date();
  const interval = normalizeInterval(paidClaim.interval);
  await db.update(workspaces).set({
    plan: paidClaim.plan, paidPlan: paidClaim.plan, billingInterval: interval,
    subscriptionStatus: "active", currentPeriodEnd: periodEndFrom(now, interval),
  }).where(eq(workspaces.id, workspace.id));
  await db.update(subscriptionClaims).set({
    workspaceId: workspace.id, status: "activated", activatedAt: now.toISOString(),
  }).where(eq(subscriptionClaims.id, paidClaim.id));

  return (await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspace.id) })) ?? workspace;
}

type Capability = "manage" | "sell" | "stock" | "owner" | "admin";

function require_(context: Context, capability: Capability) {
  const role = context.currentMember.role;
  const manage = role === "owner" || role === "manager";
  const allowed =
    capability === "admin" ? context.platformAdmin :
    capability === "owner" ? role === "owner" :
    capability === "manage" ? manage :
    capability === "sell" ? manage || role === "cashier" :
    manage || role === "inventory";

  if (allowed) return;
  if (capability === "admin") fail("Akses admin platform diperlukan", 403);
  if (capability === "owner") fail("Hanya pemilik yang bisa melakukan ini", 403);
  fail("Peran lo nggak punya akses untuk aksi ini", 403);
}

/* ------------------------------------------------------------------ *
 * GET — data workspace
 * ------------------------------------------------------------------ */

function rangeOf(url: URL) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const isDate = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
  return {
    from: isDate(from) ? from : null,
    to: isDate(to) ? to : null,
  };
}

function orderConditions(workspaceId: string, branchId: string | null, range: { from: string | null; to: string | null }) {
  const conditions = [eq(orders.workspaceId, workspaceId), ne(orders.status, "void")];
  if (branchId) conditions.push(eq(orders.branchId, branchId));
  if (range.from) conditions.push(gte(orders.createdAt, `${range.from}T00:00:00.000Z`));
  if (range.to) conditions.push(lte(orders.createdAt, `${range.to}T23:59:59.999Z`));
  return conditions;
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const context = await getContext(user.email, url.searchParams.get("branch") ?? undefined);
    const { db, workspace, branch, branchList, currentMember, entitlement, platformAdmin } = context;

    const range = rangeOf(url);
    const scopeAllBranches = url.searchParams.get("branch") === "all";
    const branchFilter = scopeAllBranches ? null : branch.id;
    const orderWhere = and(...orderConditions(workspace.id, branchFilter, range));

    const expenseWhere = and(
      eq(expenses.workspaceId, workspace.id),
      ...(branchFilter ? [eq(expenses.branchId, branchFilter)] : []),
      ...(range.from ? [gte(expenses.transactionDate, range.from)] : []),
      ...(range.to ? [lte(expenses.transactionDate, range.to)] : []),
    );

    // Ringkasan keuangan dihitung di database atas rentang yang sama persis untuk penjualan,
    // HPP, dan biaya. Menghitungnya dari daftar yang sudah dipotong `limit` membuat laba kotor
    // salah begitu transaksinya lebih banyak dari batas itu.
    const [salesRow] = await db
      .select({
        sales: sql<number>`coalesce(sum(${orders.total}), 0)`,
        discount: sql<number>`coalesce(sum(${orders.discount}), 0)`,
        tax: sql<number>`coalesce(sum(${orders.tax}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(orders)
      .where(orderWhere);

    const [cogsRow] = await db
      .select({ cogs: sql<number>`coalesce(sum(${orderItems.unitCost} * ${orderItems.quantity}), 0)` })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(orderWhere);

    const [expenseRow] = await db
      .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(expenseWhere);

    const paymentBreakdown = await db
      .select({ method: orders.paymentMethod, total: sql<number>`coalesce(sum(${orders.total}), 0)`, count: sql<number>`count(*)` })
      .from(orders).where(orderWhere).groupBy(orders.paymentMethod);

    const hourlySales = await db
      .select({ hour: sql<string>`strftime('%H', ${orders.createdAt})`, total: sql<number>`coalesce(sum(${orders.total}), 0)` })
      .from(orders).where(orderWhere).groupBy(sql`strftime('%H', ${orders.createdAt})`).orderBy(sql`strftime('%H', ${orders.createdAt})`);

    const topProducts = await db
      .select({
        productId: orderItems.productId,
        name: orderItems.productName,
        sold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        revenue: sql<number>`coalesce(sum(${orderItems.subtotal}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(orderWhere)
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(sql`sum(${orderItems.quantity}) desc`)
      .limit(5);

    // Daftar untuk ditampilkan dibatasi; item pesanan hanya diambil untuk pesanan yang
    // benar-benar dikirim, bukan seluruh riwayat workspace.
    const orderRows = await db.select().from(orders)
      .where(and(eq(orders.workspaceId, workspace.id), ...(branchFilter ? [eq(orders.branchId, branchFilter)] : []),
        ...(range.from ? [gte(orders.createdAt, `${range.from}T00:00:00.000Z`)] : []),
        ...(range.to ? [lte(orders.createdAt, `${range.to}T23:59:59.999Z`)] : [])))
      .orderBy(desc(orders.createdAt)).limit(LIST_LIMIT);

    const itemRows = orderRows.length
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderRows.map((row) => row.id)))
      : [];

    const [productRows, ingredientRows, recipeRows, expenseRows, movementRows, shiftRows, memberRows, billingRows] =
      await Promise.all([
        db.select().from(products).where(eq(products.workspaceId, workspace.id)).orderBy(products.category, products.name),
        db.select().from(ingredients).where(eq(ingredients.workspaceId, workspace.id)).orderBy(ingredients.name),
        db.select().from(recipes).where(eq(recipes.workspaceId, workspace.id)),
        db.select().from(expenses).where(expenseWhere).orderBy(desc(expenses.transactionDate), desc(expenses.createdAt)).limit(LIST_LIMIT),
        db.select().from(stockMovements)
          .where(and(eq(stockMovements.workspaceId, workspace.id), ...(branchFilter ? [eq(stockMovements.branchId, branchFilter)] : [])))
          .orderBy(desc(stockMovements.createdAt)).limit(LIST_LIMIT),
        db.select().from(shifts)
          .where(and(eq(shifts.workspaceId, workspace.id), ...(branchFilter ? [eq(shifts.branchId, branchFilter)] : [])))
          .orderBy(desc(shifts.openedAt)).limit(30),
        db.select().from(members).where(eq(members.workspaceId, workspace.id)).orderBy(members.role, members.name),
        db.select().from(billingInvoices).where(eq(billingInvoices.workspaceId, workspace.id)).orderBy(desc(billingInvoices.createdAt)).limit(50),
      ]);

    const [claimRows, settingRows] = await Promise.all([
      platformAdmin
        ? db.select().from(subscriptionClaims).orderBy(desc(subscriptionClaims.createdAt)).limit(200)
        : db.select().from(subscriptionClaims).where(eq(subscriptionClaims.workspaceId, workspace.id)).orderBy(desc(subscriptionClaims.createdAt)).limit(20),
      platformAdmin ? db.select().from(platformSettings) : Promise.resolve([] as Array<typeof platformSettings.$inferSelect>),
    ]);

    const sales = Number(salesRow?.sales ?? 0);
    const cogs = Math.round(Number(cogsRow?.cogs ?? 0));
    const expenseTotal = Number(expenseRow?.total ?? 0);

    return Response.json({
      workspace,
      entitlement,
      limits: limitsFor(entitlement),
      plans: PLANS,
      currentMember,
      platformAdmin,
      activeBranchId: scopeAllBranches ? "all" : branch.id,
      range,
      summary: {
        sales, cogs, expenses: expenseTotal,
        grossProfit: sales - cogs,
        netProfit: sales - cogs - expenseTotal,
        orderCount: Number(salesRow?.count ?? 0),
        discount: Number(salesRow?.discount ?? 0),
        tax: Number(salesRow?.tax ?? 0),
        payments: paymentBreakdown.map((row) => ({ method: row.method, total: Number(row.total), count: Number(row.count) })),
        hourly: hourlySales.map((row) => ({ hour: row.hour, total: Number(row.total) })),
        topProducts: topProducts.map((row) => ({ ...row, sold: Number(row.sold), revenue: Number(row.revenue) })),
      },
      platformSettings: Object.fromEntries(settingRows.map((row) => [row.key, row.value])),
      subscriptionClaims: claimRows,
      branches: branchList,
      products: productRows,
      ingredients: ingredientRows,
      recipes: recipeRows,
      orders: orderRows,
      orderItems: itemRows,
      expenses: expenseRows,
      stockMovements: movementRows,
      shifts: shiftRows,
      members: memberRows,
      billingInvoices: billingRows,
    });
  } catch (error) {
    if (error instanceof UserFacingError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: safeErrorMessage(error, "GET /api/app") }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ *
 * POST — aksi
 * ------------------------------------------------------------------ */

type Body = Record<string, unknown>;
type Handler = (context: Context, body: Body) => Promise<unknown>;

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });

  try {
    const body = await request.json() as Body;
    const action = text(body.action);
    const handler = handlers[action];
    if (!handler) return Response.json({ error: "Aksi tidak dikenali" }, { status: 400 });

    const context = await getContext(user.email, text(body.branchId) || undefined);

    // Satu penjaga untuk seluruh API: langganan mati berarti data operasional tidak boleh
    // berubah lagi. Yang tersisa hanya jalan keluar — memilih paket dan menghubungkan pembayaran.
    if (context.entitlement.locked && !actionAllowedWhenLocked(action)) {
      return Response.json({
        error: "Masa aktif langganan sudah berakhir. Perpanjang paket untuk melanjutkan.",
        locked: true,
      }, { status: 402 });
    }

    return Response.json(await handler(context, body) ?? { ok: true });
  } catch (error) {
    if (error instanceof UserFacingError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: safeErrorMessage(error, "POST /api/app") }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ *
 * Langganan & billing
 * ------------------------------------------------------------------ */

const handlers: Record<string, Handler> = {
  /**
   * Mencatat pilihan paket dan membuat tagihan. Sengaja TIDAK memberikan hak akses:
   * paket baru berlaku setelah pembayarannya diverifikasi lewat `review-orderhero`.
   */
  "select-plan": async (context, body) => {
    require_(context, "owner");
    const plan = text(body.plan);
    if (!isPlanId(plan)) fail("Paket tidak tersedia");
    const interval = normalizeInterval(body.interval);
    const due = new Date();
    due.setDate(due.getDate() + 1);

    await context.db.insert(billingInvoices).values({
      id: id("bil"), workspaceId: context.workspace.id,
      invoiceNo: `SUB-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      plan, interval, amount: planPrice(plan, interval), dueDate: due.toISOString().slice(0, 10),
    });
    await context.db.update(workspaces)
      .set({ plan, billingInterval: interval })
      .where(eq(workspaces.id, context.workspace.id));

    return { ok: true, message: "Tagihan dibuat. Paket aktif setelah pembayaran diverifikasi." };
  },

  /**
   * Menghubungkan pembayaran OrderHero ke workspace pembeli.
   *
   * Klaim hanya boleh diambil oleh orang yang emailnya dipakai saat checkout, dan tidak boleh
   * dipindah kalau sudah menempel di workspace lain. Tanpa dua pemeriksaan ini, siapa pun yang
   * menebak kode checkout bisa membajak pembayaran orang lain.
   */
  "claim-orderhero": async (context, body) => {
    require_(context, "owner");
    const { normalizeCheckoutReference } = await import("../../lib/reference");
    const checkoutReference = normalizeCheckoutReference(body.checkoutReference);
    const orderHeroInvoice = text(body.orderHeroInvoice);
    if (!checkoutReference || !orderHeroInvoice) fail("Kode checkout dan nomor invoice OrderHero wajib diisi");

    const claim = await context.db.query.subscriptionClaims.findFirst({
      where: eq(subscriptionClaims.checkoutReference, checkoutReference),
    });
    if (!claim) fail("Kode checkout tidak ditemukan. Pastikan sama persis dengan kode sebelum pembayaran.", 404);
    if (claim.buyerEmail !== context.email) {
      fail("Kode checkout ini terdaftar atas email lain. Masuk memakai email yang dipakai saat checkout.", 403);
    }
    if (claim.workspaceId && claim.workspaceId !== context.workspace.id) {
      fail("Pembayaran ini sudah terhubung ke workspace lain.", 409);
    }
    if (claim.status === "activated" || claim.status === "rejected") {
      fail(`Pengajuan ini sudah berstatus ${claim.status.replace(/_/g, " ")}`);
    }

    await context.db.update(subscriptionClaims).set({
      workspaceId: context.workspace.id, orderHeroInvoice, status: "payment_review",
    }).where(eq(subscriptionClaims.id, claim.id));

    return { ok: true, message: "Bukti pembayaran masuk antrean verifikasi" };
  },

  "update-orderhero-settings": async (context, body) => {
    require_(context, "admin");
    const keys = ["starter_url", "pro_url", "business_url", "support_whatsapp"];
    for (const key of keys) {
      const value = text(body[key]);
      if (key.endsWith("_url") && value && !value.startsWith("https://")) fail("Link checkout harus memakai https://");
      await context.db.insert(platformSettings)
        .values({ key, value, updatedAt: new Date().toISOString() })
        .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date().toISOString() } });
    }
    return { ok: true, message: "Pengaturan checkout disimpan" };
  },

  /** Satu-satunya jalan sebuah workspace mendapat paket berbayar. */
  "review-orderhero": async (context, body) => {
    require_(context, "admin");
    const claimId = text(body.claimId);
    const approve = body.decision === "approve";
    const claim = await context.db.query.subscriptionClaims.findFirst({ where: eq(subscriptionClaims.id, claimId) });
    if (!claim) fail("Pengajuan tidak ditemukan", 404);

    const now = new Date();
    const timestamp = now.toISOString();
    const note = text(body.note);

    if (!approve) {
      await context.db.update(subscriptionClaims)
        .set({ status: "rejected", reviewerEmail: context.email, reviewedAt: timestamp, reviewNote: note })
        .where(eq(subscriptionClaims.id, claim.id));
      return { ok: true, message: "Pengajuan ditolak" };
    }

    if (!isPlanId(claim.plan)) fail("Paket pada pengajuan ini tidak dikenali");
    const interval = normalizeInterval(claim.interval);

    const target = claim.workspaceId
      ? await context.db.query.workspaces.findFirst({ where: eq(workspaces.id, claim.workspaceId) })
      : await context.db.query.workspaces.findFirst({ where: eq(workspaces.ownerEmail, claim.buyerEmail) });

    if (target) {
      await context.db.update(workspaces).set({
        plan: claim.plan, paidPlan: claim.plan, billingInterval: interval,
        subscriptionStatus: "active", currentPeriodEnd: periodEndFrom(now, interval),
      }).where(eq(workspaces.id, target.id));
      await context.db.insert(billingInvoices).values({
        id: id("bil"), workspaceId: target.id,
        invoiceNo: claim.orderHeroInvoice || claim.checkoutReference,
        plan: claim.plan, interval, amount: claim.amount, status: "paid",
        dueDate: timestamp.slice(0, 10), paidAt: timestamp, paymentMethod: "OrderHero",
      });
    }

    await context.db.update(subscriptionClaims).set({
      workspaceId: target?.id ?? claim.workspaceId,
      status: target ? "activated" : "paid",
      reviewerEmail: context.email, reviewedAt: timestamp, reviewNote: note,
      activatedAt: target ? timestamp : null,
    }).where(eq(subscriptionClaims.id, claim.id));

    return { ok: true, message: target ? "Pembayaran disetujui dan paket aktif" : "Pembayaran disetujui; paket aktif saat pembeli masuk" };
  },

  /* ---------------------------------------------------------------- *
   * Onboarding & pengaturan
   * ---------------------------------------------------------------- */

  "complete-onboarding": async (context, body) => {
    require_(context, "owner");
    const businessName = text(body.businessName);
    const outletName = text(body.outletName);
    if (!businessName || !outletName) fail("Nama bisnis dan nama outlet wajib diisi");

    await context.db.update(workspaces).set({
      name: businessName,
      phone: text(body.phone),
      businessType: text(body.businessType, "coffee-home"),
      taxPercent: clampPercent(body.taxPercent),
      onboardingCompleted: true,
    }).where(eq(workspaces.id, context.workspace.id));

    await context.db.update(branches)
      .set({ name: outletName, address: text(body.address) })
      .where(eq(branches.id, context.branch.id));

    if (body.withSampleData === true) {
      await seedDemoWorkspace(context.db, context.workspace.id, context.branch.id);
    }

    return { ok: true, seeded: body.withSampleData === true };
  },

  "update-settings": async (context, body) => {
    require_(context, "owner");
    const businessName = text(body.businessName);
    if (!businessName) fail("Nama bisnis wajib diisi");
    await context.db.update(workspaces).set({
      name: businessName,
      phone: text(body.phone),
      businessType: text(body.businessType, context.workspace.businessType),
      taxPercent: clampPercent(body.taxPercent ?? context.workspace.taxPercent),
      cashierDiscountPercent: Math.round(clampPercent(body.cashierDiscountPercent ?? context.workspace.cashierDiscountPercent)),
    }).where(eq(workspaces.id, context.workspace.id));
    return { ok: true };
  },

  /** Membuang seluruh data contoh sekaligus, tanpa menyentuh data asli pelanggan. */
  "clear-demo-data": async (context) => {
    require_(context, "owner");
    const demoOrders = await context.db.select({ id: orders.id }).from(orders)
      .where(and(eq(orders.workspaceId, context.workspace.id), eq(orders.isDemo, true)));

    if (demoOrders.length) {
      await context.db.delete(orderItems).where(inArray(orderItems.orderId, demoOrders.map((row) => row.id)));
    }
    const scope = eq(orders.workspaceId, context.workspace.id);
    await context.db.delete(orders).where(and(scope, eq(orders.isDemo, true)));
    await context.db.delete(stockMovements).where(and(eq(stockMovements.workspaceId, context.workspace.id), eq(stockMovements.isDemo, true)));
    await context.db.delete(expenses).where(and(eq(expenses.workspaceId, context.workspace.id), eq(expenses.isDemo, true)));
    await context.db.delete(shifts).where(and(eq(shifts.workspaceId, context.workspace.id), eq(shifts.isDemo, true)));

    const demoProducts = await context.db.select({ id: products.id }).from(products)
      .where(and(eq(products.workspaceId, context.workspace.id), eq(products.isDemo, true)));
    if (demoProducts.length) {
      await context.db.delete(recipes).where(inArray(recipes.productId, demoProducts.map((row) => row.id)));
      await context.db.delete(products).where(inArray(products.id, demoProducts.map((row) => row.id)));
    }
    await context.db.delete(ingredients).where(and(eq(ingredients.workspaceId, context.workspace.id), eq(ingredients.isDemo, true)));

    return { ok: true, message: "Data contoh dihapus" };
  },

  /* ---------------------------------------------------------------- *
   * Kasir
   * ---------------------------------------------------------------- */

  "create-order": async (context, body) => {
    require_(context, "sell");
    const { db, workspace, branch, currentMember } = context;

    const submitted = Array.isArray(body.items) ? body.items as Array<{ productId?: string; quantity?: number }> : [];
    if (!submitted.length) fail("Keranjang masih kosong");

    const productRows = await db.select().from(products)
      .where(and(eq(products.workspaceId, workspace.id), eq(products.isActive, true)));

    const lines = submitted.map((entry) => {
      const product = productRows.find((row) => row.id === entry.productId);
      const quantity = Math.max(1, Math.floor(Number(entry.quantity ?? 1)));
      return product && Number.isFinite(quantity) ? { product, quantity } : null;
    }).filter((entry): entry is { product: typeof productRows[number]; quantity: number } => Boolean(entry));
    if (!lines.length) fail("Produk di keranjang sudah tidak tersedia");

    const manages = currentMember.role === "owner" || currentMember.role === "manager";
    const totals = calculateOrder(
      lines.map((line) => ({ price: line.product.price, cost: line.product.cost, quantity: line.quantity })),
      {
        requestedDiscount: Number(body.discount ?? 0),
        taxPercent: workspace.taxPercent,
        discountRule: { unlimited: manages, maxPercent: workspace.cashierDiscountPercent },
      },
    );

    const requestedDiscount = Math.max(0, rupiah(Number(body.discount ?? 0)));
    if (requestedDiscount > totals.discount) {
      fail(`Diskon melebihi batas peran lo (maksimal ${workspace.cashierDiscountPercent}% dari subtotal)`, 403);
    }

    // Resep untuk semua produk diambil sekali, bukan satu query per produk.
    const recipeRows = await db.select().from(recipes)
      .where(and(eq(recipes.workspaceId, workspace.id), inArray(recipes.productId, lines.map((line) => line.product.id))));

    const usage = new Map<string, number>();
    for (const line of lines) {
      for (const recipe of recipeRows.filter((row) => row.productId === line.product.id)) {
        usage.set(recipe.ingredientId, (usage.get(recipe.ingredientId) ?? 0) + recipe.quantity * line.quantity);
      }
    }

    const usedIngredients = usage.size
      ? await db.select().from(ingredients).where(inArray(ingredients.id, [...usage.keys()]))
      : [];

    // Penjualan tidak pernah diblokir karena stok kurang — minumannya sudah dibuat. Yang salah
    // adalah pencatatan pembelian, jadi kekurangannya dilaporkan balik sebagai peringatan.
    const stockWarnings = usedIngredients
      .filter((ingredient) => ingredient.stockQty < (usage.get(ingredient.id) ?? 0))
      .map((ingredient) => ({
        name: ingredient.name,
        unit: ingredient.unit,
        available: ingredient.stockQty,
        needed: usage.get(ingredient.id) ?? 0,
      }));

    const orderId = id("ord");
    const orderNo = `FZ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

    const statements: BatchItem<"sqlite">[] = [
      db.insert(orders).values({
        id: orderId, workspaceId: workspace.id, branchId: branch.id, orderNo,
        channel: text(body.channel, "Dine in"), paymentMethod: text(body.paymentMethod, "QRIS"),
        subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax, total: totals.total,
        customerName: text(body.customerName), customerPhone: text(body.customerPhone),
        notes: text(body.notes), cashierEmail: context.email,
      }),
      db.insert(orderItems).values(lines.map((line) => ({
        id: id("itm"), orderId, productId: line.product.id, productName: line.product.name,
        quantity: line.quantity, unitPrice: line.product.price, unitCost: line.product.cost,
        subtotal: line.product.price * line.quantity,
      }))),
    ];

    for (const [ingredientId, used] of usage) {
      statements.push(
        db.update(ingredients).set({ stockQty: sql`${ingredients.stockQty} - ${used}` })
          .where(and(eq(ingredients.id, ingredientId), eq(ingredients.workspaceId, workspace.id))),
        db.insert(stockMovements).values({
          id: id("mov"), workspaceId: workspace.id, branchId: branch.id, ingredientId,
          type: "usage", quantity: -used, note: orderNo,
        }),
      );
    }

    // Satu batch supaya pesanan, itemnya, dan pengurangan stok tidak pernah tersimpan setengah.
    await runBatch(db, statements);

    return {
      ok: true, orderId, orderNo,
      subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax, total: totals.total,
      items: lines.map((line) => ({
        name: line.product.name, quantity: line.quantity,
        unitPrice: line.product.price, subtotal: line.product.price * line.quantity,
      })),
      business: workspace.name, branch: branch.name,
      paymentMethod: text(body.paymentMethod, "QRIS"),
      customerName: text(body.customerName),
      cashier: currentMember.name || context.email,
      stockWarnings,
    };
  },

  /** Membatalkan transaksi dan mengembalikan bahan yang sudah dipotong. */
  "void-order": async (context, body) => {
    require_(context, "manage");
    const orderId = text(body.orderId);
    const reason = text(body.reason);
    if (!reason) fail("Alasan pembatalan wajib diisi");

    const order = await context.db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.workspaceId, context.workspace.id)),
    });
    if (!order) fail("Transaksi tidak ditemukan", 404);
    if (order.status === "void") fail("Transaksi ini sudah dibatalkan");

    const usageRows = await context.db.select().from(stockMovements)
      .where(and(eq(stockMovements.workspaceId, context.workspace.id), eq(stockMovements.type, "usage"), eq(stockMovements.note, order.orderNo)));

    const statements: BatchItem<"sqlite">[] = [
      context.db.update(orders).set({
        status: "void", voidedAt: new Date().toISOString(), voidedBy: context.email, voidReason: reason,
      }).where(eq(orders.id, order.id)),
    ];

    for (const movement of usageRows) {
      const restored = Math.abs(movement.quantity);
      statements.push(
        context.db.update(ingredients).set({ stockQty: sql`${ingredients.stockQty} + ${restored}` })
          .where(and(eq(ingredients.id, movement.ingredientId), eq(ingredients.workspaceId, context.workspace.id))),
        context.db.insert(stockMovements).values({
          id: id("mov"), workspaceId: context.workspace.id, branchId: order.branchId,
          ingredientId: movement.ingredientId, type: "void-return", quantity: restored,
          note: `Batal ${order.orderNo}`,
        }),
      );
    }

    await runBatch(context.db, statements);
    return { ok: true, message: `Transaksi ${order.orderNo} dibatalkan` };
  },

  /* ---------------------------------------------------------------- *
   * Shift kas
   * ---------------------------------------------------------------- */

  "open-shift": async (context, body) => {
    require_(context, "sell");
    const running = await context.db.query.shifts.findFirst({
      where: and(eq(shifts.branchId, context.branch.id), eq(shifts.status, "open")),
    });
    if (running) fail("Masih ada shift yang berjalan di outlet ini");

    await context.db.insert(shifts).values({
      id: id("shf"), workspaceId: context.workspace.id, branchId: context.branch.id,
      cashierName: text(body.cashierName, context.currentMember.name || context.email.split("@")[0]),
      openingCash: positiveRupiah(body.openingCash),
      openedBy: context.email,
    });
    return { ok: true, message: "Shift dibuka" };
  },

  "close-shift": async (context, body) => {
    require_(context, "sell");
    const activeShift = await context.db.query.shifts.findFirst({
      where: and(eq(shifts.branchId, context.branch.id), eq(shifts.status, "open")),
    });
    if (!activeShift) fail("Tidak ada shift aktif di outlet ini");

    // Kas dihitung hanya dari penjualan tunai di outlet shift ini, sejak shift dibuka.
    const [cashRow] = await context.db
      .select({ total: sql<number>`coalesce(sum(${orders.total}), 0)` })
      .from(orders)
      .where(and(
        eq(orders.workspaceId, context.workspace.id),
        eq(orders.branchId, activeShift.branchId),
        eq(orders.paymentMethod, "Tunai"),
        ne(orders.status, "void"),
        gte(orders.createdAt, activeShift.openedAt),
      ));

    const actualCash = positiveRupiah(body.actualCash);
    const expected = activeShift.openingCash + Number(cashRow?.total ?? 0);

    await context.db.update(shifts).set({
      status: "closed", actualCash, expectedCash: expected, variance: actualCash - expected,
      closedAt: new Date().toISOString(), closedBy: context.email, note: text(body.note),
    }).where(eq(shifts.id, activeShift.id));

    return { ok: true, expected, actualCash, variance: actualCash - expected };
  },

  /* ---------------------------------------------------------------- *
   * Produk & resep
   * ---------------------------------------------------------------- */

  "create-product": async (context, body) => {
    require_(context, "manage");
    const name = text(body.name);
    const price = positiveRupiah(body.price);
    if (!name || !price) fail("Nama produk dan harga jual wajib diisi");
    await context.db.insert(products).values({
      id: id("prd"), workspaceId: context.workspace.id, name,
      sku: text(body.sku, `SKU-${crypto.randomUUID().slice(0, 5).toUpperCase()}`),
      category: text(body.category, "Coffee"), price, cost: positiveRupiah(body.cost),
    });
    return { ok: true };
  },

  "update-product": async (context, body) => {
    require_(context, "manage");
    const product = await findOwned(context, products, text(body.productId), "Produk");
    const name = text(body.name, product.name);
    const price = positiveRupiah(body.price ?? product.price);
    if (!name || !price) fail("Nama produk dan harga jual wajib diisi");
    await context.db.update(products).set({
      name, price, cost: positiveRupiah(body.cost ?? product.cost),
      sku: text(body.sku, product.sku), category: text(body.category, product.category),
      isActive: body.isActive === undefined ? product.isActive : body.isActive === true,
    }).where(eq(products.id, product.id));
    return { ok: true };
  },

  /**
   * Produk yang pernah terjual tidak dihapus — riwayat transaksinya harus tetap utuh.
   * Yang bisa dilakukan adalah menonaktifkannya supaya hilang dari kasir.
   */
  "archive-product": async (context, body) => {
    require_(context, "manage");
    const product = await findOwned(context, products, text(body.productId), "Produk");
    const [sold] = await context.db.select({ count: sql<number>`count(*)` })
      .from(orderItems).where(eq(orderItems.productId, product.id));

    if (Number(sold?.count ?? 0) > 0) {
      await context.db.update(products).set({ isActive: false }).where(eq(products.id, product.id));
      return { ok: true, message: "Produk dinonaktifkan; riwayat penjualannya tetap tersimpan" };
    }
    await context.db.delete(recipes).where(eq(recipes.productId, product.id));
    await context.db.delete(products).where(eq(products.id, product.id));
    return { ok: true, message: "Produk dihapus" };
  },

  /** Menyimpan seluruh komposisi resep sebuah produk sekaligus. */
  "set-recipe": async (context, body) => {
    require_(context, "stock");
    const product = await findOwned(context, products, text(body.productId), "Produk");
    const submitted = Array.isArray(body.lines) ? body.lines as Array<{ ingredientId?: string; quantity?: number }> : [];

    const ingredientRows = await context.db.select().from(ingredients)
      .where(eq(ingredients.workspaceId, context.workspace.id));

    const lines = submitted
      .map((entry) => {
        const ingredient = ingredientRows.find((row) => row.id === entry.ingredientId);
        const quantity = Number(entry.quantity ?? 0);
        return ingredient && Number.isFinite(quantity) && quantity > 0 ? { ingredient, quantity } : null;
      })
      .filter((entry): entry is { ingredient: typeof ingredientRows[number]; quantity: number } => Boolean(entry));

    const statements: BatchItem<"sqlite">[] = [
      context.db.delete(recipes).where(and(eq(recipes.workspaceId, context.workspace.id), eq(recipes.productId, product.id))),
    ];
    if (lines.length) {
      statements.push(context.db.insert(recipes).values(lines.map((line) => ({
        id: id("rcp"), workspaceId: context.workspace.id, productId: product.id,
        ingredientId: line.ingredient.id, quantity: line.quantity,
      }))));
    }
    await runBatch(context.db, statements);

    // HPP produk mengikuti resepnya supaya margin di laporan tidak perlu diisi manual.
    if (lines.length && body.syncCost !== false) {
      const cost = lines.reduce((sum, line) => sum + line.quantity * line.ingredient.averageCost, 0);
      await context.db.update(products).set({ cost: rupiah(cost) }).where(eq(products.id, product.id));
    }

    return { ok: true, lines: lines.length };
  },

  /* ---------------------------------------------------------------- *
   * Bahan & stok
   * ---------------------------------------------------------------- */

  "create-ingredient": async (context, body) => {
    require_(context, "stock");
    const name = text(body.name);
    const unit = text(body.unit);
    if (!name || !unit) fail("Nama bahan dan satuan wajib diisi");
    await context.db.insert(ingredients).values({
      id: id("ing"), workspaceId: context.workspace.id, name, unit,
      stockQty: Math.max(0, Number(body.stockQty ?? 0)),
      minimumStock: Math.max(0, Number(body.minimumStock ?? 0)),
      averageCost: Math.max(0, Number(body.averageCost ?? 0)),
      supplier: text(body.supplier),
    });
    return { ok: true };
  },

  "update-ingredient": async (context, body) => {
    require_(context, "stock");
    const ingredient = await findOwned(context, ingredients, text(body.ingredientId), "Bahan");
    await context.db.update(ingredients).set({
      name: text(body.name, ingredient.name),
      unit: text(body.unit, ingredient.unit),
      minimumStock: Math.max(0, Number(body.minimumStock ?? ingredient.minimumStock)),
      supplier: text(body.supplier, ingredient.supplier),
      isActive: body.isActive === undefined ? ingredient.isActive : body.isActive === true,
    }).where(eq(ingredients.id, ingredient.id));
    return { ok: true };
  },

  "archive-ingredient": async (context, body) => {
    require_(context, "stock");
    const ingredient = await findOwned(context, ingredients, text(body.ingredientId), "Bahan");
    const [used] = await context.db.select({ count: sql<number>`count(*)` })
      .from(recipes).where(eq(recipes.ingredientId, ingredient.id));
    if (Number(used?.count ?? 0) > 0) fail("Bahan ini masih dipakai di resep. Lepas dari resepnya dulu.");
    await context.db.delete(stockMovements).where(eq(stockMovements.ingredientId, ingredient.id));
    await context.db.delete(ingredients).where(eq(ingredients.id, ingredient.id));
    return { ok: true, message: "Bahan dihapus" };
  },

  "restock": async (context, body) => {
    require_(context, "stock");
    const ingredient = await findOwned(context, ingredients, text(body.ingredientId), "Bahan");
    const quantity = Number(body.quantity ?? 0);
    if (!(quantity > 0)) fail("Jumlah stok masuk harus lebih dari 0");
    const unitCost = Math.max(0, Number(body.unitCost ?? 0));

    await runBatch(context.db, [
      context.db.update(ingredients).set({
        stockQty: sql`${ingredients.stockQty} + ${quantity}`,
        averageCost: weightedAverageCost(ingredient.stockQty, ingredient.averageCost, quantity, unitCost),
        supplier: text(body.supplier, ingredient.supplier),
      }).where(eq(ingredients.id, ingredient.id)),
      context.db.insert(stockMovements).values({
        id: id("mov"), workspaceId: context.workspace.id, branchId: context.branch.id,
        ingredientId: ingredient.id, type: "purchase", quantity, unitCost,
        supplier: text(body.supplier), note: text(body.note),
      }),
    ]);
    return { ok: true };
  },

  /** Koreksi stok opname — selisih antara catatan dan hitungan fisik. */
  "adjust-stock": async (context, body) => {
    require_(context, "stock");
    const ingredient = await findOwned(context, ingredients, text(body.ingredientId), "Bahan");
    const counted = Number(body.countedQty ?? NaN);
    if (!Number.isFinite(counted) || counted < 0) fail("Hasil hitungan fisik tidak valid");
    const difference = counted - ingredient.stockQty;

    await runBatch(context.db, [
      context.db.update(ingredients).set({ stockQty: counted }).where(eq(ingredients.id, ingredient.id)),
      context.db.insert(stockMovements).values({
        id: id("mov"), workspaceId: context.workspace.id, branchId: context.branch.id,
        ingredientId: ingredient.id, type: "adjustment", quantity: difference,
        unitCost: ingredient.averageCost, note: text(body.note, "Stok opname"),
      }),
    ]);
    return { ok: true, difference };
  },

  /* ---------------------------------------------------------------- *
   * Biaya
   * ---------------------------------------------------------------- */

  "create-expense": async (context, body) => {
    require_(context, "manage");
    const amount = positiveRupiah(body.amount);
    if (!amount) fail("Nominal biaya harus lebih dari 0");
    await context.db.insert(expenses).values({
      id: id("exp"), workspaceId: context.workspace.id, branchId: context.branch.id,
      category: text(body.category, "Operasional"), amount,
      paymentMethod: text(body.paymentMethod, "Tunai"), note: text(body.note),
      transactionDate: text(body.transactionDate, new Date().toISOString().slice(0, 10)),
    });
    return { ok: true };
  },

  "update-expense": async (context, body) => {
    require_(context, "manage");
    const expense = await findOwned(context, expenses, text(body.expenseId), "Biaya");
    const amount = positiveRupiah(body.amount ?? expense.amount);
    if (!amount) fail("Nominal biaya harus lebih dari 0");
    await context.db.update(expenses).set({
      category: text(body.category, expense.category), amount,
      paymentMethod: text(body.paymentMethod, expense.paymentMethod),
      note: text(body.note, expense.note),
      transactionDate: text(body.transactionDate, expense.transactionDate),
    }).where(eq(expenses.id, expense.id));
    return { ok: true };
  },

  "delete-expense": async (context, body) => {
    require_(context, "manage");
    const expense = await findOwned(context, expenses, text(body.expenseId), "Biaya");
    await context.db.delete(expenses).where(eq(expenses.id, expense.id));
    return { ok: true, message: "Catatan biaya dihapus" };
  },

  /* ---------------------------------------------------------------- *
   * Tim & outlet
   * ---------------------------------------------------------------- */

  "create-member": async (context, body) => {
    require_(context, "manage");
    const memberEmail = text(body.email).toLowerCase();
    if (!memberEmail.includes("@")) fail("Email anggota tim tidak valid");
    const role = assignableRole(context, body.role);

    const memberRows = await context.db.select().from(members).where(eq(members.workspaceId, context.workspace.id));
    const limit = limitsFor(context.entitlement).members;
    if (memberRows.length >= limit) {
      fail(`Paket ${context.entitlement.plan ?? "nonaktif"} maksimal ${limit} pengguna. Naikkan paket untuk menambah tim.`);
    }
    if (memberRows.some((member) => member.email === memberEmail)) fail("Email ini sudah terdaftar di tim");

    await context.db.insert(members).values({
      id: id("mem"), workspaceId: context.workspace.id, email: memberEmail,
      name: text(body.name), role, invitedBy: context.email,
    });
    return { ok: true };
  },

  "update-member": async (context, body) => {
    require_(context, "manage");
    const member = await findOwned(context, members, text(body.memberId), "Anggota tim");
    if (member.role === "owner") fail("Peran pemilik tidak bisa diubah");
    await context.db.update(members).set({
      name: text(body.name, member.name),
      role: body.role === undefined ? member.role : assignableRole(context, body.role),
      status: body.status === "suspended" ? "suspended" : "active",
    }).where(eq(members.id, member.id));
    return { ok: true };
  },

  "remove-member": async (context, body) => {
    require_(context, "manage");
    const member = await findOwned(context, members, text(body.memberId), "Anggota tim");
    if (member.role === "owner") fail("Pemilik tidak bisa dikeluarkan dari workspace");
    if (member.email === context.email) fail("Lo nggak bisa mengeluarkan diri sendiri");
    await context.db.delete(members).where(eq(members.id, member.id));
    return { ok: true, message: "Anggota tim dikeluarkan" };
  },

  "create-branch": async (context, body) => {
    require_(context, "owner");
    const branchRows = await context.db.select().from(branches).where(eq(branches.workspaceId, context.workspace.id));
    const limit = limitsFor(context.entitlement).branches;
    if (branchRows.length >= limit) {
      fail(`Paket ${context.entitlement.plan ?? "nonaktif"} maksimal ${limit} outlet. Naikkan paket untuk menambah outlet.`);
    }
    const name = text(body.name);
    if (!name) fail("Nama outlet wajib diisi");
    await context.db.insert(branches).values({
      id: id("br"), workspaceId: context.workspace.id, name,
      code: text(body.code, `OUT-${String(branchRows.length + 1).padStart(2, "0")}`),
      address: text(body.address),
    });
    return { ok: true };
  },

  "update-branch": async (context, body) => {
    require_(context, "owner");
    const target = await findOwned(context, branches, text(body.targetBranchId), "Outlet");
    const name = text(body.name, target.name);
    if (!name) fail("Nama outlet wajib diisi");
    await context.db.update(branches).set({
      name, code: text(body.code, target.code), address: text(body.address, target.address),
      isActive: body.isActive === undefined ? target.isActive : body.isActive === true,
    }).where(eq(branches.id, target.id));
    return { ok: true };
  },
};

/* ------------------------------------------------------------------ *
 * Utilitas
 * ------------------------------------------------------------------ */

/** Menjalankan beberapa perintah sebagai satu batch D1 supaya tidak tersimpan setengah. */
async function runBatch(db: Db, statements: BatchItem<"sqlite">[]) {
  if (!statements.length) return;
  const [first, ...rest] = statements;
  await db.batch([first, ...rest]);
}

type OwnedTable = typeof products | typeof ingredients | typeof expenses | typeof members | typeof branches;

/** Mengambil satu baris milik workspace ini; menolak id milik workspace lain. */
async function findOwned<T extends OwnedTable>(
  context: Context,
  table: T,
  rowId: string,
  label: string,
): Promise<T["$inferSelect"]> {
  if (!rowId) fail(`${label} belum dipilih`);
  const [row] = await context.db.select().from(table)
    .where(and(eq(table.id, rowId), eq(table.workspaceId, context.workspace.id)))
    .limit(1);
  if (!row) fail(`${label} tidak ditemukan`, 404);
  return row as T["$inferSelect"];
}

/** Manager tidak boleh mengangkat manager atau pemilik baru. */
function assignableRole(context: Context, value: unknown): string {
  const role = text(value, "cashier");
  const allowed = context.currentMember.role === "owner"
    ? ["manager", "cashier", "inventory"]
    : ["cashier", "inventory"];
  if (!allowed.includes(role)) fail("Peran itu tidak bisa lo berikan");
  return role;
}
