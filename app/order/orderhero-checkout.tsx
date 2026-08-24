"use client";

import { ArrowLeft, ArrowRight, Check, Coffee, CreditCard, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const plans = {
  starter: { name: "Starter", monthly: 99000, yearly: 990000, features: ["1 outlet", "2 pengguna", "Kasir, stok, HPP & laporan"] },
  pro: { name: "Pro", monthly: 199000, yearly: 1990000, features: ["3 outlet", "10 pengguna", "Hak akses & laporan cabang"] },
  business: { name: "Business", monthly: 399000, yearly: 3990000, features: ["Multi-outlet", "Pengguna tanpa batas", "Prioritas bantuan"] },
} as const;

type PlanKey = keyof typeof plans;
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function OrderHeroCheckout() {
  const [plan, setPlan] = useState<PlanKey>("pro");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [ready, setReady] = useState<boolean | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selected = plans[plan];

  useEffect(() => {
    const selectedPlan = new URLSearchParams(window.location.search).get("plan");
    const timer = window.setTimeout(() => {
      if (selectedPlan && selectedPlan in plans) setPlan(selectedPlan as PlanKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/orderhero?plan=${plan}`, { cache: "no-store" }).then((response) => response.json() as Promise<{ checkoutReady?: boolean; supportWhatsapp?: string }>).then((result) => {
      if (active) { setReady(Boolean(result.checkoutReady)); setSupportWhatsapp(result.supportWhatsapp ?? ""); }
    }).catch(() => active && setReady(false));
    return () => { active = false; };
  }, [plan]);

  const total = useMemo(() => selected[interval], [selected, interval]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/orderhero", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, plan, interval }) });
      const result = await response.json() as { error?: string; checkoutUrl?: string; checkoutReference?: string };
      if (!response.ok || !result.checkoutUrl || !result.checkoutReference) throw new Error(result.error || "Checkout gagal disiapkan");
      window.sessionStorage.setItem("famz-checkout-reference", result.checkoutReference);
      window.location.href = result.checkoutUrl;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Checkout gagal disiapkan"); }
    finally { setSaving(false); }
  }

  const whatsappLink = supportWhatsapp ? `https://wa.me/${supportWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Halo Famz Coffee OS, saya mau beli paket ${selected.name}.`)}` : "";

  return <main className="checkout-shell">
    <nav className="checkout-nav"><Link href="/"><Coffee size={19}/><b>Famz Coffee OS</b></Link><Link href="/"><ArrowLeft size={14}/> Kembali</Link></nav>
    <section className="checkout-wrap">
      <div className="checkout-copy"><span>CHECKOUT AMAN VIA ORDERHERO</span><h1>Pilih paket, bayar, lalu aktifkan.</h1><p>QRIS, Virtual Account, e-wallet, dan metode pembayaran lain diproses oleh OrderHero. Famz Coffee OS tidak menyimpan data kartu atau rekening lo.</p><div className="checkout-trust"><div><CreditCard/><span><b>Pembayaran otomatis</b><small>Diproses di halaman OrderHero</small></span></div><div><ShieldCheck/><span><b>Aktivasi terkontrol</b><small>Masukkan invoice setelah bayar</small></span></div></div></div>
      <form className="checkout-card" onSubmit={submit}>
        <div className="checkout-plan-tabs">{(Object.keys(plans) as PlanKey[]).map((key)=><button type="button" key={key} className={plan===key?"active":""} onClick={()=>{setReady(null);setPlan(key);}}>{plans[key].name}</button>)}</div>
        <div className="checkout-price"><span>{selected.name}</span><b>{money.format(total)}<small>/{interval === "monthly" ? "bulan" : "tahun"}</small></b></div>
        <div className="checkout-interval"><button type="button" className={interval==="monthly"?"active":""} onClick={()=>setInterval("monthly")}>Bulanan</button><button type="button" className={interval==="yearly"?"active":""} onClick={()=>setInterval("yearly")}>Tahunan · hemat 2 bulan</button></div>
        <ul>{selected.features.map((feature)=><li key={feature}><Check size={15}/>{feature}</li>)}</ul>
        <label><span>Nama lengkap</span><input name="buyerName" required placeholder="Nama pembeli"/></label>
        <label><span>Email untuk akun</span><input name="buyerEmail" type="email" required placeholder="nama@email.com"/></label>
        <label><span>Nomor WhatsApp</span><input name="buyerPhone" required inputMode="tel" placeholder="08xxxxxxxxxx"/></label>
        {error && <p className="checkout-error">{error}</p>}
        <button className="checkout-pay" disabled={saving || ready !== true}>{saving ? "Menyiapkan checkout…" : ready === null ? "Memeriksa checkout…" : ready ? <>{`Bayar ${money.format(total)}`} <ArrowRight size={16}/></> : "Checkout belum diaktifkan"}</button>
        {ready === false && whatsappLink && <a className="checkout-support" href={whatsappLink}>Hubungi via WhatsApp</a>}
        <small className="checkout-legal">Dengan melanjutkan, lo setuju data kontak dipakai untuk proses aktivasi dan dukungan langganan.</small>
      </form>
    </section>
  </main>;
}
