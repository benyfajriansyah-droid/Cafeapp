"use client";

import { Check, Coffee, Lock } from "lucide-react";
import { useState } from "react";
import { Field, longDate, money, type AppData, type PlanId } from "./shared";

export function Onboarding({ data, saving, onComplete }: {
  data: AppData;
  saving: boolean;
  onComplete: (payload: Record<string, unknown>) => Promise<Record<string, unknown> | false>;
}) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    businessName: "", outletName: "Outlet Utama", phone: "",
    businessType: "coffee-home", address: "", taxPercent: "0",
  });
  const [withSampleData, setWithSampleData] = useState(true);
  const entries = Object.entries(data.plans) as Array<[PlanId, (typeof data.plans)[PlanId]]>;

  return (
    <main className="onboarding-shell">
      <div className="onboarding-brand"><span><Coffee size={22} /></span><b>Famz Coffee OS</b></div>
      <div className="onboarding-progress">
        <span className={step >= 1 ? "active" : ""}>1</span><i />
        <span className={step >= 2 ? "active" : ""}>2</span><i />
        <span className={step >= 3 ? "active" : ""}>3</span>
      </div>

      <section className="onboarding-card">
        {step === 1 && (
          <>
            <div className="onboarding-title">
              <span>LANGKAH 1 DARI 3</span>
              <h1>Kenalin usaha kopi lo.</h1>
              <p>Informasi ini dipakai untuk outlet, laporan, dan struk.</p>
            </div>
            <div className="form-grid">
              <Field label="Nama usaha">
                <input value={profile.businessName} onChange={(event) => setProfile({ ...profile, businessName: event.target.value })} placeholder="Contoh: Famz Coffee" autoFocus />
              </Field>
              <Field label="Nama outlet pertama">
                <input value={profile.outletName} onChange={(event) => setProfile({ ...profile, outletName: event.target.value })} />
              </Field>
              <Field label="Jenis usaha">
                <select value={profile.businessType} onChange={(event) => setProfile({ ...profile, businessType: event.target.value })}>
                  <option value="coffee-home">Kopi rumahan</option>
                  <option value="booth">Booth / gerobak</option>
                  <option value="coffee-shop">Kedai kopi</option>
                  <option value="multi-outlet">Multi-outlet</option>
                </select>
              </Field>
              <Field label="Nomor WhatsApp">
                <input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="08xxxxxxxxxx" />
              </Field>
              <Field label="Alamat outlet">
                <input value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} placeholder="Alamat singkat" />
              </Field>
              <Field label="Pajak layanan (%)" hint="Isi 0 kalau harga jual lo sudah termasuk pajak.">
                <input type="number" min="0" max="100" step="0.1" value={profile.taxPercent} onChange={(event) => setProfile({ ...profile, taxPercent: event.target.value })} />
              </Field>
            </div>
            <button
              type="button" className="onboarding-next"
              disabled={!profile.businessName.trim() || !profile.outletName.trim()}
              onClick={() => setStep(2)}
            >
              Lanjut <span aria-hidden="true">→</span>
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="onboarding-title">
              <span>LANGKAH 2 DARI 3</span>
              <h1>Mau mulai dari data contoh?</h1>
              <p>Semua paket bisa dicoba {data.entitlement.daysLeft ?? 14} hari. Belum perlu pembayaran.</p>
            </div>

            <div className="sample-choice">
              <button type="button" className={withSampleData ? "active" : ""} onClick={() => setWithSampleData(true)}>
                <b>Isi dengan data contoh</b>
                <p>Enam produk, bahan, resep, dan transaksi contoh supaya lo bisa langsung mencoba kasir dan laporan.</p>
                <small>Bisa dihapus sekaligus kapan pun lewat Pengaturan.</small>
                {withSampleData && <Check size={17} />}
              </button>
              <button type="button" className={!withSampleData ? "active" : ""} onClick={() => setWithSampleData(false)}>
                <b>Mulai kosong</b>
                <p>Langsung isi produk dan bahan usaha lo sendiri. Laporan bersih sejak transaksi pertama.</p>
                <small>Disarankan kalau lo langsung pakai untuk jualan.</small>
                {!withSampleData && <Check size={17} />}
              </button>
            </div>

            <div className="onboarding-plans-preview">
              {entries.map(([key, detail]) => (
                <div key={key}>
                  <span>{detail.name}</span>
                  <b>{money.format(detail.monthly)}<small>/bulan</small></b>
                  <p>{detail.branches} outlet · {detail.members} pengguna</p>
                </div>
              ))}
            </div>

            <div className="onboarding-buttons">
              <button type="button" onClick={() => setStep(1)}>Kembali</button>
              <button
                type="button" disabled={saving}
                onClick={async () => {
                  const result = await onComplete({
                    ...profile,
                    taxPercent: Number(profile.taxPercent),
                    withSampleData,
                  });
                  if (result) setStep(3);
                }}
              >
                {saving ? "Menyiapkan…" : "Siapkan workspace"}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="onboarding-done">
            <span><Check size={28} /></span>
            <h1>Workspace lo siap.</h1>
            <p>
              {withSampleData
                ? "Data contoh sudah masuk. Coba kasirnya dulu, lalu ganti produk dan resep dengan data usaha lo sendiri."
                : "Mulai dari menu Produk & Resep untuk memasukkan menu dan bahan usaha lo."}
            </p>
            <button type="button" onClick={() => window.location.reload()}>Masuk ke dashboard</button>
          </div>
        )}
      </section>

      <small className="onboarding-foot">Data usaha dipisahkan per akun dan hanya bisa diakses tim yang lo izinkan.</small>
    </main>
  );
}

/** Layar saat masa aktif langganan sudah habis. */
export function LockedScreen({ data, onManagePlan }: { data: AppData; onManagePlan: () => void }) {
  return (
    <main className="locked-shell">
      <section className="locked-card">
        <span><Lock size={26} /></span>
        <h1>Masa aktif langganan sudah berakhir.</h1>
        <p>
          {data.entitlement.expiresAt
            ? `Akses berhenti sejak ${longDate(data.entitlement.expiresAt)}.`
            : "Masa uji coba workspace ini sudah lewat."}
          {" "}Seluruh data usaha lo tetap tersimpan utuh dan langsung bisa dipakai lagi begitu paket diperpanjang.
        </p>
        <div className="locked-facts">
          <div><span>Bisnis</span><b>{data.workspace.name}</b></div>
          <div><span>Transaksi tersimpan</span><b>{data.summary.orderCount}</b></div>
          <div><span>Produk</span><b>{data.products.length}</b></div>
        </div>
        {data.currentMember.role === "owner" ? (
          <button type="button" onClick={onManagePlan}>Perpanjang paket</button>
        ) : (
          <p className="locked-note">Hubungi pemilik workspace untuk memperpanjang paket.</p>
        )}
      </section>
    </main>
  );
}
