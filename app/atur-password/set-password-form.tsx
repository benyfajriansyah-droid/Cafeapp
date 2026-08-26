"use client";

import { ArrowRight, Coffee, Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const mismatch = confirm.length > 0 && password !== confirm;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mismatch) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password", token, password }),
      });
      const result = (await response.json()) as { error?: string; redirect?: string };
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan kata sandi");
      window.location.href = result.redirect ?? "/app";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan kata sandi");
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <Link className="auth-brand" href="/">
          <Coffee size={20} />
          <b>Famz Coffee OS</b>
        </Link>
        <section className="auth-card">
          <div className="auth-done">
            <span>
              <ShieldAlert size={28} />
            </span>
            <h1>Tautannya tidak lengkap.</h1>
            <p>Buka tautan langsung dari email, atau minta tautan baru.</p>
            <Link href="/lupa-password">Minta tautan baru</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <Link className="auth-brand" href="/">
        <Coffee size={20} />
        <b>Famz Coffee OS</b>
      </Link>

      <section className="auth-card">
        <div className="auth-head">
          <h1>Buat kata sandi baru.</h1>
          <p>Setelah disimpan, semua perangkat lain otomatis dikeluarkan.</p>
        </div>

        <form onSubmit={submit}>
          <label>
            <span>Kata sandi baru</span>
            <div className="auth-input">
              <Lock size={16} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 10 karakter"
                autoComplete="new-password"
                minLength={10}
                required
                autoFocus
              />
              <button
                type="button"
                className="auth-reveal"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label>
            <span>Ulangi kata sandi</span>
            <div className="auth-input">
              <Lock size={16} />
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Ketik ulang"
                autoComplete="new-password"
                required
              />
            </div>
            {mismatch && <small className="auth-error-hint">Kedua kata sandi belum sama.</small>}
          </label>

          {error && <p className="checkout-error">{error}</p>}

          <button className="auth-submit" disabled={saving || mismatch}>
            {saving ? "Menyimpan…" : "Simpan kata sandi"}
            <ArrowRight size={16} />
          </button>
        </form>
      </section>
    </main>
  );
}
