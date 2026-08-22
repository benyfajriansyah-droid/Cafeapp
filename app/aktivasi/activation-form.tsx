"use client";

import { ArrowRight, BadgeCheck, Coffee, FileCheck2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ActivationForm({ email }: { email: string }) {
  const [reference, setReference] = useState("");
  const [invoice, setInvoice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const urlRef = new URLSearchParams(window.location.search).get("ref");
    const timer = window.setTimeout(() => setReference(urlRef || window.sessionStorage.getItem("famz-checkout-reference") || ""), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/app", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "claim-orderhero", checkoutReference: reference, orderHeroInvoice: invoice }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Aktivasi gagal diajukan");
      setDone(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Aktivasi gagal diajukan"); }
    finally { setSaving(false); }
  }

  return <main className="activation-shell"><Link className="activation-brand" href="/"><Coffee size={20}/><b>Famz Coffee OS</b></Link><section className="activation-card">
    {done ? <div className="activation-done"><span><BadgeCheck size={30}/></span><h1>Pengajuan sudah masuk.</h1><p>Tim Famz akan mencocokkan invoice OrderHero. Setelah disetujui, paket langsung aktif di workspace <b>{email}</b>.</p><Link href="/app">Buka dashboard <ArrowRight size={15}/></Link></div> : <>
      <div className="activation-head"><span><FileCheck2 size={24}/></span><p>AKTIVASI ORDERHERO</p><h1>Hubungkan pembayaran ke akun.</h1><small>Masuk sebagai <b>{email}</b>. Pakai akun owner yang akan menerima langganan.</small></div>
      <form onSubmit={submit}><label><span>Kode checkout Famz</span><input value={reference} onChange={(event)=>setReference(event.target.value.toUpperCase())} required placeholder="FCO-XXXX-XXXX"/></label><label><span>Nomor invoice OrderHero</span><input value={invoice} onChange={(event)=>setInvoice(event.target.value)} required placeholder="Salin dari email/halaman pembayaran"/></label>{error&&<p className="checkout-error">{error}</p>}<button disabled={saving}>{saving?"Mengirim…":"Ajukan aktivasi"}<ArrowRight size={15}/></button></form>
      <div className="activation-safe"><ShieldCheck size={16}/><p>Jangan kirim PIN, OTP, nomor kartu, atau password. Kami hanya perlu kode checkout dan nomor invoice.</p></div>
    </>}
  </section></main>;
}
