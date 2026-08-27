/**
 * Aturan paket, batas, dan hak akses langganan.
 *
 * Modul ini sengaja murni — tanpa impor database atau runtime — supaya bisa diuji
 * langsung dan supaya cuma ada satu tempat yang memutuskan "workspace ini boleh apa".
 */

export type PlanId = "starter" | "pro" | "business";
export type Interval = "monthly" | "yearly";

export const PLANS: Record<PlanId, { name: string; monthly: number; yearly: number; branches: number; members: number }> = {
  starter: { name: "Starter", monthly: 99_000, yearly: 990_000, branches: 1, members: 2 },
  pro: { name: "Pro", monthly: 199_000, yearly: 1_990_000, branches: 3, members: 10 },
  business: { name: "Business", monthly: 399_000, yearly: 3_990_000, branches: 25, members: 200 },
};

/** Paket yang diberikan selama masa uji coba. */
export const TRIAL_PLAN: PlanId = "pro";
export const TRIAL_DAYS = 14;

export function isPlanId(value: unknown): value is PlanId {
  return value === "starter" || value === "pro" || value === "business";
}

export function planPrice(plan: PlanId, interval: Interval): number {
  return PLANS[plan][interval];
}

export function normalizeInterval(value: unknown): Interval {
  return value === "yearly" ? "yearly" : "monthly";
}

export type EntitlementInput = {
  paidPlan: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
};

export type Entitlement = {
  /** Paket yang benar-benar berlaku sekarang, atau null kalau akses terkunci. */
  plan: PlanId | null;
  /** Sumber hak akses, untuk ditampilkan di UI. */
  source: "paid" | "trial" | "none";
  locked: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
};

/**
 * Menentukan hak akses nyata sebuah workspace.
 *
 * Yang menentukan HANYA `paidPlan` (diisi setelah pembayaran diverifikasi) atau masa uji coba
 * yang masih berjalan. Kolom `plan` adalah pilihan pengguna dan tidak pernah dipercaya di sini —
 * kalau dipercaya, siapa pun bisa menaikkan paketnya sendiri lewat satu request.
 */
export function entitlementOf(workspace: EntitlementInput, now: Date = new Date()): Entitlement {
  const current = now.getTime();

  if (workspace.subscriptionStatus === "active" && isPlanId(workspace.paidPlan)) {
    const endsAt = workspace.currentPeriodEnd ? Date.parse(workspace.currentPeriodEnd) : NaN;
    // Langganan aktif tanpa tanggal akhir dianggap masih berjalan; itu keadaan
    // yang dibuat admin secara manual dan sengaja tidak dibatasi waktu.
    if (Number.isNaN(endsAt) || endsAt > current) {
      return {
        plan: workspace.paidPlan,
        source: "paid",
        locked: false,
        expiresAt: workspace.currentPeriodEnd,
        daysLeft: Number.isNaN(endsAt) ? null : daysBetween(current, endsAt),
      };
    }
  }

  const trialEndsAt = workspace.trialEndsAt ? Date.parse(workspace.trialEndsAt) : NaN;
  if (!Number.isNaN(trialEndsAt) && trialEndsAt > current) {
    return {
      plan: TRIAL_PLAN,
      source: "trial",
      locked: false,
      expiresAt: workspace.trialEndsAt,
      daysLeft: daysBetween(current, trialEndsAt),
    };
  }

  return { plan: null, source: "none", locked: true, expiresAt: workspace.trialEndsAt, daysLeft: 0 };
}

export function limitsFor(entitlement: Entitlement): { branches: number; members: number } {
  // Workspace terkunci tetap boleh menyimpan satu outlet dan satu pemilik supaya datanya utuh
  // saat langganan diperpanjang, tapi tidak boleh menambah apa pun.
  if (!entitlement.plan) return { branches: 1, members: 1 };
  return { branches: PLANS[entitlement.plan].branches, members: PLANS[entitlement.plan].members };
}

/**
 * Aksi yang tetap boleh dijalankan saat langganan mati.
 *
 * Isinya hanya jalan keluar: melihat data sendiri, memilih paket, dan menghubungkan pembayaran.
 * Semua aksi yang menulis data operasional sengaja tidak ada di sini.
 */
const ACTIONS_ALLOWED_WHEN_LOCKED = new Set([
  "select-plan",
  "claim-orderhero",
  "complete-onboarding",
  "update-orderhero-settings",
  "review-orderhero",
]);

export function actionAllowedWhenLocked(action: string): boolean {
  return ACTIONS_ALLOWED_WHEN_LOCKED.has(action);
}

function daysBetween(from: number, to: number): number {
  return Math.max(0, Math.ceil((to - from) / 86_400_000));
}

/** Tanggal akhir periode langganan setelah pembayaran diterima. */
export function periodEndFrom(start: Date, interval: Interval): string {
  const end = new Date(start);
  if (interval === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}
