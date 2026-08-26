"use client";

import { ArrowRight, Coffee, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Mode = "login" | "register";

export default function AuthForm({
  mode,
  lanjut,
  invitation,
}: {
  mode: Mode;
  lanjut: string;
  invitation?: { token: string; email: string; workspaceName: string; role: string } | null;
}) {
  const [email, setEmail] = useState(invitation?.email ?? "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isRegister ? "register" : "login",
          email,
          password,
          lanjut,
          ...(isRegister ? { name, invitationToken: invitation?.token ?? "" } : {}),
        }),
      });
      const result = (await response.json()) as { error?: string; redirect?: string };
      if (!response.ok) throw new Error(result.error || "Gagal memproses permintaan");
      window.location.href = result.redirect ?? "/app";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memproses permintaan");
      setSaving(false);
    }
  }

  const otherHref = isRegister
    ? `/masuk?lanjut=${encodeURIComponent(lanjut)}`
    : `/daftar?lanjut=${encodeURIComponent(lanjut)}`;

  return (
    <main className="auth-shell">
      <Link className="auth-brand" href="/">
        <Coffee size={20} />
        <b>Famz Coffee OS</b>
      </Link>

      <section className="auth-card">
        <div className="auth-head">
          <h1>{isRegister ? "Buat akun." : "Masuk ke workspace lo."}</h1>
          <p>
            {isRegister
              ? "Satu akun untuk semua outlet dan tim usaha lo."
              : "Kasir, stok, dan laporan usaha kopi dalam satu tempat."}
          </p>
        </div>

        {invitation && (
          <div className="auth-invitation">
            <ShieldCheck size={17} />
            <p>
              <b>{invitation.workspaceName}</b> mengundang lo sebagai{" "}
              <b className="capitalize">{roleLabel(invitation.role)}</b>. Daftar memakai{" "}
              <b>{invitation.email}</b> untuk menerima undangannya.
            </p>
          </div>
        )}

        <form onSubmit={submit}>
          {isRegister && (
            <label>
              <span>Nama</span>
              <div className="auth-input">
                <User size={16} />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama lo"
                  autoComplete="name"
                  required
                />
              </div>
            </label>
          )}

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
                readOnly={Boolean(invitation)}
                required
              />
            </div>
          </label>

          <label>
            <span>Kata sandi</span>
            <div className="auth-input">
              <Lock size={16} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isRegister ? "Minimal 10 karakter" : "Kata sandi"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 10 : undefined}
                required
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
            {isRegister && <small className="auth-hint">Pakai kalimat pendek yang gampang lo ingat.</small>}
          </label>

          {error && <p className="checkout-error">{error}</p>}

          <button className="auth-submit" disabled={saving}>
            {saving ? "Memproses…" : isRegister ? "Buat akun" : "Masuk"}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-foot">
          {!isRegister && <Link href="/lupa-password">Lupa kata sandi?</Link>}
          <p>
            {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <Link href={otherHref}>{isRegister ? "Masuk" : "Daftar gratis"}</Link>
          </p>
        </div>
      </section>

      <small className="auth-legal">
        Kami tidak pernah meminta PIN, OTP, atau nomor kartu lewat chat maupun email.
      </small>
    </main>
  );
}

function roleLabel(role: string): string {
  if (role === "manager") return "manager";
  if (role === "inventory") return "gudang";
  if (role === "owner") return "owner";
  return "kasir";
}
