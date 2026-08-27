import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { platformSettings, subscriptionClaims } from "../../../db/schema";
import { isPlanId, normalizeInterval, planPrice } from "../../lib/plans";
import { createCheckoutReference } from "../../lib/reference";
import { safeErrorMessage } from "../../lib/platform";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requested = url.searchParams.get("plan") ?? "";
    const plan = isPlanId(requested) ? requested : "pro";

    const db = getDb();
    const rows = await db.select().from(platformSettings);
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));

    return Response.json({
      plan,
      checkoutReady: Boolean(settings[`${plan}_url`]),
      supportWhatsapp: settings.support_whatsapp || "",
    });
  } catch (error) {
    safeErrorMessage(error, "GET /api/orderhero");
    return Response.json({ plan: "pro", checkoutReady: false, supportWhatsapp: "" });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const plan = String(body.plan ?? "");
    const interval = normalizeInterval(body.interval);
    const buyerName = String(body.buyerName ?? "").trim();
    const buyerEmail = String(body.buyerEmail ?? "").trim().toLowerCase();
    const buyerPhone = String(body.buyerPhone ?? "").replace(/[^0-9+]/g, "");

    if (!isPlanId(plan)) return Response.json({ error: "Paket tidak tersedia" }, { status: 400 });
    if (!buyerName || !buyerEmail.includes("@") || buyerPhone.length < 8) {
      return Response.json({ error: "Nama, email, dan nomor WhatsApp yang valid wajib diisi" }, { status: 400 });
    }

    const db = getDb();
    const setting = await db.query.platformSettings.findFirst({ where: eq(platformSettings.key, `${plan}_url`) });
    if (!setting?.value) {
      return Response.json({ error: "Checkout untuk paket ini belum diaktifkan. Hubungi Famz Coffee OS." }, { status: 503 });
    }

    let checkoutUrl: URL;
    try {
      checkoutUrl = new URL(setting.value);
    } catch {
      return Response.json({ error: "Link checkout belum valid" }, { status: 503 });
    }
    if (checkoutUrl.protocol !== "https:") return Response.json({ error: "Link checkout tidak aman" }, { status: 503 });

    // Kode checkout dibuat acak penuh. Kode yang bisa ditebak berarti pembayaran orang lain
    // bisa diklaim — kepemilikannya juga diperiksa lagi lewat email saat aktivasi.
    const checkoutReference = createCheckoutReference();
    await db.insert(subscriptionClaims).values({
      id: `clm_${crypto.randomUUID()}`,
      checkoutReference, buyerName, buyerEmail, buyerPhone,
      plan, interval, amount: planPrice(plan, interval),
    });

    return Response.json({ ok: true, checkoutReference, checkoutUrl: checkoutUrl.toString() });
  } catch (error) {
    return Response.json({ error: safeErrorMessage(error, "POST /api/orderhero") }, { status: 500 });
  }
}
