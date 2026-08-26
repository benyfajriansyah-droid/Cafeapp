import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Nominal uang disimpan sebagai `integer` rupiah penuh — rupiah tidak punya sen dan
// penjumlahan floating point mengakumulasi galat di laporan keuangan. Yang tetap `real`
// hanya besaran fisik (jumlah bahan) dan harga per satuan, karena keduanya memang pecahan.

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(), ownerEmail: text("owner_email").notNull().unique(),
  name: text("name").notNull(), slug: text("slug").notNull(),
  plan: text("plan").notNull().default("trial"), currency: text("currency").notNull().default("IDR"),
  taxPercent: real("tax_percent").notNull().default(0),
  phone: text("phone").notNull().default(""), businessType: text("business_type").notNull().default("coffee-home"),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).notNull().default(true),
  subscriptionStatus: text("subscription_status").notNull().default("trialing"),
  trialEndsAt: text("trial_ends_at"), billingInterval: text("billing_interval").notNull().default("monthly"),
  // `plan` di atas adalah paket yang dipilih pengguna. `paidPlan` adalah paket yang benar-benar
  // sudah terverifikasi bayar — hanya kolom ini yang boleh menentukan batas outlet dan tim.
  paidPlan: text("paid_plan").notNull().default(""),
  currentPeriodEnd: text("current_period_end"),
  cashierDiscountPercent: integer("cashier_discount_percent").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const branches = sqliteTable("branches", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(), code: text("code").notNull(), address: text("address").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("branches_workspace_idx").on(table.workspaceId)]);

export const products = sqliteTable("products", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), name: text("name").notNull(),
  sku: text("sku").notNull(), category: text("category").notNull(), price: integer("price").notNull(),
  cost: integer("cost").notNull().default(0), isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("products_workspace_idx").on(table.workspaceId)]);

export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), name: text("name").notNull(),
  unit: text("unit").notNull(), stockQty: real("stock_qty").notNull().default(0),
  minimumStock: real("minimum_stock").notNull().default(0), averageCost: real("average_cost").notNull().default(0),
  supplier: text("supplier").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("ingredients_workspace_idx").on(table.workspaceId)]);

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), productId: text("product_id").notNull(),
  ingredientId: text("ingredient_id").notNull(), quantity: real("quantity").notNull(),
}, (table) => [
  index("recipes_product_idx").on(table.productId),
  uniqueIndex("recipes_product_ingredient_unique").on(table.productId, table.ingredientId),
]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), branchId: text("branch_id").notNull(),
  orderNo: text("order_no").notNull(), channel: text("channel").notNull().default("Dine in"),
  paymentMethod: text("payment_method").notNull(), subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0), tax: integer("tax").notNull().default(0),
  total: integer("total").notNull(),
  status: text("status").notNull().default("paid"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  customerName: text("customer_name").notNull().default(""), customerPhone: text("customer_phone").notNull().default(""),
  notes: text("notes").notNull().default(""),
  // Jejak siapa yang menjual dan siapa yang membatalkan — diperlukan untuk menelusuri diskon dan void.
  cashierEmail: text("cashier_email").notNull().default(""),
  voidedAt: text("voided_at"), voidedBy: text("voided_by").notNull().default(""),
  voidReason: text("void_reason").notNull().default(""),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
}, (table) => [
  index("orders_workspace_created_idx").on(table.workspaceId, table.createdAt),
  index("orders_branch_created_idx").on(table.branchId, table.createdAt),
]);

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull(), productId: text("product_id").notNull(),
  productName: text("product_name").notNull(), quantity: real("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), unitCost: integer("unit_cost").notNull().default(0),
  subtotal: integer("subtotal").notNull(),
}, (table) => [index("order_items_order_idx").on(table.orderId)]);

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), branchId: text("branch_id").notNull(),
  category: text("category").notNull(), amount: integer("amount").notNull(), paymentMethod: text("payment_method").notNull(),
  note: text("note").notNull().default(""), transactionDate: text("transaction_date").notNull(),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("expenses_workspace_date_idx").on(table.workspaceId, table.transactionDate),
  index("expenses_branch_date_idx").on(table.branchId, table.transactionDate),
]);

