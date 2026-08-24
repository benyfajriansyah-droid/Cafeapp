"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

/* ---------------------------------------------------------------- *
 * Bentuk data yang dikirim /api/app
 * ---------------------------------------------------------------- */

export type PlanId = "starter" | "pro" | "business";

export type Workspace = {
  id: string; name: string; plan: string; phone: string; businessType: string;
  taxPercent: number; onboardingCompleted: boolean; subscriptionStatus: string;
  trialEndsAt: string | null; billingInterval: string; paidPlan: string;
  currentPeriodEnd: string | null; cashierDiscountPercent: number;
};
export type Entitlement = {
  plan: PlanId | null; source: "paid" | "trial" | "none";
  locked: boolean; expiresAt: string | null; daysLeft: number | null;
};
export type Branch = { id: string; name: string; code: string; address: string; isActive: boolean; isDemo: boolean };
export type Product = { id: string; name: string; sku: string; category: string; price: number; cost: number; isActive: boolean; isDemo: boolean };
export type Ingredient = { id: string; name: string; unit: string; stockQty: number; minimumStock: number; averageCost: number; supplier: string; isActive: boolean; isDemo: boolean };
export type Recipe = { id: string; productId: string; ingredientId: string; quantity: number };
export type Order = {
  id: string; branchId: string; orderNo: string; channel: string; paymentMethod: string;
  subtotal: number; discount: number; tax: number; total: number; status: string;
  createdAt: string; customerName: string; customerPhone: string; notes: string;
  cashierEmail: string; voidedAt: string | null; voidReason: string;
};
export type OrderItem = { id: string; orderId: string; productId: string; productName: string; quantity: number; unitPrice: number; unitCost: number; subtotal: number };
export type Expense = { id: string; category: string; amount: number; paymentMethod: string; note: string; transactionDate: string };
export type StockMovement = { id: string; ingredientId: string; type: string; quantity: number; unitCost: number; supplier: string; note: string; createdAt: string };
export type Shift = {
  id: string; branchId: string; cashierName: string; openingCash: number; actualCash: number | null;
  expectedCash: number | null; variance: number | null; status: string; openedAt: string; closedAt: string | null; note: string;
};
export type Member = { id: string; email: string; name: string; role: string; status: string };
export type BillingInvoice = { id: string; invoiceNo: string; plan: string; interval: string; amount: number; status: string; dueDate: string; paidAt: string | null };
export type SubscriptionClaim = {
  id: string; workspaceId: string | null; checkoutReference: string; orderHeroInvoice: string;
  buyerName: string; buyerEmail: string; buyerPhone: string; plan: string; interval: string;
  amount: number; status: string; createdAt: string;
};
export type Summary = {
  sales: number; cogs: number; expenses: number; grossProfit: number; netProfit: number;
  orderCount: number; discount: number; tax: number;
  payments: Array<{ method: string; total: number; count: number }>;
  hourly: Array<{ hour: string; total: number }>;
  topProducts: Array<{ productId: string; name: string; sold: number; revenue: number }>;
};

export type AppData = {
  workspace: Workspace;
  entitlement: Entitlement;
  limits: { branches: number; members: number };
  plans: Record<PlanId, { name: string; monthly: number; yearly: number; branches: number; members: number }>;
  currentMember: Member;
  platformAdmin: boolean;
  activeBranchId: string;
  range: { from: string | null; to: string | null };
  summary: Summary;
  platformSettings: Record<string, string>;
  subscriptionClaims: SubscriptionClaim[];
  branches: Branch[];
  products: Product[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  orders: Order[];
  orderItems: OrderItem[];
  expenses: Expense[];
  stockMovements: StockMovement[];
  shifts: Shift[];
  members: Member[];
  billingInvoices: BillingInvoice[];
};

export type Receipt = {
  orderNo: string; subtotal: number; discount: number; tax: number; total: number;
  items: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }>;
  business: string; branch: string; paymentMethod: string; customerName: string; cashier: string;
  stockWarnings: Array<{ name: string; unit: string; available: number; needed: number }>;
};

/** Semua modul menerima bentuk props yang sama supaya shell-nya tetap sederhana. */
export type ModuleProps = {
  data: AppData;
  saving: boolean;
  submit: (action: string, payload?: Record<string, unknown>) => Promise<Record<string, unknown> | false>;
  reload: () => Promise<void>;
  setRange: (range: { from: string | null; to: string | null }) => void;
};

/* ---------------------------------------------------------------- *
 * Format
 * ---------------------------------------------------------------- */

export const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function dateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function longDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export const today = () => new Date().toISOString().slice(0, 10);

export function canManage(data: AppData) {
  return data.currentMember.role === "owner" || data.currentMember.role === "manager";
}
export function canStock(data: AppData) {
  return canManage(data) || data.currentMember.role === "inventory";
}
export function canSell(data: AppData) {
  return canManage(data) || data.currentMember.role === "cashier";
}
export function isOwner(data: AppData) {
  return data.currentMember.role === "owner";
}

export const roleLabels: Record<string, string> = {
  owner: "Pemilik", manager: "Manager", cashier: "Kasir", inventory: "Gudang / stok",
};

export const roleAccess: Record<string, string> = {
  owner: "Semua modul & langganan",
  manager: "Operasional tanpa langganan",
  cashier: "Kasir & shift",
  inventory: "Stok, bahan & resep",
};

/* ---------------------------------------------------------------- *
 * Komponen kecil bersama
 * ---------------------------------------------------------------- */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

export function Empty({ icon: Icon, title, text }: {
  icon: React.ComponentType<{ size?: number }>; title: string; text: string;
}) {
  return <div className="empty-state"><span><Icon size={25} /></span><b>{title}</b><p>{text}</p></div>;
}

export function Modal({ title, description, onClose, children }: {
  title: string; description: string; onClose: () => void; children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><h2>{title}</h2><p>{description}</p></div>
          <button type="button" aria-label="Tutup" onClick={onClose}><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Ringkasan angka di atas tabel modul. */
export function SummaryStrip({ items }: { items: Array<{ label: string; value: string; tone?: "danger" | "good" }> }) {
  return (
    <div className="summary-strip">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <b className={item.tone === "danger" ? "danger-text" : item.tone === "good" ? "margin-text" : undefined}>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

export function formatUnit(value: number, unit: string) {
  return `${number.format(value)} ${unit}`;
}
