import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { platformSettings, subscriptionClaims } from "../../../db/schema";

const PLANS: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 99000, yearly: 990000 },
  pro: { monthly: 199000, yearly: 1990000 },
  business: { monthly: 399000, yearly: 3990000 },
};

function reference() {
  return `FCO-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const plan = PLANS[url.searchParams.get("plan") ?? ""] ? String(url.searchParams.get("plan")) : "pro";
    const db = getDb();
    const rows = await db.select().from(platformSettings);
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return Response.json({
      plan,
      checkoutReady: Boolean(settings[`${plan}_url`]),
      supportWhatsapp: settings.support_whatsapp || "",
    });
  } catch {
    return Response.json({ plan: "pro", checkoutReady: false, supportWhatsapp: "" });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const plan = String(body.plan ?? "");
    const interval = body.interval === "yearly" ? "yearly" : "monthly";
    const buyerName = String(body.buyerName ?? "").trim();
    const buyerEmail = String(body.buyerEmail ?? "").trim().toLowerCase();
    const buyerPhone = String(body.buyerPhone ?? "").replace(/[^0-9+]/g, "");
    if (!PLANS[plan]) return Response.json({ error: "Paket tidak tersedia" }, { status: 400 });
    if (!buyerName || !buyerEmail.includes("@") || buyerPhone.length < 8) return Response.json({ error: "Nama, email, dan WhatsApp yang valid wajib diisi" }, { status: 400 });

    const db = getDb();
    const setting = await db.query.platformSettings.findFirst({ where: eq(platformSettings.key, `${plan}_url`) });
    if (!setting?.value) return Response.json({ error: "Link checkout OrderHero untuk paket ini belum diaktifkan. Hubungi Famz Coffee OS." }, { status: 503 });
    let checkoutUrl: URL;
    try { checkoutUrl = new URL(setting.value); } catch { return Response.json({ error: "Link checkout belum valid" }, { status: 503 }); }
    if (checkoutUrl.protocol !== "https:") return Response.json({ error: "Link checkout tidak aman" }, { status: 503 });

    const checkoutReference = reference();
    await db.insert(subscriptionClaims).values({
      id: `clm_${crypto.randomUUID()}`,
      checkoutReference,
      buyerName,
      buyerEmail,
      buyerPhone,
      plan,
      interval,
      amount: PLANS[plan][interval],
    });

    return Response.json({ ok: true, checkoutReference, checkoutUrl: checkoutUrl.toString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout gagal disiapkan";
    return Response.json({ error: message.includes("no such table") ? "Sistem pembayaran sedang disiapkan. Coba lagi sebentar." : message }, { status: 500 });
  }
}