export const stockMovements = sqliteTable("stock_movements", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), branchId: text("branch_id").notNull(),
  ingredientId: text("ingredient_id").notNull(), type: text("type").notNull(), quantity: real("quantity").notNull(),
  unitCost: real("unit_cost").notNull().default(0), supplier: text("supplier").notNull().default(""),
  note: text("note").notNull().default(""),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("stock_movements_workspace_idx").on(table.workspaceId, table.createdAt)]);

export const shifts = sqliteTable("shifts", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), branchId: text("branch_id").notNull(),
  cashierName: text("cashier_name").notNull(), openingCash: integer("opening_cash").notNull().default(0),
  actualCash: integer("actual_cash"), expectedCash: integer("expected_cash"), variance: integer("variance"),
  status: text("status").notNull().default("open"),
  openedBy: text("opened_by").notNull().default(""), closedBy: text("closed_by").notNull().default(""),
  note: text("note").notNull().default(""),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  openedAt: text("opened_at").notNull().default(sql`CURRENT_TIMESTAMP`), closedAt: text("closed_at"),
}, (table) => [
  index("shifts_workspace_idx").on(table.workspaceId, table.openedAt),
  index("shifts_branch_status_idx").on(table.branchId, table.status),
]);

export const members = sqliteTable("members", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), email: text("email").notNull(),
  name: text("name").notNull().default(""), role: text("role").notNull().default("cashier"),
  status: text("status").notNull().default("active"), invitedBy: text("invited_by").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("members_workspace_email_unique").on(table.workspaceId, table.email),
  index("members_email_idx").on(table.email),
]);

export const billingInvoices = sqliteTable("billing_invoices", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull(), invoiceNo: text("invoice_no").notNull(),
  plan: text("plan").notNull(), interval: text("interval").notNull().default("monthly"), amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"), dueDate: text("due_date").notNull(), paidAt: text("paid_at"),
  paymentMethod: text("payment_method").notNull().default("manual"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("billing_workspace_idx").on(table.workspaceId, table.createdAt)]);

export const platformSettings = sqliteTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const subscriptionClaims = sqliteTable("subscription_claims", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id"),
  checkoutReference: text("checkout_reference").notNull().unique(),
  orderHeroInvoice: text("orderhero_invoice").notNull().default(""),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  plan: text("plan").notNull(),
  interval: text("interval").notNull().default("monthly"),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("checkout_started"),
  reviewerEmail: text("reviewer_email").notNull().default(""),
  reviewNote: text("review_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: text("reviewed_at"),
  activatedAt: text("activated_at"),
}, (table) => [
  index("subscription_claims_status_idx").on(table.status, table.createdAt),
  index("subscription_claims_workspace_idx").on(table.workspaceId, table.createdAt),
  index("subscription_claims_email_idx").on(table.buyerEmail),
]);

// ---------------------------------------------------------------------------
// Autentikasi mandiri
//
// Identitas tidak lagi diambil dari header proxy. Aplikasi menyimpan akunnya sendiri,
// jadi bisa dipasang di domain mana pun tanpa bergantung pada satu penyedia hosting.
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  // Format: pbkdf2$sha256$<iterasi>$<salt_b64url>$<hash_b64url>. Jumlah iterasi ikut disimpan
  // supaya bisa dinaikkan kapan pun tanpa membatalkan kata sandi yang sudah ada.
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  status: text("status").notNull().default("active"),
  // Percobaan masuk yang gagal berturut-turut; direset setiap kali berhasil.
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("users_email_idx").on(table.email)]);

export const sessions = sqliteTable("sessions", {
  // Yang disimpan adalah SHA-256 dari token, bukan tokennya. Salinan database yang bocor
  // tidak bisa dipakai untuk menyamar jadi siapa pun.
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("sessions_user_idx").on(table.userId),
  index("sessions_expires_idx").on(table.expiresAt),
]);

export const passwordResets = sqliteTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("password_resets_user_idx").on(table.userId)]);

export const invitations = sqliteTable("invitations", {
  tokenHash: text("token_hash").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("cashier"),
  name: text("name").notNull().default(""),
  invitedBy: text("invited_by").notNull().default(""),
  expiresAt: text("expires_at").notNull(),
  acceptedAt: text("accepted_at"),
  revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("invitations_workspace_idx").on(table.workspaceId, table.createdAt),
  index("invitations_email_idx").on(table.email),
]);
