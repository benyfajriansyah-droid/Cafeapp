"use client";

import { CreditCard, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Empty, Field, Modal, SummaryStrip, dateTime, money, type ModuleProps, type SubscriptionClaim } from "./shared";

const statusLabels: Record<string, string> = {
  checkout_started: "Checkout dimulai",
  payment_review: "Menunggu verifikasi",
  paid: "Disetujui",
  activated: "Aktif",
  rejected: "Ditolak",
};

export default function SaasAdmin({ data, saving, submit }: ModuleProps) {
  const [reviewing, setReviewing] = useState<{ claim: SubscriptionClaim; decision: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");

  const claims = data.subscriptionClaims;
  const pending = claims.filter((claim) => claim.status === "payment_review");
  const activated = claims.filter((claim) => claim.status === "activated");
  const revenue = activated.reduce((sum, claim) => sum + claim.amount, 0);

  return (
    <section className="saas-sales-layout">
      <article className="data-panel">
        <div className="panel-header">
          <div><h2>Link checkout OrderHero</h2><p>Tempel link form order tiap paket. Landing page langsung memakainya.</p></div>
        </div>
        <form onSubmit={(event) => {
          event.preventDefault();
          void submit("update-orderhero-settings", Object.fromEntries(new FormData(event.currentTarget)));
        }}>
          <div className="settings-fields">
            <Field label="Starter"><input name="starter_url" type="url" defaultValue={data.platformSettings.starter_url} placeholder="https://..." /></Field>
            <Field label="Pro"><input name="pro_url" type="url" defaultValue={data.platformSettings.pro_url} placeholder="https://..." /></Field>
            <Field label="Business"><input name="business_url" type="url" defaultValue={data.platformSettings.business_url} placeholder="https://..." /></Field>
            <Field label="WhatsApp bantuan"><input name="support_whatsapp" defaultValue={data.platformSettings.support_whatsapp} placeholder="628xxxxxxxxxx" /></Field>
          </div>
          <button className="settings-save" disabled={saving}>{saving ? "Menyimpan…" : "Simpan integrasi"}</button>
        </form>
        <div className="integration-note">
          <ShieldCheck size={16} />
          <p>Pembayaran tetap diproses dan diverifikasi di OrderHero. Panel ini hanya menghubungkan invoice ke workspace pelanggan.</p>
        </div>
      </article>

      <article className="data-panel billing-history">
        <div className="panel-header">
          <div><h2>Antrean aktivasi</h2><p>Setujui hanya setelah invoice terlihat lunas di dashboard OrderHero.</p></div>
          <span className="paid-badge">{pending.length} perlu dicek</span>
        </div>

        <SummaryStrip items={[
          { label: "Total pengajuan", value: String(claims.length) },
          { label: "Aktif", value: String(activated.length) },
          { label: "Nilai langganan aktif", value: money.format(revenue) },
        ]} />

        {!claims.length ? (
          <Empty icon={CreditCard} title="Belum ada pembelian" text="Order yang dimulai dari landing page akan tampil di sini." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Referensi</th><th>Pembeli</th><th>Paket</th><th>Invoice OrderHero</th><th>Status</th><th className="right">Aksi</th></tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td><b>{claim.checkoutReference}</b><small className="table-sub">{dateTime(claim.createdAt)}</small></td>
                    <td><b>{claim.buyerName}</b><small className="table-sub">{claim.buyerEmail} · {claim.buyerPhone}</small></td>
                    <td className="capitalize">
                      {claim.plan} · {claim.interval === "yearly" ? "Tahunan" : "Bulanan"}
                      <small className="table-sub">{money.format(claim.amount)}</small>
                    </td>
                    <td>{claim.orderHeroInvoice || "Belum dikirim"}</td>
                    <td>
                      <span className={claim.status === "activated" || claim.status === "paid" ? "stock-chip" : "stock-chip low"}>
                        {statusLabels[claim.status] ?? claim.status}
                      </span>
                    </td>
                    <td className="right">
                      {claim.status === "payment_review" ? (
                        <div className="review-actions">
                          <button type="button" onClick={() => { setReviewing({ claim, decision: "reject" }); setNote(""); }}>Tolak</button>
                          <button type="button" onClick={() => { setReviewing({ claim, decision: "approve" }); setNote(""); }}>Setujui</button>
                        </div>
                      ) : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {reviewing && (
        <Modal
          title={reviewing.decision === "approve" ? "Setujui pembayaran" : "Tolak pengajuan"}
          description={reviewing.decision === "approve"
            ? "Paket langsung aktif di workspace pembeli setelah disetujui."
            : "Pembeli bisa mengajukan ulang dengan invoice yang benar."}
          onClose={() => setReviewing(null)}
        >
          <form onSubmit={async (event) => {
            event.preventDefault();
            const result = await submit("review-orderhero", {
              claimId: reviewing.claim.id, decision: reviewing.decision, note,
            });
            if (result) setReviewing(null);
          }}>
            <div className="void-summary">
              <div><span>Pembeli</span><b>{reviewing.claim.buyerEmail}</b></div>
              <div><span>Paket</span><b className="capitalize">{reviewing.claim.plan} · {money.format(reviewing.claim.amount)}</b></div>
              <div><span>Invoice</span><b>{reviewing.claim.orderHeroInvoice || "–"}</b></div>
            </div>
            <Field label="Catatan verifikasi" hint="Tersimpan sebagai jejak siapa yang menyetujui dan kenapa.">
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Contoh: cocok dengan invoice OH-1024" />
            </Field>
            <button className={reviewing.decision === "approve" ? "submit-button" : "submit-button danger"} disabled={saving}>
              {saving ? "Memproses…" : reviewing.decision === "approve" ? "Setujui & aktifkan" : "Tolak pengajuan"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
