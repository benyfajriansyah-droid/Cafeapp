"use client";

import { ArrowLeft, ArrowRight, Coffee, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ message: string; mailConfigured: boolean } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-reset", email }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        mailConfigured?: boolean;
      };
      if (!response.ok) throw new Error(result.error || "Gagal mengirim permintaan");
      setSent({
        message: result.message ?? "Permintaan terkirim.",
        mailConfigured: Boolean(result.mailConfigured),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal mengirim permintaan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-shell">
      <Link className="auth-brand" href="/">
        <Coffee size={20} />
        <b>Famz Coffee OS</b>
      </Link>

      <section className="auth-card">
        {sent ? (
          <div className="auth-done">
            <span>
              <MailCheck size={28} />
            </span>
            <h1>Cek email lo.</h1>
            <p>{sent.message}</p>
            {!sent.mailConfigured && (
              <p className="auth-warning">
                Pengiriman email belum diaktifkan di server ini, jadi tautannya belum sampai ke
                inbox. Hubungi admin untuk mengatur ulang kata sandi.
              </p>
            )}
            <Link href="/masuk">
              <ArrowLeft size={15} /> Kembali ke halaman masuk
            </Link>
          </div>
        ) : (
          <>
            <div className="auth-head">
              <h1>Lupa kata sandi?</h1>
              <p>Masukkan email akun lo. Kami kirim tautan untuk membuat kata sandi baru.</p>
            </div>

            <form onSubmit={submit}>
              <label>
                <span>Email</span>
                <div className="auth-input">
                  <Mail size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nama@email.com"
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </div>
              </label>

              {error && <p className="checkout-error">{error}</p>}

              <button className="auth-submit" disabled={saving}>
                {saving ? "Mengirim…" : "Kirim tautan"}
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="auth-foot">
              <p>
                Ingat kata sandinya? <Link href="/masuk">Masuk</Link>
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
